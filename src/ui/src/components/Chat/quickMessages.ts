export type QuickMessage = { key: string, text: string }

// Without a text in the project's dictionary the language function answers the key itself.
const isKey = (text: string) => /^(store|driver|admin)_message_\d+$/i.test(text)

/**
 * The chat's quick messages of a user's level (0 an administrator, 2 a store, 4 a driver): only
 * the ones the project has a text for (the owner's decision: a key is not a message). The chat
 * draws them, and its skeleton keeps their row only when there is one, so nothing moves on load.
 */
export const quickMessagesOf = (level: number | undefined, t: (key: string, fallback: string) => string): QuickMessage[] => {
  const list: QuickMessage[] = level === 0
    ? [
      { key: 'message_1', text: t('ADMIN_MESSAGE_1', 'admin_message_1') },
      { key: 'message_2', text: t('ADMIN_MESSAGE_2', 'admin_message_2') },
      { key: 'message_3', text: t('ADMIN_MESSAGE_3', 'admin_message_3') },
      { key: 'message_4', text: t('ADMIN_MESSAGE_4', 'admin_message_4') }
    ]
    : level === 2
      ? [
        { key: 'store_message_1', text: t('STORE_MESSAGE_1', 'store_message_1') },
        { key: 'store_message_2', text: t('STORE_MESSAGE_2', 'store_message_2') },
        { key: 'store_message_3', text: t('STORE_MESSAGE_3', 'store_message_3') },
        { key: 'store_message_4', text: t('STORE_MESSAGE_4', 'store_message_4') }
      ]
      : level === 4
        ? [
          { key: 'driver_message_1', text: t('DRIVER_MESSAGE_1', 'driver_message_1') },
          { key: 'driver_message_2', text: t('DRIVER_MESSAGE_2', 'driver_message_2') },
          { key: 'driver_message_3', text: t('DRIVER_MESSAGE_3', 'driver_message_3') },
          { key: 'driver_message_4', text: t('DRIVER_MESSAGE_4', 'driver_message_4') }
        ]
        : []
  return list.filter(quickMessage => !!quickMessage.text?.trim() && !isKey(quickMessage.text.trim()))
}
