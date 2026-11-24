/**
 * The app's confirmations and notices (`presentConfirm`) go to its themed dialog host, never to `Alert.alert`.
 * A test that asks what the driver would be asked installs this stand-in for the host: it records each request
 * (title, message, acceptText, cancelText, destructive, notice) and the test answers it with `accept` / `cancel`.
 */
/* eslint-env jest */
const { registerConfirmHost } = require('../../src/ui/src/components/shared/confirmAction')

const captureDialogs = () => {
  const requests = []
  const off = registerConfirmHost((request) => requests.push(request))
  return {
    requests,
    /** The latest request. */
    last: () => requests[requests.length - 1],
    accept: (request = requests[requests.length - 1]) => request.onAccept?.(),
    cancel: (request = requests[requests.length - 1]) => request.onCancel?.(),
    off
  }
}

module.exports = { captureDialogs }
