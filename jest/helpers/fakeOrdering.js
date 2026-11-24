/**
 * The orders API as the REAL `OrderListGroups` controller (`src/@/components/src/components/OrderListGroups/index.js`) reaches it:
 * `ordering.setAccessToken(token).orders().asDashboard().get(options)`, over a `createServer` of `fakeOrderListGroups`. A test that
 * uses it mocks the controller's context modules (session, api, websocket, toast, language, event, config) and keeps the real
 * controller, so its way of loading (the closure it writes, the lists it wipes, its effect on the selected list) is the app's.
 *
 *  - `down`: the connection is gone. A request sent while it is down, and one that was in flight when it went (its answer comes after
 *    `down` was set), ends as the SDK's XHR does: the promise rejects with an `error` event that has no message.
 *  - `server.gates` holds the answer of a list's requests until the test lets it go (a load that is in flight when the connection goes).
 *  - `asked()` is every request the controller sent, `key:page`, in order (`reset()` empties it).
 */
/* eslint-env jest */
const { STATUSES } = require('./fakeOrderListGroups')

const keyOf = (status) => Object.keys(STATUSES).find((key) => JSON.stringify(STATUSES[key]) === JSON.stringify(status))

const createFakeOrdering = (server) => {
  const api = {
    root: 'https://api.test',
    down: false,
    asked: () => server.asked(),
    reset: () => { server.requests.length = 0 },
    setAccessToken: () => ({
      orders: () => ({
        asDashboard: () => ({
          get: async (options) => {
            const where = (options.query.where || []).find((condition) => condition.attribute === 'status')
            const key = keyOf(where && where.value)
            if (!key) throw new Error(`fakeOrdering: no list for the status ${JSON.stringify(where && where.value)}`)
            if (api.down) {
              server.requests.push({ key, page: options.query.page, down: true })
              throw { type: 'error' } // eslint-disable-line no-throw-literal
            }
            const { result, pagination } = await server.page(key, options.query.page)
            if (api.down) throw { type: 'error' } // eslint-disable-line no-throw-literal
            return { content: { error: false, result, pagination } }
          }
        })
      })
    })
  }
  return api
}

module.exports = { createFakeOrdering }
