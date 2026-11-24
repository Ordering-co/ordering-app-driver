import React from 'react';

import { ForgotPasswordForm } from '@ui';

/**
 * The form lays its own screen: its bar, its scroll and the button under it, all above the keyboard.
 */
export const ForgotPassword = (props: any) => {
  return <ForgotPasswordForm {...props} />;
};

export default ForgotPassword;
