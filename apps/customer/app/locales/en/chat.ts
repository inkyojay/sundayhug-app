/**
 * AI Chat Translations - English
 */
export default {
  // Main
  title: "AI Parenting Consultation",
  subtitle: "AI consultant helps with your parenting questions",

  // Session list
  sessions: {
    title: "Chat History",
    newChat: "Start New Chat",
    empty: "No chat history yet",
    startFirst: "Start your first consultation!",
    continueChat: "Continue Chat",
    deleteChat: "Delete",
    confirmDelete: "Delete this conversation?",
  },

  // Chat room
  room: {
    title: "AI Consultation",
    newSession: "New Chat",
    placeholder: "Type your message...",
    send: "Send",
    typing: "Typing...",

    // Welcome message
    welcome: {
      greeting: "Hello! I'm your AI parenting consultant.",
      withBaby: "Feel free to ask any questions about {{name}} ({{months}} months old)!",
      suggestions: ["Baby wakes up often at night", "When to start weaning", "Sleep training methods"],
    },

    // Action buttons
    actions: {
      playAudio: "Listen",
      stopAudio: "Stop",
      copy: "Copy",
      copied: "Copied!",
      helpful: "Helpful",
      notHelpful: "Not helpful",
    },

    // Voice input
    voice: {
      recording: "Recording...",
      processing: "Converting...",
      tapToStop: "Click again to stop",
      error: "Voice input failed",
    },

    // Image
    image: {
      attach: "Attach Image",
      preview: "Preview",
      remove: "Remove",
      analyzing: "Analyzing image...",
    },

    // Sources
    sources: {
      title: "References",
    },

    // Disclaimer
    disclaimer: "AI-generated responses are for reference only and do not replace professional medical advice.",
  },

  // Baby profile registration
  babyProfile: {
    title: "Register Baby Info",
    subtitle: "Tell us about your baby for personalized consultations",
    name: "Baby's Name",
    namePlaceholder: "e.g., Luna",
    nameOptional: "Optional",
    birthDate: "Date of Birth",
    birthDateRequired: "Required",
    feedingType: "Feeding Type",
    feedingPlaceholder: "Select",
    feedingOptions: {
      breast: "Breastfeeding",
      formula: "Formula",
      mixed: "Mixed",
    },
    submit: "Start Consultation",
    saving: "Saving...",
    validation: {
      birthDateRequired: "Please enter date of birth",
    },
  },

  // Baby selection
  selectBaby: {
    title: "Select Child",
    subtitle: "Which child would you like to consult about?",
    addNew: "Add New Child",
  },

  // Topics
  topics: {
    sleep: "Sleep",
    feeding: "Feeding/Weaning",
    development: "Development",
    health: "Health",
    behavior: "Behavior",
    other: "Other",
  },

  // Errors
  errors: {
    sendFailed: "Failed to send message",
    loadFailed: "Failed to load conversation",
    voiceFailed: "Voice recognition failed",
    networkError: "Network error occurred",
    tryAgain: "Please try again",
  },
} as const;
