import styled from 'styled-components/native'
import { WebView } from 'react-native-webview'

/** The invisible reCAPTCHA's page: it only shows Google's badge, in the slot the form gives it. */
export const RecaptchaFrame = styled.View`
  width: 100%;
`

export const RecaptchaWebView = styled(WebView)`
  flex: 1;
`
