import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { selectSimulatorPolicy, prepareOwnedSimulator } from './ios-simulator-policy.mjs'

const type = { identifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro', name: 'iPhone 17 Pro', productFamily: 'iPhone', minRuntimeVersion: 1703936, minRuntimeVersionString: '26.0.0', maxRuntimeVersion: 4294967295, maxRuntimeVersionString: '65535.255.255' }
const runtime = (version, change = {}) => ({ identifier: 'com.apple.CoreSimulator.SimRuntime.iOS-' + version.replaceAll('.', '-'), version, name: 'iOS ' + version, platform: 'iOS', isAvailable: true, supportedArchitectures: ['arm64'], supportedDeviceTypes: [{ identifier: type.identifier, name: type.name, productFamily: type.productFamily }], ...change })
const r26 = runtime('26.0'); const r27 = runtime('27.0')
const select = (runtimes, extra = {}) => selectSimulatorPolicy({ runtimes, deviceTypes: [type], architecture: 'arm64', ...extra })
test('newest compatible runtime wins numerically, independent of listing order', () => {
  assert.equal(select([r26, r27]).runtime.identifier, 'com.apple.CoreSimulator.SimRuntime.iOS-27-0')
  const old = { ...type, minRuntimeVersionString: '9.0', minRuntimeVersion: 589824 }
  assert.equal(select([runtime('9.0'), runtime('10.0')], { deviceTypes: [old] }).runtime.version, '10.0')
  assert.equal(select([runtime('27.2'), runtime('27.10')]).runtime.version, '27.10')
})
test('unavailable, foreign platform and unsupported architecture cannot win', () => {
  assert.equal(select([r26, runtime('28.0', { isAvailable: false }), runtime('29.0', { identifier: 'com.apple.CoreSimulator.SimRuntime.tvOS-29-0' }), runtime('30.0', { supportedArchitectures: ['x86_64'] })]).runtime.version, '26.0')
})
test('runtime/device whitelist and numeric bounds prevent incompatible types', () => {
  const future = { ...type, identifier: 'future', name: 'iPhone 18 Pro', minRuntimeVersionString: '27.0.0' }
  assert.equal(select([r26, r27], { deviceTypes: [future, type] }).deviceType.identifier, type.identifier)
  assert.equal(select([r26, runtime('28.0', { supportedDeviceTypes: [] })]).runtime.version, '26.0')
  const bounded = { ...type, maxRuntimeVersionString: '26.255.255' }
  assert.equal(select([r26, r27], { deviceTypes: [bounded] }).runtime.version, '26.0')
  assert.throws(() => select([r27], { deviceTypes: [{ ...type, productFamily: 'iPad' }] }), /compatible/)
  const numericOnly = { ...type, minRuntimeVersionString: undefined, maxRuntimeVersionString: undefined, maxRuntimeVersion: 1769471 }
  assert.equal(select([r26, r27], { deviceTypes: [numericOnly] }).runtime.version, '26.0')
  assert.equal(select([{ ...r27, supportedDeviceTypes: undefined }]).runtime.version, '27.0')
  assert.throws(() => select([{ ...r27, supportedDeviceTypes: undefined }], { deviceTypes: [{ identifier: type.identifier, name: type.name, productFamily: 'iPhone' }] }), /compatible/)
})
test('explicit installed older version or identifier is honored without invalid fallback', () => {
  assert.equal(select([r26, r27], { requestedRuntime: '26.0' }).runtime.version, '26.0')
  assert.equal(select([r26, r27], { requestedRuntime: r26.identifier }).runtime.version, '26.0')
  for (const requestedRuntime of ['99.0', 'invalid', r27.identifier]) {
    const runtimes = requestedRuntime === r27.identifier ? [r26, { ...r27, supportedDeviceTypes: [] }] : [r26, r27]
    assert.throws(() => select(runtimes, { requestedRuntime }), /Requested/)
  }
})
async function fixture (t, owned, devices) {
  const state = await fs.mkdtemp(path.join(os.tmpdir(), 'simulator-policy-')); t.after(() => fs.rm(state, { recursive: true, force: true }))
  const root = '/fixture/business'; const name = 'Ordering business-app Local fixture'; const calls = []; const warnings = []
  const original = owned === undefined ? undefined : JSON.stringify({ root, name, ...owned }, null, 4) + '\n'
  if (original) await fs.writeFile(path.join(state, 'simulator.json'), original)
  const run = async (command, args) => {
    calls.push([command, ...args])
    assert.equal(command, 'xcrun')
    if (args[0] === '--find') return '/Applications/Xcode.app/Contents/Developer/usr/bin/simctl\n'
    if (args[1] === 'list' && args[2] === 'runtimes') return JSON.stringify({ runtimes: [r26, r27] })
    if (args[1] === 'list' && args[2] === 'devicetypes') return JSON.stringify({ devicetypes: [type] })
    if (args[1] === 'list' && args[2] === 'devices') return JSON.stringify({ devices })
    if (args[1] === 'create') return 'new-ios27\n'
    throw new Error('Unexpected simulator mutation')
  }
  return { state, root, name, run, calls, warnings, original, warn: value => warnings.push(value), architecture: 'arm64' }
}
test('old owned runtime is preserved while a new owned device uses selected iOS27', async t => {
  const f = await fixture(t, { udid: 'old-ios26', custom: 'preserve exact history' }, { [r26.identifier]: [{ udid: 'old-ios26', name: 'Ordering business-app Local fixture', isAvailable: true, deviceTypeIdentifier: type.identifier }], [r27.identifier]: [] })
  const result = await prepareOwnedSimulator(f)
  assert.equal(result.runtime, r27.identifier); assert.equal(result.udid, 'new-ios27'); assert.equal(result.reused, false)
  assert.equal(f.calls.filter(call => call[2] === 'create').length, 1)
  assert.deepEqual(f.calls.at(-1), ['xcrun', 'simctl', 'create', f.name, type.identifier, r27.identifier])
  assert.equal(f.warnings.length, 1)
  const archives = await fs.readdir(path.join(f.state, 'simulator-history'))
  assert.equal(await fs.readFile(path.join(f.state, 'simulator-history', archives[0]), 'utf8'), f.original)
  assert.equal(JSON.parse(await fs.readFile(path.join(f.state, 'simulator.json'), 'utf8')).runtime, r27.identifier)
  assert.equal(f.calls.some(call => ['delete', 'erase', 'shutdown', 'boot', 'download'].includes(call[2])), false)
})
test('matching selected-runtime device is reused only after root/name/availability/type ownership matches', async t => {
  const device = { udid: 'owned-ios27', name: 'Ordering business-app Local fixture', isAvailable: true, deviceTypeIdentifier: type.identifier, state: 'Booted' }
  const f = await fixture(t, { udid: device.udid }, { [r27.identifier]: [device] })
  const result = await prepareOwnedSimulator(f)
  assert.equal(result.reused, true); assert.equal(result.device.state, 'Booted')
  assert.equal(f.calls.some(call => call[2] === 'create'), false)
  for (const [owned, changedDevice] of [[{ root: '/another', udid: device.udid }, device], [{ udid: device.udid }, { ...device, name: 'Unowned' }], [{ udid: device.udid }, { ...device, isAvailable: false }], [{ udid: device.udid }, { ...device, deviceTypeIdentifier: 'incompatible' }]]) {
    const other = await fixture(t, owned, { [r27.identifier]: [changedDevice] })
    assert.equal((await prepareOwnedSimulator(other)).reused, false)
  }
})
test('explicit old runtime can reuse its owned device and invalid runtime preserves ownership without create', async t => {
  const device = { udid: 'old-ios26', name: 'Ordering business-app Local fixture', isAvailable: true, deviceTypeIdentifier: type.identifier }
  const f = await fixture(t, { udid: device.udid }, { [r26.identifier]: [device] })
  assert.equal((await prepareOwnedSimulator({ ...f, requestedRuntime: '26.0' })).reused, true)
  const previous = await fs.readFile(path.join(f.state, 'simulator.json'), 'utf8')
  await assert.rejects(prepareOwnedSimulator({ ...f, requestedRuntime: '99.0' }), /Requested/)
  assert.equal(await fs.readFile(path.join(f.state, 'simulator.json'), 'utf8'), previous)
  assert.equal(f.calls.some(call => call[2] === 'create'), false)
})
test('invalid ownership JSON is preserved and cannot cause unrecorded simulator creation', async t => {
  const f = await fixture(t, undefined, { [r27.identifier]: [] })
  const filename = path.join(f.state, 'simulator.json')
  await fs.writeFile(filename, '{invalid existing ownership')
  await assert.rejects(prepareOwnedSimulator(f), /ownership record is invalid/)
  assert.equal(await fs.readFile(filename, 'utf8'), '{invalid existing ownership')
  assert.equal(f.calls.some(call => call[2] === 'create'), false)
})
