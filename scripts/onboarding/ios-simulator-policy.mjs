import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes } from 'node:crypto'

function version (value) {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+){0,2}$/.test(value)) return null
  const parts = value.split('.').map(Number)
  return [parts[0], parts[1] || 0, parts[2] || 0]
}
function compare (left, right) {
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i]
  return 0
}
function bound (type, field) {
  const text = type[field + 'String']
  if (text !== undefined) return version(text)
  const number = type[field]
  if (!Number.isInteger(number) || number < 0) return null
  return [Math.floor(number / 65536), Math.floor(number / 256) % 256, number % 256]
}
function compatibleTypes (runtime, types) {
  const release = version(runtime.version)
  return types.filter(type => {
    if (type.isAvailable === false || (type.productFamily ? type.productFamily !== 'iPhone' : !type.name?.startsWith('iPhone')) || !type.identifier) return false
    const min = bound(type, 'minRuntimeVersion'); const max = bound(type, 'maxRuntimeVersion')
    const declared = Array.isArray(runtime.supportedDeviceTypes)
    if (declared && !runtime.supportedDeviceTypes.some(item => item.identifier === type.identifier)) return false
    // Older simctl versions can lack the runtime whitelist: require type bounds then.
    if (!declared && !min && !max) return false
    if ((type.minRuntimeVersionString !== undefined || type.minRuntimeVersion !== undefined) && !min) return false
    if ((type.maxRuntimeVersionString !== undefined || type.maxRuntimeVersion !== undefined) && !max) return false
    return (!min || compare(release, min) >= 0) && (!max || compare(release, max) <= 0)
  })
}

export function selectSimulatorPolicy ({ runtimes, deviceTypes, requestedRuntime, architecture = process.arch }) {
  const arch = architecture === 'x64' ? 'x86_64' : architecture
  const available = runtimes.filter(item => item.isAvailable === true && /^com\.apple\.CoreSimulator\.SimRuntime\.iOS-/.test(item.identifier || '') && version(item.version) && (!Array.isArray(item.supportedArchitectures) || item.supportedArchitectures.includes(arch)))
  let candidates = available
  if (requestedRuntime !== undefined) {
    const requestedVersion = version(requestedRuntime)
    candidates = available.filter(item => item.identifier === requestedRuntime || (requestedVersion && compare(version(item.version), requestedVersion) === 0))
    if (candidates.length !== 1) throw new Error('Requested iOS runtime is unavailable or ambiguous in the selected Xcode; use an installed runtime identifier or exact version.')
  }
  candidates = candidates.map(runtime => ({ runtime, types: compatibleTypes(runtime, deviceTypes) })).filter(item => item.types.length)
  candidates.sort((a, b) => compare(version(b.runtime.version), version(a.runtime.version)) || a.runtime.identifier.localeCompare(b.runtime.identifier))
  if (!candidates.length) throw new Error(requestedRuntime === undefined ? 'No available iOS runtime has a compatible installed iPhone device type for the selected Xcode and host architecture.' : 'Requested iOS runtime has no compatible installed iPhone device type; no fallback was selected.')
  const selected = candidates[0]
  const types = [...selected.types].sort((a, b) => a.identifier.localeCompare(b.identifier))
  return { runtime: selected.runtime, compatibleDeviceTypes: types, deviceType: types.find(type => type.name === 'iPhone 17 Pro') || types[0] }
}

// Only CLI discovery/create is injected. Ownership/history use the real filesystem.
// No shutdown, erase, delete, restart or download belongs to this selection policy.
export async function prepareOwnedSimulator ({ state, root, name, requestedRuntime, run, warn = console.warn, architecture = process.arch }) {
  const simctlPath = (await run('xcrun', ['--find', 'simctl'])).trim()
  if (!path.isAbsolute(simctlPath) || !simctlPath.endsWith('/usr/bin/simctl')) throw new Error('Cannot identify the selected Xcode simctl executable.')
  const developerDir = path.dirname(path.dirname(path.dirname(simctlPath)))
  const runtimes = JSON.parse(await run('xcrun', ['simctl', 'list', 'runtimes', '--json'])).runtimes
  const deviceTypes = JSON.parse(await run('xcrun', ['simctl', 'list', 'devicetypes', '--json'])).devicetypes
  const policy = selectSimulatorPolicy({ runtimes, deviceTypes, requestedRuntime, architecture })
  const devices = JSON.parse(await run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])).devices
  const filename = path.join(state, 'simulator.json')
  let oldBytes; let owned
  try { oldBytes = await fs.readFile(filename); owned = JSON.parse(oldBytes.toString('utf8')) } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Existing simulator ownership record is invalid; it has been preserved.')
  }
  const compatible = new Set(policy.compatibleDeviceTypes.map(type => type.identifier))
  const selected = owned?.root === root && owned?.name === name && (!owned.runtime || owned.runtime === policy.runtime.identifier)
    ? (devices[policy.runtime.identifier] || []).find(device => device.udid === owned.udid && device.name === name && device.isAvailable === true && compatible.has(device.deviceTypeIdentifier))
    : null
  await fs.mkdir(state, { recursive: true, mode: 0o700 })
  if (oldBytes) {
    const history = path.join(state, 'simulator-history')
    await fs.mkdir(history, { recursive: true, mode: 0o700 })
    const archive = path.join(history, createHash('sha256').update(oldBytes).digest('hex') + '.json')
    try { await fs.writeFile(archive, oldBytes, { mode: 0o600, flag: 'wx' }) } catch (error) { if (error.code !== 'EEXIST') throw error }
    if (!selected) warn(`Previous simulator ${owned?.udid || '(unknown)'} and its ownership record are preserved in simulator-history; selecting ${policy.runtime.name || policy.runtime.version}.`)
  }
  const device = selected || { udid: (await run('xcrun', ['simctl', 'create', name, policy.deviceType.identifier, policy.runtime.identifier])).trim(), state: 'Shutdown', deviceTypeIdentifier: policy.deviceType.identifier }
  if (!device.udid || /\s/.test(device.udid)) throw new Error('Simulator creation returned an invalid identifier; previous ownership is preserved.')
  const record = { udid: device.udid, name, root, runtime: policy.runtime.identifier, runtimeVersion: policy.runtime.version, deviceTypeIdentifier: device.deviceTypeIdentifier, developerDir, simctlPath }
  const temporary = filename + '.' + randomBytes(8).toString('hex') + '.tmp'
  try {
    await fs.writeFile(temporary, JSON.stringify(record, null, 2) + '\n', { mode: 0o600, flag: 'wx' })
    await fs.rename(temporary, filename)
  } finally { await fs.unlink(temporary).catch(() => {}) }
  return { device, ...record, reused: Boolean(selected) }
}
