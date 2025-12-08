/**
 * Sleep Analysis Utility Functions
 * 
 * Shared utilities that can be used on both client and server.
 */

/**
 * Calculate age in months from birth date
 */
export function calculateAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - birth.getFullYear()) * 12;
  months -= birth.getMonth();
  months += today.getMonth();
  return months <= 0 ? 0 : months;
}

/**
 * Extract base64 and MIME type from data URL
 */
export function parseDataUrl(dataUrl: string): {
  base64: string;
  mimeType: string;
} {
  if (dataUrl.startsWith("data:")) {
    const matches = dataUrl.match(/data:([^;]+);base64,(.+)/);
    if (matches) {
      return {
        mimeType: matches[1],
        base64: matches[2],
      };
    }
  }

  // Assume raw base64 with default MIME type
  return {
    base64: dataUrl,
    mimeType: "image/jpeg",
  };
}



