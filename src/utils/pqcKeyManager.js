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

// --- Encrypted Storage Helpers ---
async function getDerivedKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptPrivateKeys(privateKeysObj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getDerivedKey(password, salt);
  const enc = new TextEncoder();
  const encoded = enc.encode(JSON.stringify(privateKeysObj));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoded
  );

  return {
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    salt: bytesToHex(salt),
    iv: bytesToHex(iv)
  };
}

async function decryptPrivateKeys(encryptedData, password) {
  const { ciphertext, salt, iv } = encryptedData;
  const key = await getDerivedKey(password, hexToBytes(salt));
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(iv) },
      key,
      hexToBytes(ciphertext)
    );
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
  } catch (e) {
    throw new Error("Invalid password or corrupted keystore.");
  }
}


export async function generateKeypair(password = "quantum_secure") {
  // Mock FALCON-512 sizes
  const privateKey = new Uint8Array(1281); // standard Falcon-512 sk size
  const publicKey = new Uint8Array(897);   // standard Falcon-512 pk size
  
  // 1. Fetch QRNG Entropy (Simulated for PoC via ANU QRNG or fallback)
  let qrngEntropy = new Uint8Array(32);
  try {
    const res = await fetch('https://qrng.anu.edu.au/API/jsonI.php?length=32&type=uint8');
    const data = await res.json();
    if (data && data.data) {
      qrngEntropy = new Uint8Array(data.data);
    } else {
      crypto.getRandomValues(qrngEntropy);
    }
  } catch (e) {
    console.warn("QRNG fetch failed, falling back to local CSPRNG");
    crypto.getRandomValues(qrngEntropy);
  }

  // 2. Mix QRNG with local entropy to seed key generation
  crypto.getRandomValues(privateKey);
  crypto.getRandomValues(publicKey);
  for(let i=0; i<32; i++) {
    privateKey[i] ^= qrngEntropy[i];
    publicKey[i] ^= qrngEntropy[i];
  }

  // Real ML-KEM-768 Keys for Hybrid Encryption
  const { ml_kem768 } = await import('@noble/post-quantum/ml-kem.js');
  const kemKeys = ml_kem768.keygen();
  
  const privateKeysObj = {
    privateKey: bytesToHex(privateKey),
    mlKemPrivateKey: bytesToHex(kemKeys.secretKey),
  };

  // Encrypt private keys with PBKDF2 + AES-GCM
  const encryptedPayload = await encryptPrivateKeys(privateKeysObj, password);

  const keypair = {
    publicKey: bytesToHex(publicKey),
    mlKemPublicKey: bytesToHex(kemKeys.publicKey),
    encryptedData: encryptedPayload,
    algorithm: 'FALCON-512',
    standard: 'NIST',
    createdAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keypair));
  return keypair;
}

export function saveKeypair(keypair) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keypair));
}

export async function proactiveKeyRotation(oldPassword, newPassword = "quantum_secure") {
  const oldKeypair = getStoredKeypair();
  if (!oldKeypair) throw new Error("No existing keypair to rotate.");

  // Decrypt old keys to retrieve old ML-KEM private key
  const oldDecryptedKeys = await decryptPrivateKeys(oldKeypair.encryptedData, oldPassword);

  // Generate new keys (reusing logic from generateKeypair)
  const privateKey = new Uint8Array(1281);
  const publicKey = new Uint8Array(897);
  crypto.getRandomValues(privateKey);
  crypto.getRandomValues(publicKey);

  const { ml_kem768 } = await import('@noble/post-quantum/ml-kem.js');
  const kemKeys = ml_kem768.keygen();
  
  const privateKeysObj = {
    privateKey: bytesToHex(privateKey),
    mlKemPrivateKey: bytesToHex(kemKeys.secretKey),
  };

  const encryptedPayload = await encryptPrivateKeys(privateKeysObj, newPassword);

  const newKeypair = {
    publicKey: bytesToHex(publicKey),
    mlKemPublicKey: bytesToHex(kemKeys.publicKey),
    encryptedData: encryptedPayload,
    algorithm: 'FALCON-512',
    standard: 'NIST',
    createdAt: new Date().toISOString(),
  };

  return {
    oldDecryptedKeys,
    oldKeypair,
    newDecryptedKeys: privateKeysObj,
    newKeypair
  };
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

  // Request password to decrypt the keystore
  let pwd = window.prompt("Enter your Keystore Password to sign transaction:");
  if (!pwd) {
    console.warn("Browser blocked the prompt or user cancelled. Using default PoC password.");
    pwd = "quantum_secure";
  }

  let decryptedKeys;
  try {
    decryptedKeys = await decryptPrivateKeys(keypair.encryptedData, pwd);
  } catch (e) {
    throw new Error("Failed to decrypt keys. " + e.message);
  }
  
  // Falcon-512 signature is ~666 bytes
  const signature = new Uint8Array(666);
  crypto.getRandomValues(signature);
  
  // To make the mock precompile verification work predictably for testing,
  // we embed the keccak256 hash of the message in the first 32 bytes of the signature.
  // The mock precompile will check this to "verify" the signature.
  const { hashMessage } = await import('viem');
  const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  const hashHex = hashMessage({ raw: messageBytes });
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

