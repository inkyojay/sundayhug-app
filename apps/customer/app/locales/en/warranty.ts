/**
 * Warranty Translations - English
 */
export default {
  // Main
  title: "Product Registration",
  subtitle: "Register your product warranty and enjoy premium benefits",

  // Registration
  register: {
    title: "Register Warranty",
    serialNumber: "Serial Number",
    serialPlaceholder: "Enter the serial number on the back of your product",
    scanQr: "Scan QR Code",
    orEnterManually: "or enter manually",
    purchaseDate: "Purchase Date",
    purchasePlace: "Purchase Location",
    selectPlace: "Select purchase location",
    places: {
      official: "Official Store",
      coupang: "Coupang",
      naver: "Naver Smartstore",
      other: "Other",
    },
    submit: "Register",
    success: "Warranty registered successfully!",
  },

  // List
  list: {
    title: "My Warranties",
    empty: "No registered warranties",
    registerFirst: "Register your first warranty",
    addNew: "Register New Warranty",
    viewDetail: "View Details",
  },

  // Detail
  detail: {
    title: "Warranty Details",
    productInfo: "Product Information",
    productName: "Product Name",
    serialNumber: "Serial Number",
    registrationDate: "Registration Date",
    purchaseDate: "Purchase Date",
    purchasePlace: "Purchase Location",
    warrantyPeriod: "Warranty Period",
    expiryDate: "Expiry Date",
    status: {
      active: "Active",
      expired: "Expired",
      pending: "Under Review",
    },

    // Benefits
    benefits: {
      title: "Warranty Benefits",
      freeRepair: "Free Repair",
      freeRepairDesc: "Free repair service during warranty period",
      discount: "Repair Discount",
      discountDesc: "20% discount on repairs after warranty period",
      priority: "Priority Service",
      priorityDesc: "Priority handling for A/S requests",
    },
  },

  // A/S Request
  asRequest: {
    title: "A/S Request",
    selectProduct: "Select Product",
    issueType: "Issue Type",
    types: {
      repair: "Repair Request",
      exchange: "Exchange Request",
      refund: "Refund Request",
      inquiry: "General Inquiry",
    },
    description: "Details",
    descriptionPlaceholder: "Please describe the issue in detail",
    attachPhoto: "Attach Photo",
    attachPhotoDesc: "Please attach photos showing the issue",
    submit: "Submit",
    success: "A/S request submitted successfully",
  },

  // A/S List
  asList: {
    title: "A/S Request History",
    empty: "No request history",
    status: {
      pending: "Received",
      inProgress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
    },
  },

  // Validation
  validation: {
    serialRequired: "Please enter the serial number",
    serialInvalid: "Invalid serial number format",
    serialExists: "This serial number is already registered",
    purchaseDateRequired: "Please select the purchase date",
    purchasePlaceRequired: "Please select the purchase location",
  },

  // Errors
  errors: {
    registerFailed: "Warranty registration failed",
    notFound: "Warranty not found",
    expired: "This warranty has expired",
    tryAgain: "Please try again",
  },

  // Admin - A/S Management
  admin: {
    asManagement: {
      title: "A/S Management",
      subtitle: "A/S Request Status",
      backToWarrantyList: "Warranty List",
      requestList: "A/S Request List",
      totalItems: "Total {{count}} items",
      noRequests: "No A/S requests",
      filter: {
        status: "Status",
        type: "Type",
        all: "All",
      },
      stats: {
        total: "Total",
        received: "Received",
        processing: "Processing",
        completed: "Completed",
      },
      status: {
        received: "Received",
        processing: "Processing",
        completed: "Completed",
        cancelled: "Cancelled",
      },
      types: {
        repair: "Repair",
        exchange: "Exchange",
        refund: "Refund",
        inquiry: "Inquiry",
      },
      table: {
        warrantyNumber: "Warranty No.",
        customer: "Customer",
        product: "Product",
        type: "Type",
        content: "Content",
        status: "Status",
        requestDate: "Request Date",
      },
      pagination: {
        page: "Page {{current}} / {{total}}",
        previous: "Previous",
        next: "Next",
      },
    },

    warrantyManagement: {
      title: "Warranty Management",
      subtitle: "Digital Warranty Status",
      warrantyList: "Warranty List",
      totalItems: "Total {{count}} items",
      selectedItems: "({{count}} selected)",
      noWarranties: "No registered warranties",
      noSearchResults: "No search results",
      searchPlaceholder: "Search by warranty number, tracking number, or phone...",
      search: "Search",
      selectAll: "Select All",
      selectItem: "Select {{number}}",
      deleteSelected: "Delete Selected ({{count}})",
      pendingApproval: "Pending Approval ({{count}})",
      filter: {
        status: "Status",
        all: "All",
      },
      stats: {
        total: "Total Warranties",
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        expired: "Expired",
        thisWeek: "Registered This Week",
      },
      status: {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        expired: "Expired",
      },
      table: {
        warrantyNumber: "Warranty No.",
        buyerName: "Buyer Name",
        product: "Product",
        trackingNumber: "Tracking No.",
        warrantyPeriod: "Warranty Period",
        status: "Status",
        registrationDate: "Registration Date",
        detail: "Detail",
        view: "View",
        member: "Member: {{name}}",
      },
      deleteDialog: {
        title: "Delete Warranty",
        description: "Delete <strong>{{count}}</strong> selected warranty(s)?",
        warning: "This action cannot be undone.",
        deleting: "Deleting...",
      },
    },

    warrantyDetail: {
      registrationDate: "Registration Date: {{date}}",
      customerInfo: {
        title: "Customer Information",
        buyerName: "Buyer Name",
        phone: "Phone",
        memberName: "Member Name",
        email: "Email",
      },
      productInfo: {
        title: "Product Information",
        productName: "Product Name",
        option: "Option",
        sku: "SKU",
        salesChannel: "Sales Channel",
      },
      orderInfo: {
        title: "Order Information Verified",
        matched: "Matched",
        description: "Warranty application matches actual order history",
        unlinkOrder: "Unlink",
        shopOrderNumber: "Shop Order No.",
        salesChannel: "Sales Channel",
        orderDate: "Order Date",
        orderStatus: "Order Status",
        trackingNumber: "Tracking No.",
        notShipped: "Not Shipped",
        orderProductName: "Product Name",
        option: "Option",
        deliveryInfo: "Delivery Information",
        recipient: "Recipient",
        phone: "Phone",
        address: "Address",
        deliveryMemo: "Delivery Note",
        paymentInfo: "Payment Information",
        paymentAmount: "Payment Amount",
        shippingCost: "Shipping Cost",
        orderItems: "Order Items ({{count}})",
        warrantyTargetProduct: "Warranty Target Product",
      },
      noOrderInfo: {
        title: "No Order Information",
        description: "No linked order found. Search and link an order below.",
        trackingNumberInput: "Tracking No. (Input)",
        orderDateInput: "Order Date (Input)",
        linkableOrders: "Linkable Orders ({{count}})",
        alreadyLinked: "Already Linked",
        link: "Link",
        searchOrders: "Search Orders",
      },
      warrantyPeriod: {
        title: "Warranty Period",
        startDate: "Start Date",
        endDate: "End Date",
        setAfterApproval: "Set after approval",
      },
      productPhoto: {
        title: "Product Verification Photo",
        uploadedAt: "Uploaded: {{date}}",
      },
      adminActions: {
        title: "Admin Actions",
        approve: "Approve",
        reject: "Reject",
      },
      kakaoNotification: {
        title: "KakaoTalk Notification",
        sent: "Sent",
        sendNotification: "Send Notification",
      },
      logs: {
        title: "Activity Log",
        noLogs: "No activity",
      },
      asHistory: {
        title: "A/S Request History",
      },
      searchDialog: {
        title: "Search Orders",
        description: "Search by tracking number, phone number, order number, or recipient name.",
        placeholder: "Enter search term (min 3 characters)",
        noResults: "No results found.",
        orderNumber: "Order No.",
        recipient: "Recipient",
        tracking: "Tracking",
        alreadyLinked: "Already Linked",
        link: "Link",
      },
      rejectDialog: {
        title: "Reject Warranty",
        description: "Rejecting warranty {{warrantyNumber}}. Enter a reason to inform the customer.",
        placeholder: "Enter rejection reason. (e.g., Product photo is unclear. Please resubmit with a photo showing the entire product.)",
      },
    },

    pendingApproval: {
      title: "Pending Approval",
      subtitle: "{{count}} warranties awaiting approval",
      backToList: "Full List",
      allProcessed: "All warranties have been processed",
      noPending: "No warranties pending approval",
      waiting: "Waiting",
      buyer: "Buyer",
      memberName: "Member Name",
      unverified: "Unverified",
      noProductInfo: "No Product Info",
      noPhoto: "No Photo",
      checkOrderAndApprove: "Check Order & Approve",
      quickApprove: "Quick Approve",
      productAuthPhoto: "Product Verification Photo",
    },
  },

  // Public - Warranty View
  public: {
    view: {
      digitalWarranty: "Digital Warranty Certificate",
      brand: "SUNDAY HUG",
      warrantyNumber: "Warranty Number",
      warrantyPeriod: "Warranty Period",
      remainingDays: "({{days}} days remaining)",
      status: {
        pending: "Pending Approval",
        approved: "Valid",
        rejected: "Rejected",
        expired: "Expired",
      },
      pendingNotice: {
        title: "Under Admin Review",
        description: "Processing within 1-2 business days",
      },
      rejectedNotice: {
        title: "Warranty registration was rejected",
        reason: "Reason: {{reason}}",
        reRegister: "Register Again",
      },
      expiredNotice: "Warranty period has expired",
      actions: {
        requestAS: "Request A/S",
        manual: "User Manual",
      },
      contact: "Contact: {{phone}}",
    },

    register: {
      title: "Register Warranty",
      header: "Select a product to register",
      steps: {
        productSelect: "Select Product",
        infoInput: "Enter Info",
        photoUpload: "Upload Photo",
        complete: "Complete",
      },
      productSelection: {
        title: "Select Product",
        description: "Select the product for warranty registration",
        warrantyPeriod: "{{period}} warranty",
        next: "Next: Enter Information",
        notice: {
          title: "Registration Guide",
          item1: "For genuine Sunday Hug product purchasers",
          item2: "Registration requires admin approval",
          item3: "Free A/S available during warranty period after approval",
        },
      },
      buyerInfo: {
        title: "Buyer Information",
        description: "Enter the product buyer information",
        name: "Name",
        namePlaceholder: "Buyer name",
        phone: "Phone",
        phonePlaceholder: "010-1234-5678",
        phoneHint: "Results will be sent via KakaoTalk",
        purchaseDate: "Purchase Date (Optional)",
        next: "Next: Upload Photo",
        notice: {
          title: "Registration Guide",
          item1: "For {{productName}} purchasers",
          item2: "Warranty period: {{period}}",
          item3: "Registration requires admin approval",
          item4: "Results will be sent via KakaoTalk",
        },
      },
      photoUpload: {
        title: "Product Photo",
        description: "Upload a photo showing the actual product",
        infoSummary: "Information Summary",
        applicant: "Applicant",
        phone: "Phone",
        selectPhoto: "Select Photo",
        fileFormats: "JPG, PNG, WEBP, HEIC (max 5MB)",
        tips: {
          title: "Photo Tips",
          tip1: "Capture the entire product",
          tip2: "Take in bright conditions for clarity",
          tip3: "Product label visible is a plus",
        },
        previous: "Previous",
        submit: "Register Warranty",
        uploading: "Registering...",
      },
      complete: {
        title: "Registration Complete!",
        description: "Your warranty registration has been submitted.",
        notificationInfo: "Results will be sent via <strong>KakaoTalk</strong> after admin review.",
        receiptNumber: "Receipt Number",
        processingTime: "Processing within 1-2 business days",
        approvalBenefit: "Free A/S for 1 year after approval",
        backToHome: "Back to Home",
      },
      navigation: {
        home: "Home",
        previous: "Back",
      },
      errors: {
        namePhoneRequired: "Please enter name and phone number.",
        photoRequired: "Please upload a product photo.",
        fileTooLarge: "File size must be 5MB or less.",
        unsupportedFormat: "Only JPG, PNG, WEBP, HEIC formats are supported.",
        selectPhoto: "Please select a photo.",
        uploadFailed: "Photo upload failed. Please try again.",
        networkError: "Please check your network connection.",
        serverError: "A server error occurred.",
      },
    },
  },

  // Kakao login
  kakao: {
    processing: "Processing Kakao login...",
  },
} as const;
