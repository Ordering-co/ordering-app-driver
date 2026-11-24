import { getProjectScope, isProjectOnboardingEnabled, prepareProjectStorage, PROJECT_SCOPE_KEY } from '../prepareProjectStorage'

const settings = { localProjectConfigured: true, project: 'chosen', api: { url: 'https://example.test', version: 'v400', language: 'en' }, socket: { url: 'https://socket.example.test' }, use_root_point: true, app_id: 'keep-id', extra: { enabled: true } }
const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial))
  return {
    values,
    getItem: jest.fn(async key => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value) }),
    removeItem: jest.fn(async key => { values.delete(key) }),
    multiGet: jest.fn(async keys => keys.map(key => [key, values.get(key) ?? null])),
    multiRemove: jest.fn(async keys => { keys.forEach(key => values.delete(key)) })
  }
}

describe('configured project storage boundary', () => {
  it.each([undefined, false, 'true', 1])('preserves a real DEV source project without an explicit boolean marker (%s)', async marker => {
    const historicalSettings = { ...settings, localProjectConfigured: marker }
    const storage = createStorage({ [PROJECT_SCOPE_KEY]: 'old-scope', project_name: '"saved-project"', token: 'saved-token', offline_actions_array: '{"queued":true}' })
    const result = await prepareProjectStorage(historicalSettings, storage, { development: true })
    expect(result.use_root_point).toBe(true)
    expect(result.project).toBe('saved-project')
    expect(storage.values.get('project_name')).toBe('"saved-project"')
    expect(storage.values.get('token')).toBe('saved-token')
    expect(storage.values.get('offline_actions_array')).toBe('{"queued":true}')
    expect(storage.values.get(PROJECT_SCOPE_KEY)).toBe('old-scope')
    expect(storage.getItem).not.toHaveBeenCalledWith(PROJECT_SCOPE_KEY)
    expect(storage.multiGet).not.toHaveBeenCalled()
    expect(storage.multiRemove).not.toHaveBeenCalled()
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('enables isolation only for explicit development setup or local simulator mode', async () => {
    const historical = { ...settings, localProjectConfigured: undefined }
    expect(isProjectOnboardingEnabled(historical, true)).toBe(false)
    expect(isProjectOnboardingEnabled(settings, false, true)).toBe(false)
    expect(isProjectOnboardingEnabled(settings, true)).toBe(true)
    expect(isProjectOnboardingEnabled(historical, true, true)).toBe(true)
    const local = { ...historical, localSimulatorMode: true }
    expect(isProjectOnboardingEnabled(local, true)).toBe(true)
    const storage = createStorage({ token: 'old-token' })
    const result = await prepareProjectStorage(local, storage, { development: true })
    expect(result.use_root_point).toBe(false)
    expect(storage.values.has('token')).toBe(false)
  })


  it('pins the explicit project and clears an unscoped session before providers mount', async () => {
    const storage = createStorage({ project_name: '"old"', token: 'old-token', user: '{"id":1}', device_code: 'old-device', language: '"es"', printers: '[]', offline_actions_array: '{"123":[]}', pending_orders: '[{"id":123}]' })
    const result = await prepareProjectStorage(settings, storage, { development: true })
    expect(result.project).toBe('chosen')
    expect(result.use_root_point).toBe(false)
    expect(result.app_id).toBe('keep-id')
    expect(result.extra).toEqual(settings.extra)
    expect(result.api).toEqual(settings.api)
    expect(result.api).not.toBe(settings.api)
    expect(settings.use_root_point).toBe(true)
    for (const key of ['project_name', 'token', 'user', 'device_code', 'offline_actions_array', 'pending_orders']) expect(storage.values.has(key)).toBe(false)
    expect(storage.values.get('language')).toBe('"es"')
    expect(storage.values.get('printers')).toBe('[]')
    const quarantine = [...storage.values.entries()].find(([key]) => key.startsWith('ordering_onboarding_quarantine_'))
    expect(JSON.parse(quarantine[1]).entries).toEqual([['offline_actions_array', '{"123":[]}'], ['pending_orders', '[{"id":123}]']])
    expect(quarantine[1]).not.toContain('old-token')
    expect(storage.values.get(PROJECT_SCOPE_KEY)).toBe(getProjectScope(settings))
  })

  it('preserves a same-project session and pending work on the next launch', async () => {
    const storage = createStorage({ [PROJECT_SCOPE_KEY]: getProjectScope(settings), token: 'same-token', offline_actions_array: '{}', project_name: '"stale"' })
    await prepareProjectStorage(settings, storage, { development: true })
    expect(storage.values.get('token')).toBe('same-token')
    expect(storage.values.get('offline_actions_array')).toBe('{}')
    expect(storage.multiRemove).not.toHaveBeenCalled()
    expect(storage.values.has('project_name')).toBe(false)
  })

  it.each([
    { ...settings, project: 'another' },
    { ...settings, api: { ...settings.api, url: 'https://another.example.test' } },
    { ...settings, api: { ...settings.api, version: 'v500' } }
  ])('invalidates sessions for project or backend changes', async next => {
    const storage = createStorage({ [PROJECT_SCOPE_KEY]: getProjectScope(settings), token: 'old-token' })
    await prepareProjectStorage(next, storage, { development: true })
    expect(storage.values.has('token')).toBe(false)
    expect(storage.values.get(PROJECT_SCOPE_KEY)).toBe(getProjectScope(next))
  })

  it('retains manual project selection when source still has the placeholder', async () => {
    const storage = createStorage({ project_name: '"manual-project"', token: 'manual-token' })
    const result = await prepareProjectStorage({ ...settings, project: 'YOUR_PROJECT' }, storage, { development: true })
    expect(result.project).toBe('manual-project')
    expect(result.use_root_point).toBe(true)
    expect(storage.values.get('token')).toBe('manual-token')
  })

  it('disconnects the configured session when restoring the placeholder', async () => {
    const storage = createStorage({ [PROJECT_SCOPE_KEY]: getProjectScope(settings), project_name: '"stale"', token: 'old-token', offline_actions_array: '{}' })
    const result = await prepareProjectStorage({ ...settings, project: 'YOUR_PROJECT' }, storage, { development: true })
    expect(result.project).toBe('YOUR_PROJECT')
    expect(storage.values.has('token')).toBe(false)
    expect(storage.values.has(PROJECT_SCOPE_KEY)).toBe(false)
    expect(storage.values.has('project_name')).toBe(false)
    expect(storage.values.has('offline_actions_array')).toBe(false)
  })

  it('fails closed if storage cleanup fails', async () => {
    const storage = createStorage({ token: 'old-token' })
    storage.multiRemove.mockRejectedValueOnce(new Error('storage unavailable'))
    await expect(prepareProjectStorage(settings, storage, { development: true })).rejects.toThrow('storage unavailable')
    expect(storage.values.has(PROJECT_SCOPE_KEY)).toBe(false)
  })
  it('preserves the release project picker and session without development migration', async () => {
    const storage = createStorage({ [PROJECT_SCOPE_KEY]: 'previous-scope', project_name: '"saved-project"', token: 'old-token', offline_actions_array: '{}' })
    const result = await prepareProjectStorage(settings, storage, { development: false })
    expect(result.use_root_point).toBe(true)
    expect(result.project).toBe('saved-project')
    expect(storage.values.get('project_name')).toBe('"saved-project"')
    expect(storage.values.get('token')).toBe('old-token')
    expect(storage.values.get('offline_actions_array')).toBe('{}')
    expect(storage.values.get(PROJECT_SCOPE_KEY)).toBe('previous-scope')
    expect(storage.multiRemove).not.toHaveBeenCalled()
    expect(storage.getItem).not.toHaveBeenCalledWith(PROJECT_SCOPE_KEY)
  })

})
