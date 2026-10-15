import { promises as fs, openSync, closeSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { createHash } from 'node:crypto'
import { configure, doctor, validateManifest } from './core.mjs'
import { prepareOwnedSimulator } from './ios-simulator-policy.mjs'

const directory = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(directory, '../..')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
export function parseLocalOptions (args) {
  const allowed = new Set(['without-firebase', 'project', 'api-url', 'api-version', 'language', 'franchise-slug', 'derived-data', 'port', 'prepare-only', 'confirm-project-change', 'runtime'])
  const options = {}
  for (let i = 0; i < args.length; i++) {
    const flag = args[i].startsWith('--') ? args[i].slice(2) : ''
    if (!allowed.has(flag) || Object.hasOwn(options, flag)) throw new Error('Unsupported local simulator argument')
    if (flag === 'without-firebase' || flag === 'prepare-only' || flag === 'confirm-project-change') options[flag] = true
    else {
      const value = args[++i]
      if (!value || value.startsWith('--')) throw new Error('Missing local simulator argument')
      options[flag] = value
    }
  }
  if (!options['without-firebase']) throw new Error('Local simulator requires explicit --without-firebase')
  if (options.port && (!/^\d+$/.test(options.port) || Number(options.port) < 1024 || Number(options.port) > 65535)) throw new Error('Invalid local Metro port')
  return options
}

function run (command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], ...options })
    let output = ''
    child.stdout?.on('data', chunk => { output += chunk })
    child.stderr?.on('data', chunk => { output += chunk })
    child.on('error', reject)
    child.on('close', code => code === 0 ? resolve(output) : reject(new Error(`${command} failed (${code})\n${output.slice(-6000)}`)))
  })
}
async function freePort (preferred) {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(preferred ? Number(preferred) : 0, '127.0.0.1', () => {
      const port = server.address().port
      server.close(error => error ? reject(error) : resolve(port))
    })
  })
}

