/**
 * Customer Service Translations - English
 */
export default {
  // Home screen
  home: {
    welcome: {
      loggedIn: "Hi, {{name}}.",
      guest: "Sunday Hug.",
    },
    subtitle: "From product registration to AI sleep analysis, Sunday Hug is here for you.",

    // First visit guide
    firstVisit: {
      title: "First time here?",
      description: "Sign up to access warranty registration, save sleep analysis results, and more.",
    },

    // Service cards
    services: {
      warranty: {
        label: "Product Registration",
        title: "Product Registration",
        description: "Register your product's serial number and enjoy premium warranty benefits.",
        button: "Register",
      },
      sleepAnalysis: {
        label: "AI Sleep Tech",
        title: "Sleep Analysis",
        description: "AI analyzes your baby's sleep environment and provides personalized solutions.",
        button: "Analyze",
      },
      chat: {
        label: "AI Parenting",
        title: "AI Parenting Consultation",
        description: "Get AI answers to your questions about sleep, feeding, and development.",
        button: "Consult",
      },
      blog: {
        label: "Parenting Guide",
        title: "Parenting Blog",
        description: "Sleep guides, product tips, and parenting hacks.",
        button: "Explore",
      },
    },

    // Event
    event: {
      reviewTitle: "Join the Review Event",
      reviewDescription: "Write a review on mom cafes and get a free gift!",
    },

    // Quick links
    quickLinks: {
      manual: "ABC Baby Crib User Manual",
      customerService: "Customer Service",
      kakaoChat: "KakaoTalk Chat",
    },
  },

  // My page
  mypage: {
    title: "My Page",
    greeting: "Hello, {{name}}!",

    // Menu
    menu: {
      profile: "Profile Settings",
      warranties: "My Warranties",
      analyses: "Sleep Analysis History",
      points: "Points",
      reviews: "My Reviews",
      asList: "A/S Request History",
      babyProfiles: "Baby Profiles",
    },

    // Stats
    stats: {
      warranties: "Registered Warranties",
      analyses: "Sleep Analyses",
      points: "Points",
    },
  },

  // Profile
  profile: {
    title: "Edit Profile",
    name: "Name",
    email: "Email",
    phone: "Phone Number",
    password: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmPassword: "Confirm New Password",
    save: "Save",
    success: "Profile updated successfully",

    // Baby info
    baby: {
      title: "Baby Information",
      add: "Add Baby",
      name: "Baby's Name",
      birthDate: "Date of Birth",
      gender: "Gender",
      male: "Boy",
      female: "Girl",
    },

    // Account
    account: {
      deleteAccount: "Delete Account",
      deleteWarning: "All data will be permanently deleted and cannot be recovered.",
      confirmDelete: "Are you sure you want to delete your account?",
    },
  },

  // Points
  points: {
    title: "Points",
    current: "Available Points",
    history: "Points History",
    earn: "Earned",
    use: "Used",
    expire: "Expiring Soon",
    noHistory: "No points history",
  },
} as const;
