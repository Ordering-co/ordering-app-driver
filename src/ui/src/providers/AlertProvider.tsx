import * as React from 'react'
import { Alert as RNAlert } from 'react-native';
import { getTraduction } from '@ui'
import { useLanguage } from '@components'
interface Props {
  open: boolean,
  title: string,
  content: Array<string>,
  onClose: () => void,
  onAccept: () => void
}
const Alert = (props: Props) => {
  const {
    open,
    title,
    content,
    onClose,
    onAccept,
  } = props

  const [, t] = useLanguage();

  React.useEffect(() => {
    if (open) {
    RNAlert.alert(title, typeof content === 'string'
      ? content
      : getTraduction(content?.[0], t), [
      { text: t('ACCEPT', 'Accept'), onPress: onAccept },
      { text: t('CANCEL', 'Cancel'), onPress: onClose }
    ])
    }
  }, [open])

  return (
    <></>
  )
}

export default Alert;
