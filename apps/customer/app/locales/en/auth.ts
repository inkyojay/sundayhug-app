/**
 * Authentication Translations - English
 */
export default {
  // Login
  login: {
    title: "Log in",
    subtitle: "Welcome to Sunday Hug",
    email: "Email",
    password: "Password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    button: "Log in",
    orContinueWith: "or",
    socialLogin: {
      kakao: "Continue with Kakao",
      naver: "Continue with Naver",
      google: "Continue with Google",
      apple: "Continue with Apple",
    },
  },

  // Registration
  register: {
    title: "Sign up",
    subtitle: "Get started with Sunday Hug",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    name: "Name",
    phone: "Phone number",
    agreeTerms: "I agree to the Terms of Service",
    agreePrivacy: "I agree to the Privacy Policy",
    agreeMarketing: "I agree to receive marketing communications (optional)",
    hasAccount: "Already have an account?",
    signIn: "Log in",
    button: "Sign up",
    success: "Registration complete!",
  },

  // Forgot password
  forgotPassword: {
    title: "Forgot password",
    subtitle: "Enter your registered email address",
    email: "Email",
    button: "Send verification code",
    sent: "Verification code sent",
    checkEmail: "Please check your email",
    backToLogin: "Back to login",
  },

  // Reset password
  resetPassword: {
    title: "Reset password",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    button: "Change password",
    success: "Password changed successfully",
  },

  // OTP verification
  otp: {
    title: "Enter verification code",
    subtitle: "Enter the verification code sent to {{phone}}",
    placeholder: "6-digit code",
    resend: "Resend code",
    resendIn: "Resend available in {{seconds}} seconds",
    verify: "Verify",
    expired: "Verification code has expired",
    invalid: "Invalid verification code",
  },

  // Validation messages
  validation: {
    emailRequired: "Please enter your email",
    emailInvalid: "Please enter a valid email address",
    passwordRequired: "Please enter your password",
    passwordMin: "Password must be at least 6 characters",
    passwordMismatch: "Passwords do not match",
    nameRequired: "Please enter your name",
    phoneRequired: "Please enter your phone number",
    phoneInvalid: "Please enter a valid phone number",
    termsRequired: "Please agree to the Terms of Service",
    privacyRequired: "Please agree to the Privacy Policy",
  },

  // Error messages
  errors: {
    loginFailed: "Login failed",
    invalidCredentials: "Invalid email or password",
    emailExists: "This email is already registered",
    phoneExists: "This phone number is already registered",
    networkError: "Network error occurred",
    serverError: "Server error occurred",
    tryAgain: "Please try again later",
  },
} as const;
