import test from 'node:test'
import assert from 'node:assert/strict'
import { parseLocalOptions } from './ios-local.mjs'

test('local simulator is explicit and never accepts release/device build arguments', () => {
  assert.throws(() => parseLocalOptions([]), /explicit/)
  for (const flags of [['--release'], ['--configuration', 'Release'], ['--device', 'phone'], ['--without-firebase', '--without-firebase']]) {
    assert.throws(() => parseLocalOptions(flags))
  }
  assert.deepEqual(parseLocalOptions(['--without-firebase', '--project', 'test-project', '--port', '8082']), { 'without-firebase': true, project: 'test-project', port: '8082' })
})
test('refuses invalid or incomplete connection arguments', () => {
  assert.throws(() => parseLocalOptions(['--without-firebase', '--port', '22']), /port/)
  assert.throws(() => parseLocalOptions(['--without-firebase', '--project']), /Missing/)
})
