export type Translation = {
  home: {
    title: string;
    subtitle: string;
  };
  navigation: {
    en: string;
    kr: string;
    es: string;
  };
  errors: {
    general: {
      unknown: string;
      network: string;
      server: string;
      timeout: string;
      unauthorized: string;
      forbidden: string;
      notFound: string;
      maintenance: string;
      tryAgain: string;
    };
    http: {
      400: string;
      401: string;
      403: string;
      404: string;
      408: string;
      429: string;
      500: string;
      502: string;
      503: string;
      504: string;
    };
    validation: {
      required: string;
      email: string;
      phone: string;
      password: string;
      passwordMatch: string;
      minLength: string;
      maxLength: string;
      number: string;
      date: string;
      file: {
        size: string;
        type: string;
      };
    };
    auth: {
      loginRequired: string;
      sessionExpired: string;
      invalidCredentials: string;
      accountLocked: string;
      emailNotVerified: string;
    };
    permission: {
      denied: string;
      camera: string;
      microphone: string;
      location: string;
      storage: string;
      notification: string;
    };
    actions: {
      retry: string;
      goBack: string;
      goHome: string;
      login: string;
      contact: string;
      refresh: string;
    };
    notFound: {
      title: string;
      description: string;
      suggestions: string[];
    };
    error: {
      title: string;
      errorCode: string;
    };
    serverError: {
      title: string;
      description: string;
    };
    maintenance: {
      title: string;
      description: string;
      estimatedTime: string;
    };
  };
};
