import * as React from 'react'
import { useLanguage } from '@components'
import { getTraduction } from '../../utils'
import { presentConfirm, useRouteKey } from './confirmAction'

interface Props {
  open: boolean,
  title: string,
  content: Array<string>,
  onClose: () => void,
  onAccept: () => void,
  onCancel?: any,
  /** What the accept button says: the action's name ("Delete", "Remove"); "Accept" when it is not given. */
  acceptText?: string,
  /** What the other button says: "Cancel" when it is not given. */
  cancelText?: string,
  /** The accept button is a destructive one (the danger color). */
  destructive?: boolean,
  /**
   * A notice, not a question: it tells something and has one button ("Ok", or `acceptText`) that calls `onAccept`; there is
   * no Cancel to offer (a notice whose Cancel also "went back" was two buttons for one meaning).
   */
  notice?: boolean,
}
const OAlert = (props: Props) => {
  const {
    open,
    title,
    content,
    onClose,
    onAccept,
    acceptText,
    cancelText,
    destructive,
    notice
  } = props

  const [, t] = useLanguage();
  const routeKey = useRouteKey();
  React.useEffect(() => {
    if (!open) return

    const message = typeof content === 'string'
      ? content
      : getTraduction(content?.[0], t)

    if (!title && !message) {
      onClose()
      return
    }

    presentConfirm({
      title,
      message,
      notice,
      routeKey,
      acceptText: acceptText ?? (notice ? t('OK', 'Ok') : t('ACCEPT', 'Accept')),
      cancelText: cancelText ?? t('CANCEL', 'Cancel'),
      destructive,
      onAccept: notice ? (onAccept ?? onClose) : onAccept,
      onCancel: onClose
    })
  }, [open])

  return (
    <></>
  )
}

export default OAlert;
