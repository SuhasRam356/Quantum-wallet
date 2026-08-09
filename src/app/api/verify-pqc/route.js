/**
 * POST /api/verify-pqc
 * 
 * Server-side ML-DSA-65 signature verification.
 * This is the REAL cryptographic verification layer.
 * 
 * Accepts: { message: string (hex), signature: string (hex), publicKey: string (hex) }
 * Returns: { valid: boolean, algorithm: string, error?: string }
 */

export async function POST(req) {
  try {
    const { message, signature, publicKey } = await req.json();

    if (!message || !signature || !publicKey) {
      return Response.json({ 
        valid: false, 
        error: 'Missing required fields: message, signature, publicKey' 
      }, { status: 400 });
    }

    // Dynamic import of @noble/post-quantum
    const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa');

    // Convert hex strings to Uint8Arrays
    const hexToBytes = (hex) => {
      const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
      const bytes = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) {
        bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
      }
      return bytes;
    };

    const messageBytes = hexToBytes(message);
    const signatureBytes = hexToBytes(signature);
    const publicKeyBytes = hexToBytes(publicKey);

    // REAL ML-DSA-65 (FIPS-204) signature verification
    const isValid = ml_dsa65.verify(signatureBytes, messageBytes, publicKeyBytes);

    console.log(`[PQC Verify] Algorithm: ML-DSA-65 | Valid: ${isValid} | PubKey: ${publicKey.slice(0, 16)}...`);

    return Response.json({ 
      valid: isValid, 
      algorithm: 'ML-DSA-65 (FIPS-204)',
      pubKeyFingerprint: publicKey.slice(0, 16) + '...',
    });
  } catch (error) {
    console.error('[PQC Verify] Error:', error);
    return Response.json({ 
      valid: false, 
      error: error.message 
    }, { status: 500 });
  }
}
