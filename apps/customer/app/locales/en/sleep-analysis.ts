/**
 * Sleep Analysis Translations - English
 */
export default {
  // Main
  title: "Sleep Environment Analysis",
  subtitle: "AI analyzes your baby's sleep environment",

  // Hub page
  hub: {
    title: "Sleep Analysis",
    description: "Let AI analyze your baby's sleep environment",
    startButton: "Start Analysis",
    historyButton: "View History",

    // Guide
    guide: {
      title: "Photo Tips",
      tips: [
        "Capture the entire baby's crib in the frame",
        "Include bedding and surrounding environment",
        "Take photos in natural light or bright conditions",
      ],
    },
  },

  // Upload
  upload: {
    title: "Upload Photo",
    description: "Upload a photo of your baby's sleep environment",
    button: "Select Photo",
    dragDrop: "or drag and drop files here",
    maxSize: "Max 10MB",
    formats: "JPG, PNG formats",
    analyzing: "AI is analyzing...",
    analyzingDescription: "Please wait. This usually takes about 30 seconds.",
  },

  // Result
  result: {
    title: "Analysis Result",
    overallScore: "Overall Score",
    date: "Analysis Date",

    // Score levels
    score: {
      excellent: "Excellent! Very safe environment",
      good: "Good! Safe environment",
      fair: "Okay, but could be improved",
      poor: "Needs attention",
      critical: "Immediate improvement needed",
    },

    // Analysis categories
    categories: {
      sleepSurface: "Sleep Surface",
      bedding: "Bedding",
      surroundings: "Surroundings",
      temperature: "Temperature/Ventilation",
      lighting: "Lighting",
    },

    // Feedback
    feedback: {
      title: "Recommendations",
      good: "Doing well",
      improve: "Needs improvement",
      tips: "Tips",
    },

    // Share
    share: {
      button: "Share Results",
      instagram: "Instagram Story",
      kakao: "Share via KakaoTalk",
      save: "Save as Image",
    },

    // Re-analyze
    reanalyze: "Analyze Again",
    saveResult: "Save Result",
  },

  // History
  history: {
    title: "Analysis History",
    empty: "No analysis history yet",
    startFirst: "Start your first analysis!",
    viewDetail: "View Details",
    delete: "Delete",
    confirmDelete: "Delete this analysis record?",
  },

  // Sleep forecast
  forecast: {
    title: "Today's Sleep Forecast",
    temperature: "Temperature",
    humidity: "Humidity",
    recommendation: "Recommended Settings",
    sleepwear: "Recommended Sleepwear",
    bedding: "Recommended Bedding",
  },

  // Errors
  errors: {
    uploadFailed: "Photo upload failed",
    analysisFailed: "Analysis failed",
    invalidImage: "Please select a valid image file",
    imageTooLarge: "Image is too large (max 10MB)",
    tryAgain: "Please try again",
  },
} as const;
