import React from 'react'
import { Container, Sessions as SessionsController } from '@ui'
import { useTheme } from 'styled-components/native'
interface Props {
  navigation: any;
  route: any;
}

const Sessions = (props: Props) => {
  const theme = useTheme();
  const sessionsProps = {
    ...props
  }

  return (
    <Container style={{ backgroundColor: theme.colors.white }} noPadding>
      <SessionsController {...sessionsProps} />
    </Container>
  )
}

export default Sessions
