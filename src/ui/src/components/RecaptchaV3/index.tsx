import React, { useCallback, useMemo } from 'react'
import { Linking, StyleProp, ViewStyle } from 'react-native'
import type { WebViewMessageEvent } from 'react-native-webview'
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes'

import { RecaptchaFrame, RecaptchaWebView } from './styles'

/**
 * reCAPTCHA v3 (invisible) for the login and sign-up forms, in place of
 * @fatnlazycat/react-native-recaptcha-v3: a WebView loads Google's script on
 * the project's base URL (the domain the site key allows), runs
 * `grecaptcha.execute` once and hands the token to `onExecute`. A failure
 * never reaches `onExecute` as a token.
 */
export type RecaptchaV3Props = {
  /** The page origin the site key is registered for (`security_recaptcha_base_url`). */
  url: string
  siteKey: string
  action?: string
  onExecute: (token: string) => void
  onError?: (error: string) => void
  containerStyle?: StyleProp<ViewStyle>
}

const GOOGLE_RECAPTCHA = /^https:\/\/(www\.)?(google\.com|gstatic\.com|recaptcha\.net)\/recaptcha\//

/** The page: Google's script for the site key, then one execute posted back as JSON. */
export const recaptchaV3Html = (siteKey: string, action = '') => {
  const key = JSON.stringify(siteKey)
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}"></script>
<script>
grecaptcha.ready(function () {
  grecaptcha.execute(${key}, { action: ${JSON.stringify(action)} }).then(function (token) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
  }, function (error) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: String(error) }));
  });
});
</script></head><body></body></html>`
}

/** What the page posted: a token, an error, or nothing usable. */
export const readRecaptchaMessage = (data: string): { token?: string, error?: string } => {
  try {
    const message = JSON.parse(data)
    if (message?.type === 'token' && typeof message.token === 'string' && message.token) return { token: message.token }
    if (message?.type === 'error') return { error: String(message.error ?? '') }
  } catch {}
  return {}
}

export const RecaptchaV3 = ({ url, siteKey, action = '', onExecute, onError, containerStyle }: RecaptchaV3Props) => {
  const source = useMemo(() => ({ html: recaptchaV3Html(siteKey, action), baseUrl: url }), [siteKey, action, url])

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    const { token, error } = readRecaptchaMessage(event.nativeEvent.data)
    if (token) onExecute(token)
    else if (error !== undefined) onError?.(error)
  }, [onExecute, onError])

  // The page and Google's frames load inside; a link (the badge's terms and
  // privacy) opens outside the app.
  const onShouldStartLoadWithRequest = useCallback((request: ShouldStartLoadRequest) => {
    const target = request.url
    if (target === url || target.startsWith('about:') || target.startsWith('data:') || GOOGLE_RECAPTCHA.test(target)) return true
    if (request.isTopFrame === false) return true
    Linking.openURL(target).catch(() => {})
    return false
  }, [url])

  return (
    <RecaptchaFrame style={containerStyle}>
      <RecaptchaWebView
        originWhitelist={['*']}
        javaScriptEnabled
        source={source}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        scrollEnabled={false}
      />
    </RecaptchaFrame>
  )
}

export default RecaptchaV3
