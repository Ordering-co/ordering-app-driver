import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

// The form is the UI's: the page is what it hands it.
jest.mock('@ui', () => {
  const React = require('react')
  const { Text, View } = require('react-native')
  return {
    ...require('../../../jest/helpers/mockUi'),
    UserFormDetails: (props: any) => React.createElement(
      View,
      { testID: 'user-form' },
      React.createElement(Text, { testID: 'user-form-part' }, props.part),
      React.createElement(Text, { testID: 'user-form-flags' }, JSON.stringify({
        useSessionUser: props.useSessionUser,
        useValidationFields: props.useValidationFields,
        isEdit: props.isEdit
      })),
      React.createElement(View, { testID: 'user-form-navigation', ...{ navigation: props.navigation } })
    )
  }
})

import ProfileEdit from '../ProfileEdit'
import ProfilePassword from '../ProfilePassword'

describe('ProfileEdit', () => {
  it('opens the personal data\'s form on the session\'s user, with the server\'s validation fields and the edit on', () => {
    const { getByTestId } = renderPage(ProfileEdit)
    expect(getByTestId('safe-area-layout')).toBeTruthy()
    expect(getByTestId('user-form-part').props.children).toBe('information')
    expect(JSON.parse(getByTestId('user-form-flags').props.children)).toEqual({ useSessionUser: true, useValidationFields: true, isEdit: true })
  })

  it('gives the form the screen\'s navigation, to go back with', () => {
    const { getByTestId, navigation } = renderPage(ProfileEdit)
    expect(getByTestId('user-form-navigation').props.navigation).toBe(navigation)
  })
})

describe('ProfilePassword', () => {
  it('opens the same form on the password alone', () => {
    const { getByTestId, navigation } = renderPage(ProfilePassword)
    expect(getByTestId('user-form-part').props.children).toBe('password')
    expect(JSON.parse(getByTestId('user-form-flags').props.children)).toEqual({ useSessionUser: true, useValidationFields: true, isEdit: true })
    expect(getByTestId('user-form-navigation').props.navigation).toBe(navigation)
  })
})
