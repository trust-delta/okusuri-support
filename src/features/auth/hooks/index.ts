/**
 * 認証フックのエクスポート
 */

export { useAuth, useRequireAuth } from './use-auth'
export {
  useSignUp,
  isSignUpSuccess,
  needsEmailConfirmation,
  getErrorField,
} from './useSignUp'
export {
  useSignIn,
  isSignInSuccess,
  needsEmailConfirmation as needsEmailConfirmationSignIn,
  getRedirectUrl,
  getSignInErrorField,
} from './useSignIn'
export {
  useEmailConfirmation,
  useEmailConfirmationPage,
  extractTokenFromUrl,
} from './useEmailConfirmation'
export {
  useProfile,
  isProfileLoaded,
  hasProfileError,
} from './useProfile'
