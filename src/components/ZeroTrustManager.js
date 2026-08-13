"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const ZeroTrustContext = createContext();

export function useZeroTrust() {
  return useContext(ZeroTrustContext);
}

export function ZeroTrustManager({ children }) {
  const { address } = useAccount();
  const [sessionActive, setSessionActive] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Expiry in ms (e.g., 5 minutes = 300000ms. For PoC, let's make it 30 seconds for quick testing, but realistic is 5m)
  const SESSION_TIMEOUT = 5 * 60 * 1000; 

  useEffect(() => {
    if (!address) {
      setSessionActive(false);
      return;
    }

    // Check if session exists in storage
    const lastAuth = localStorage.getItem('quantum_zt_last_auth');
    if (lastAuth && (Date.now() - parseInt(lastAuth)) < SESSION_TIMEOUT) {
      setSessionActive(true);
    } else {
      setSessionActive(false);
      setShowVerificationModal(true);
    }

    // Set interval to check session
    const interval = setInterval(() => {
      const authTime = localStorage.getItem('quantum_zt_last_auth');
      if (address && (!authTime || (Date.now() - parseInt(authTime)) >= SESSION_TIMEOUT)) {
        setSessionActive(false);
        setShowVerificationModal(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [address]);

  const handleVerify = async () => {
    const pwd = window.prompt("Zero-Trust Verification: Enter your Keystore Password");
    if (!pwd) return;

    setVerifying(true);
    try {
      const { getStoredKeypair, signPayload } = await import('@/utils/pqcKeyManager');
      const keypair = getStoredKeypair();
      
      if (!keypair) {
        alert("No PQC keys found. Please generate keys first.");
        setVerifying(false);
        return;
      }

      // We sign a random nonce to prove we hold the key
      const nonce = crypto.getRandomValues(new Uint8Array(16));
      
      // Override window.prompt temporarily to inject the password for signPayload
      const originalPrompt = window.prompt;
      window.prompt = () => pwd;
      
      await signPayload(nonce); // If it succeeds, password was correct
      
      window.prompt = originalPrompt; // Restore

      localStorage.setItem('quantum_zt_last_auth', Date.now().toString());
      setSessionActive(true);
      setShowVerificationModal(false);
      alert("Zero-Trust Session Authenticated.");
    } catch (e) {
      console.error(e);
      alert("Verification failed: " + e.message);
    }
    setVerifying(false);
  };

  return (
    <ZeroTrustContext.Provider value={{ sessionActive, requireVerification: () => setShowVerificationModal(true) }}>
      {children}
      
      {showVerificationModal && address && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card" style={{ maxWidth: 400, textAlign: 'center', border: '1px solid #ff0055' }}>
            <div style={{ color: '#ff0055', marginBottom: '1rem' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h2 className="heading-md">Zero-Trust Verification Required</h2>
            <p className="text-muted" style={{ marginTop: '1rem', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Your session has expired or requires continuous authentication. Please cryptographically prove your identity using your Post-Quantum Keystore.
            </p>
            <button 
              className="btn-primary" 
              onClick={handleVerify}
              disabled={verifying}
              style={{ width: '100%', background: '#ff0055', borderColor: '#ff0055' }}
            >
              {verifying ? 'Verifying...' : 'Authenticate'}
            </button>
          </div>
        </div>
      )}
    </ZeroTrustContext.Provider>
  );
}
