/**
 * Client-side fingerprinting utility.
 * 
 * NOTE: This is used as a secondary fraud detection signal (heuristics), 
 * NOT as a hard security guarantee. Browser fingerprints can change due to 
 * updates, privacy settings, or spoofing. The primary security remains 
 * the OTP verification and HTTP-only session tokens.
 */
export async function generateDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'server-side'; // Should only be run on client
  }

  try {
    const signals = [
      navigator.userAgent,
      screen.width,
      screen.height,
      screen.colorDepth,
      navigator.language,
      navigator.hardwareConcurrency || 'unknown',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ];

    // Optional: Canvas fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('ELP-Voting-FP-v1', 2, 2);
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('ELP-Voting-FP-v1', 4, 17);
      signals.push(canvas.toDataURL());
    }

    const rawString = signals.join('|');
    
    // Hash using Web Crypto API
    const msgBuffer = new TextEncoder().encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Failed to generate device fingerprint:', error);
    // Fallback if crypto fails
    return `fallback-${Date.now()}-${Math.random()}`;
  }
}
