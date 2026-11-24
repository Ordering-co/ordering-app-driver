import React from 'react'
import { SafeAreaContainerLayout, UserFormDetails } from '@ui'

interface Props {
  navigation: any;
  route: any;
}

/**
 * The password and its confirmation, on a screen of its own (the profile's Password row opens it):
 * the same form and controller as the personal data, showing the password alone.
 */
const ProfilePassword = ({ navigation }: Props) => (
  <SafeAreaContainerLayout>
    <UserFormDetails
      part='password'
      useSessionUser
      useValidationFields
      isEdit
      navigation={navigation}
    />
  </SafeAreaContainerLayout>
)

export default ProfilePassword
