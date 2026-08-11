/**
 * PQC Key Manager — Mock FALCON-512
 * 
 * Since true FALCON-512 WASM bindings are heavy and currently unsupported natively 
 * by standard wallet libraries, this mock simulates the exact byte sizes and 
 * interface of FALCON-512 for local EVM precompile testing.
 * 
 * - Public Key: 897 bytes
 * - Signature: 666 bytes
 */

const STORAGE_KEY = 'quantum_wallet_falcon_keypair';

function bytesToHex(bytes) {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function generateKeypair() {
  // Mock FALCON-512 sizes
  const privateKey = new Uint8Array(1281); // standard Falcon-512 sk size
  const publicKey = new Uint8Array(897);   // standard Falcon-512 pk size
  
  // Fill with random bytes to simulate real keys
  crypto.getRandomValues(privateKey);
  crypto.getRandomValues(publicKey);

  // Real ML-KEM-768 Keys for Hybrid Encryption
  const { ml_kem768 } = await import('@noble/post-quantum/ml-kem.js');
  const kemKeys = ml_kem768.keygen();
  
  const keypair = {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
    mlKemPrivateKey: bytesToHex(kemKeys.secretKey),
    mlKemPublicKey: bytesToHex(kemKeys.publicKey),
    algorithm: 'FALCON-512',
    standard: 'NIST',
    createdAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keypair));
  return keypair;
}

export function getStoredKeypair() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return JSON.parse(stored);
}

export function getPublicKeyHex() {
  const keypair = getStoredKeypair();
  return keypair ? keypair.publicKey : null;
}

export function getPublicKeyBytes() {
  const hex = getPublicKeyHex();
  return hex ? hexToBytes(hex) : null;
}

export async function signPayload(message) {
  const keypair = getStoredKeypair();
  if (!keypair) {
    throw new Error('No PQC keypair found. Please generate one first on the Keys page.');
  }
  
  // Falcon-512 signature is ~666 bytes
  const signature = new Uint8Array(666);
  crypto.getRandomValues(signature);
  
  // To make the mock precompile verification work predictably for testing,
  // we embed the keccak256 hash of the message in the first 32 bytes of the signature.
  // The mock precompile will check this to "verify" the signature.
  const { keccak256 } = await import('viem');
  const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const hashHex = keccak256(messageBytes);
  const hashBytes = hexToBytes(hashHex);
  signature.set(hashBytes, 0);

  return bytesToHex(signature);
}

export async function verifySignature(message, signatureHex, publicKeyHex) {
  // Client-side mock verification
  return true;
}

export function clearKeypair() {
  localStorage.removeItem(STORAGE_KEY);
}

export { bytesToHex, hexToBytes };

