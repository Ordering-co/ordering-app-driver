/**
 * reCAPTCHA v3 (src/ui/src/components/RecaptchaV3): the page it loads on the
 * project's base URL, the token handed to the form, and what it lets load.
 */
import React from 'react'
import { Linking } from 'react-native'
import { RecaptchaV3, readRecaptchaMessage, recaptchaV3Html } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const message = (data: unknown) => ({ nativeEvent: { data: JSON.stringify(data) } })

describe('RecaptchaV3', () => {
  it('loads Google\'s script for the site key on the base URL', () => {
    const { getByTestId } = renderWithProviders(
      <RecaptchaV3 url="https://shop.test" siteKey="site-key" onExecute={jest.fn()} />
    )
    const source = getByTestId('webview').props.source
    expect(source.baseUrl).toBe('https://shop.test')
    expect(source.html).toContain('https://www.google.com/recaptcha/api.js?render=site-key')
    expect(source.html).toContain('grecaptcha.execute("site-key"')
  })

  it('escapes the site key and the action inside the script', () => {
    const html = recaptchaV3Html('a"b', "x'); alert(1); //")
    expect(html).toContain('grecaptcha.execute("a\\"b", { action: "x\'); alert(1); //" })')
    expect(html).toContain('render=a%22b')
  })

  it('hands the token to the form, and an error never as a token', () => {
    const onExecute = jest.fn()
    const onError = jest.fn()
    const { getByTestId } = renderWithProviders(
      <RecaptchaV3 url="https://shop.test" siteKey="k" onExecute={onExecute} onError={onError} />
    )
    const webview = getByTestId('webview')
    webview.props.onMessage(message({ type: 'error', error: 'Invalid site key' }))
    webview.props.onMessage({ nativeEvent: { data: '[object Object]' } })
    expect(onExecute).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('Invalid site key')
    webview.props.onMessage(message({ type: 'token', token: 'tok-1' }))
    expect(onExecute).toHaveBeenCalledWith('tok-1')
  })

  it('reads only well-formed messages', () => {
    expect(readRecaptchaMessage(JSON.stringify({ type: 'token', token: 't' }))).toEqual({ token: 't' })
    expect(readRecaptchaMessage(JSON.stringify({ type: 'token', token: '' }))).toEqual({})
    expect(readRecaptchaMessage('not json')).toEqual({})
  })

  it('keeps the page and Google inside, and opens other links outside', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { getByTestId } = renderWithProviders(
      <RecaptchaV3 url="https://shop.test" siteKey="k" onExecute={jest.fn()} />
    )
    const allow = getByTestId('webview').props.onShouldStartLoadWithRequest
    expect(allow({ url: 'https://shop.test', isTopFrame: true })).toBe(true)
    expect(allow({ url: 'about:blank', isTopFrame: true })).toBe(true)
    expect(allow({ url: 'https://www.google.com/recaptcha/api2/anchor?k=k', isTopFrame: false })).toBe(true)
    expect(allow({ url: 'https://policies.google.com/privacy', isTopFrame: true })).toBe(false)
    expect(openURL).toHaveBeenCalledWith('https://policies.google.com/privacy')
  })
})
