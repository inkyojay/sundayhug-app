/**
 * Server-side environment configuration
 * All sensitive values must come from environment variables.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  kakao: {
    /** Customer app Kakao Client ID */
    clientId: () => requireEnv("KAKAO_CLIENT_ID"),
    /** Customer app Kakao Client Secret */
    clientSecret: () => requireEnv("KAKAO_CLIENT_SECRET"),
    /** Warranty Kakao Client ID (separate app) */
    warrantyClientId: () => requireEnv("KAKAO_WARRANTY_CLIENT_ID"),
    /** Warranty Kakao Client Secret */
    warrantyClientSecret: () => requireEnv("KAKAO_WARRANTY_CLIENT_SECRET"),
  },
  solapi: {
    senderNumber: () => optionalEnv("SOLAPI_SENDER_NUMBER", "07077038005"),
  },
} as const;
