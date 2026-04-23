/**
 * Phone Number Normalization
 *
 * Converts any Kenyan phone number format to E.164: +2547XXXXXXXX
 * 
 * Supported input formats:
 *   0712345678       → +254712345678
 *   +254712345678    → +254712345678
 *   254712345678     → +254712345678
 *   712345678        → +254712345678
 *   07 1234 5678     → +254712345678  (spaces stripped)
 */

/**
 * Strip all non-digit characters except leading +
 */
function stripNonDigits(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  return trimmed.replace(/\D/g, '');
}

/**
 * Normalize a Kenyan phone number to E.164 format (+2547XXXXXXXX).
 * Returns null if the input is not a valid Kenyan mobile number.
 */
export function normalizePhone(raw: string): string | null {
  const cleaned = stripNonDigits(raw);

  let digits: string;

  if (cleaned.startsWith('+254')) {
    digits = cleaned.slice(4); // Remove +254
  } else if (cleaned.startsWith('254')) {
    digits = cleaned.slice(3); // Remove 254
  } else if (cleaned.startsWith('0')) {
    digits = cleaned.slice(1); // Remove leading 0
  } else if (/^[17]\d{8}$/.test(cleaned)) {
    // Already just the 9 digits starting with 7 or 1
    digits = cleaned;
  } else {
    return null;
  }

  // Kenyan mobile numbers: 9 digits starting with 7, 1, or occasionally other prefixes
  if (!/^\d{9}$/.test(digits)) {
    return null;
  }

  // Valid Kenyan mobile prefixes: 7XX, 1XX
  if (!/^[71]/.test(digits)) {
    return null;
  }

  return `+254${digits}`;
}

/**
 * Validate that a string is a properly formatted Kenyan E.164 number.
 */
export function isValidKenyanPhone(phone: string): boolean {
  return /^\+254[71]\d{8}$/.test(phone);
}

/**
 * Mask a phone number for display: +254712***678
 */
export function maskPhone(phone: string): string {
  if (!isValidKenyanPhone(phone)) return '***';
  return phone.slice(0, 7) + '***' + phone.slice(10);
}
