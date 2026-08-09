/**
 * PQC Key Manager — Real ML-DSA-65 (FIPS-204) Post-Quantum Cryptography
 * 
 * Uses @noble/post-quantum to generate real lattice-based keypairs,
 * sign transaction payloads, and export keys for on-chain commitment.
 * 
 * The private key is stored in browser localStorage. In a production
 * wallet this would use a hardware security module or encrypted storage.
 */

const STORAGE_KEY = 'quantum_wallet_pqc_keypair';

/**
 * Dynamically imports the ML-DSA-65 module from @noble/post-quantum.
 * We use dynamic import because this is a client-side ES module.
 */
async function getMlDsa() {
  const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa');
  return ml_dsa65;
}

/**
 * Converts a Uint8Array to a hex string (with 0x prefix).
 */
function bytesToHex(bytes) {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts a hex string (with or without 0x prefix) to a Uint8Array.
 */
function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Generates a new ML-DSA-65 keypair and stores it in localStorage.
 * Returns the public key as a hex string.
 */
export async function generateKeypair() {
  const ml_dsa65 = await getMlDsa();
  
  const privateKey = ml_dsa65.utils.randomPrivateKey();
  const publicKey = ml_dsa65.getPublicKey(privateKey);
  
  const keypair = {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
    algorithm: 'ML-DSA-65',
    standard: 'FIPS-204',
    createdAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keypair));
  
  return keypair;
}

/**
 * Retrieves the stored keypair from localStorage.
 * Returns null if no keypair exists.
 */
export function getStoredKeypair() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return JSON.parse(stored);
}

/**
 * Returns the public key as a hex string (0x-prefixed).
 * Returns null if no keypair is stored.
 */
export function getPublicKeyHex() {
  const keypair = getStoredKeypair();
  return keypair ? keypair.publicKey : null;
}

/**
 * Returns the public key as a Uint8Array for passing to contract calls.
 */
export function getPublicKeyBytes() {
  const hex = getPublicKeyHex();
  return hex ? hexToBytes(hex) : null;
}

/**
 * Signs a message (Uint8Array or string) with the stored ML-DSA-65 private key.
 * Returns the signature as a hex string.
 */
export async function signPayload(message) {
  const ml_dsa65 = await getMlDsa();
  const keypair = getStoredKeypair();
  
  if (!keypair) {
    throw new Error('No PQC keypair found. Please generate one first on the Keys page.');
  }
  
  const privateKeyBytes = hexToBytes(keypair.privateKey);
  
  // Convert message to Uint8Array if it's a string
  const messageBytes = typeof message === 'string' 
    ? new TextEncoder().encode(message)
    : message;
  
  const signature = ml_dsa65.sign(messageBytes, privateKeyBytes);
  
  return bytesToHex(signature);
}

/**
 * Verifies a signature client-side (for testing/display purposes).
 * Real verification happens server-side via /api/verify-pqc.
 */
export async function verifySignature(message, signatureHex, publicKeyHex) {
  const ml_dsa65 = await getMlDsa();
  
  const messageBytes = typeof message === 'string' 
    ? new TextEncoder().encode(message)
    : message;
  const signatureBytes = hexToBytes(signatureHex);
  const publicKeyBytes = hexToBytes(publicKeyHex);
  
  return ml_dsa65.verify(signatureBytes, messageBytes, publicKeyBytes);
}

/**
 * Clears the stored keypair from localStorage.
 */
export function clearKeypair() {
  localStorage.removeItem(STORAGE_KEY);
}

export { bytesToHex, hexToBytes };
