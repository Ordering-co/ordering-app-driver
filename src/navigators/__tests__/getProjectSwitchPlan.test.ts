import {
  getProjectLoginSuccessPlan,
  getStoredProjectSettedPatch
} from '../getProjectSwitchPlan'

const user = {
  id: 1,
  session: { access_token: 'token' }
}

describe('getProjectLoginSuccessPlan', () => {
  it('does not restart when the project did not change', () => {
    expect(getProjectLoginSuccessPlan({ projectChanged: false, user })).toEqual({
      shouldPersistSessionAndRestart: false
    })
  })

  it('persists session and restarts when the project changed', () => {
    expect(getProjectLoginSuccessPlan({ projectChanged: true, user })).toEqual({
      shouldPersistSessionAndRestart: true,
      session: {
        user,
        token: 'token'
      }
    })
  })
})

describe('getStoredProjectSettedPatch', () => {
  it('marks setted when a project name is stored', () => {
    expect(getStoredProjectSettedPatch('eatstreet')).toEqual({ setted: true })
  })

  it('is null when nothing is stored', () => {
    expect(getStoredProjectSettedPatch(null)).toBeNull()
  })
})
