/**
 * Error Messages Translations - English
 */
export default {
  // General errors
  general: {
    unknown: "An unknown error occurred",
    network: "Please check your network connection",
    server: "A server error occurred",
    timeout: "Request timed out",
    unauthorized: "Login required",
    forbidden: "Access denied",
    notFound: "Page not found",
    maintenance: "Service under maintenance",
    tryAgain: "Please try again later",
  },

  // HTTP status codes
  http: {
    400: "Bad request",
    401: "Login required",
    403: "Access denied",
    404: "Page not found",
    408: "Request timed out",
    429: "Too many requests. Please try again later",
    500: "Server error occurred",
    502: "Failed to connect to server",
    503: "Service temporarily unavailable",
    504: "Server response timed out",
  },

  // Form validation
  validation: {
    required: "This field is required",
    email: "Please enter a valid email address",
    phone: "Please enter a valid phone number",
    password: "Password must be at least 6 characters",
    passwordMatch: "Passwords do not match",
    minLength: "Please enter at least {{min}} characters",
    maxLength: "Maximum {{max}} characters allowed",
    number: "Numbers only",
    date: "Please select a valid date",
    file: {
      size: "File size must be {{max}}MB or less",
      type: "Unsupported file format",
    },
  },

  // Authentication
  auth: {
    loginRequired: "This service requires login",
    sessionExpired: "Session expired. Please log in again",
    invalidCredentials: "Invalid email or password",
    accountLocked: "Account locked. Please contact customer service",
    emailNotVerified: "Email verification required",
  },

  // Permissions
  permission: {
    denied: "Permission denied",
    camera: "Camera access required",
    microphone: "Microphone access required",
    location: "Location access required",
    storage: "Storage access required",
    notification: "Notification permission required",
  },

  // Actions
  actions: {
    retry: "Try Again",
    goBack: "Go Back",
    goHome: "Go Home",
    login: "Log In",
    contact: "Contact Support",
    refresh: "Refresh",
  },

  // 404 page
  notFound: {
    title: "Page Not Found",
    description: "The page you requested does not exist or has been moved.",
    suggestions: [
      "Please check the URL address",
      "Search for what you're looking for on the homepage",
      "Contact customer service if the problem persists",
    ],
  },

  // 500 page
  serverError: {
    title: "Server Error",
    description: "A temporary error occurred. Please try again later.",
  },

  // Maintenance page
  maintenance: {
    title: "Under Maintenance",
    description: "We're improving our service. We'll be back soon.",
    estimatedTime: "Estimated completion: {{time}}",
  },
} as const;