export async function main (args = process.argv.slice(2)) {
  if (process.platform !== 'darwin') throw new Error('This adapter requires macOS and Xcode')
  const options = parseLocalOptions(args)
  const manifest = validateManifest(JSON.parse(await fs.readFile(path.join(directory, 'product.json'), 'utf8')))
  const target = manifest.iosTarget
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(target || '')) throw new Error('Missing manifest iosTarget')
  const state = path.join(root, '.ordering-setup', 'ios-local')
  await fs.mkdir(state, { recursive: true, mode: 0o700 })
  await fs.chmod(state, 0o700)
  const temporary = await fs.mkdtemp(path.join(state, 'config-'))
  const configPath = path.join(temporary, manifest.configFile)
  await fs.mkdir(path.dirname(configPath), { recursive: true })
  await fs.copyFile(path.join(root, manifest.configFile), configPath)
  const source = JSON.parse(await fs.readFile(configPath, 'utf8'))
  const project = options.project || source.project
  console.log('Validating the public Ordering project; no user credentials are requested.')
  await configure(temporary, manifest, {
    project,
    apiUrl: options['api-url'],
    apiVersion: options['api-version'],
    language: options.language,
    franchiseSlug: options['franchise-slug'],
    confirmProjectChange: options['confirm-project-change'] === true
  })
  await doctor(temporary, manifest)
  const validated = JSON.parse(await fs.readFile(configPath, 'utf8'))
  const publicConfig = { project: validated.project, api: { url: validated.api.url, version: validated.api.version, language: validated.api.language } }
  if (validated.franchiseSlug) publicConfig.franchiseSlug = validated.franchiseSlug
  console.log('Preparing a generated simulator project; the normal native project remains unchanged.')
  await run('bundle', ['_2.7.1_', 'exec', 'ruby', path.join(directory, 'prepare-ios-local.rb'), root, target])
  const workspace = path.join(root, 'ios', `.ordering-local-${target}.xcworkspace`)
  if (options['prepare-only']) { console.log(`Prepared ${workspace}`); return }
  const simulatorName = `Ordering ${manifest.product} Local ${createHash('sha256').update(root).digest('hex').slice(0, 6)}`
  const simulator = await prepareOwnedSimulator({ state, root, name: simulatorName, requestedRuntime: options.runtime, run })
  const selected = simulator.device
  console.log(`Selected iOS ${simulator.runtimeVersion} (${simulator.runtime}) using ${simulator.simctlPath}; ${simulator.reused ? 'reusing verified owned device' : 'created a new owned device'}.`)
  const destination = `platform=iOS Simulator,id=${selected.udid}`
  const derived = path.resolve(options['derived-data'] || path.join(state, 'derived'))
  const buildLog = path.join(state, 'xcodebuild.log')
  console.log(`Building Debug for a dedicated local simulator. Log: ${buildLog}`)
  const handle = openSync(buildLog, 'w', 0o600)
  try {
    await run('xcodebuild', ['-workspace', workspace, '-scheme', target, '-configuration', 'Debug', '-destination', destination, '-derivedDataPath', derived, 'CODE_SIGNING_ALLOWED=NO', 'build'], { stdio: ['ignore', handle, handle] })
  } catch (error) {
    throw new Error(`Native build failed; read ${buildLog}. ${error.message.split('\n')[0]}`)
  } finally { closeSync(handle) }
  const app = path.join(derived, 'Build', 'Products', 'Debug-iphonesimulator', `${target}.app`)
  const bundleId = (await run('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleIdentifier', path.join(app, 'Info.plist')])).trim()
  if (selected.state !== 'Booted') await run('xcrun', ['simctl', 'boot', selected.udid])
  console.log('Waiting for the dedicated simulator to boot...')
  try { await run('xcrun', ['simctl', 'bootstatus', selected.udid, '-b'], { timeout: 60000 }) } catch (error) {
    const current = JSON.parse(await run('xcrun', ['simctl', 'list', 'devices', '--json']))
    if (!Object.values(current.devices).flat().some(device => device.udid === selected.udid && device.state === 'Booted')) throw error
    console.log('Simulator reports Booted; continuing installation after bootstatus timeout. Verify the actual screen separately.')
  }
  let ownedMetro
  let previous
  try { previous = JSON.parse(await fs.readFile(path.join(state, 'metro.json'), 'utf8')) } catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Existing Metro ownership record is invalid; it has been preserved.')
  }
  let alive = false
  if (Number.isInteger(previous?.pid) && previous.pid > 0) {
    try { process.kill(previous.pid, 0); alive = true } catch (error) { alive = error.code === 'EPERM' }
  }
  if (alive) {
    try {
      if (previous.root !== root || !Number.isInteger(previous.port) || previous.port < 1024 || previous.port > 65535) throw new Error('invalid ownership fields')
      const command = await run('ps', ['-p', String(previous.pid), '-o', 'command='])
      const cwd = await run('lsof', ['-a', '-p', String(previous.pid), '-d', 'cwd', '-Fn'])
      const status = await fetch(`http://127.0.0.1:${previous.port}/status`, { signal: AbortSignal.timeout(2000) })
      if (!command.includes(path.join(root, 'node_modules/react-native/cli.js')) || !cwd.split('\n').includes(`n${root}`) || (await status.text()) !== 'packager-status:running') throw new Error('ownership could not be verified')
      ownedMetro = previous
    } catch { throw new Error('Existing live Metro process could not be verified. Its record and process have been preserved.') }
  }
  if (ownedMetro && options.port && Number(options.port) !== ownedMetro.port) throw new Error(`Owned Metro is already running on port ${ownedMetro.port}; use that port for this checkout.`)
  const port = ownedMetro?.port || await freePort(options.port)
  let metroPid = ownedMetro?.pid
  const metroLog = path.join(state, 'metro.log')
  if (ownedMetro) console.log(`Reusing this checkout's verified Metro process on port ${port}, PID ${metroPid}.`)
  else {
    const metroHandle = openSync(metroLog, 'a', 0o600)
    const metro = spawn(process.execPath, [path.join(root, 'node_modules/react-native/cli.js'), 'start', '--host', '127.0.0.1', '--port', String(port), '--max-workers', '2'], { cwd: root, env: process.env, detached: true, stdio: ['ignore', metroHandle, metroHandle] })
    metro.unref()
    closeSync(metroHandle)
    metroPid = metro.pid
    await fs.writeFile(path.join(state, 'metro.json'), JSON.stringify({ pid: metroPid, port, root, simulator: selected.udid }, null, 2), { mode: 0o600 })
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      await wait(500)
      try { ready = (await (await fetch(`http://127.0.0.1:${port}/status`, { signal: AbortSignal.timeout(1000) })).text()) === 'packager-status:running' } catch {}
      if (ready) break
    }
    if (!ready) throw new Error(`Metro did not start; read ${metroLog}`)
  }
  console.log('Installing the Debug app into its dedicated simulator...')
  await run('xcrun', ['simctl', 'install', selected.udid, app])
  console.log('Launching the local preview...')
  await run('xcrun', ['simctl', 'launch', '--terminate-running-process', selected.udid, bundleId], {
    env: { ...process.env, SIMCTL_CHILD_ORDERING_LOCAL_SIMULATOR: '1', SIMCTL_CHILD_ORDERING_LOCAL_CONFIG: JSON.stringify(publicConfig), SIMCTL_CHILD_ORDERING_LOCAL_METRO_PORT: String(port) }
  })
  const developer = simulator.developerDir
  const simulatorApplication = path.join(developer, 'Applications', 'Simulator.app')
  try {
    await fs.access(simulatorApplication)
    await run('open', ['-a', simulatorApplication, '--args', '-CurrentDeviceUDID', selected.udid])
  } catch { console.log('Simulator GUI is unavailable on this host. The simulator process is running; verify its screen with simctl or agent-device.') }
  console.log(`Local simulator launched: ${simulatorName} (${selected.udid}). Metro port ${port}, PID ${metroPid}.`)
  console.log('Firebase, push, maps and automatic location/offline writes are disabled. This launch is not a production validation.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
