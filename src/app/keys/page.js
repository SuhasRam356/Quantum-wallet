"use client";

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract } from 'wagmi';
import { keccak256 } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export default function KeysPage() {
  const [keypair, setKeypair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    // Load stored keypair on mount
    async function loadKeypair() {
      const { getStoredKeypair } = await import('@/utils/pqcKeyManager');
      const stored = getStoredKeypair();
      setKeypair(stored);
      setLoading(false);
    }
    loadKeypair();
  }, []);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const { generateKeypair } = await import('@/utils/pqcKeyManager');
      const newKeypair = await generateKeypair();
      setKeypair(newKeypair);
    } catch (err) {
      console.error('Key generation failed:', err);
      alert('Key generation failed: ' + err.message);
    }
    setGenerating(false);
  };

  const registerOnChain = async () => {
    if (!keypair || !isConnected) return;
    setRegistering(true);
    try {
      // Compute keccak256 hash of the public key bytes
      const pubKeyHash = keccak256(keypair.publicKey);
      
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'setPqcPublicKeyHash',
        args: [pubKeyHash],
      });
      alert('PQC public key hash committed on-chain!');
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed: ' + err.message);
    }
    setRegistering(false);
  };

  const testSignAndVerify = async () => {
    if (!keypair) return;
    setVerifyResult(null);
    try {
      const { signPayload, bytesToHex } = await import('@/utils/pqcKeyManager');
      
      // Create a test message
      const testMessage = 'Quantum Wallet test signature ' + Date.now();
      const messageHex = bytesToHex(new TextEncoder().encode(testMessage));
      
      // Sign it with the real ML-DSA-65 private key
      const signatureHex = await signPayload(testMessage);
      
      // Verify it server-side via the API
      const res = await fetch('/api/verify-pqc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageHex,
          signature: signatureHex,
          publicKey: keypair.publicKey,
        }),
      });
      const result = await res.json();
      setVerifyResult(result);
    } catch (err) {
      console.error('Sign/verify test failed:', err);
      setVerifyResult({ valid: false, error: err.message });
    }
  };

  const revokeKey = async () => {
    const { clearKeypair } = await import('@/utils/pqcKeyManager');
    clearKeypair();
    setKeypair(null);
    setVerifyResult(null);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading key manager...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="heading-lg">Key Management</h1>
        <p className="text-muted">Generate and manage real ML-DSA-65 (FIPS-204) post-quantum cryptographic keys.</p>
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Generate Key Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '300px' }}>
            <div style={{ background: 'var(--gradient-glow)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>
            <h3 className="heading-md">{keypair ? 'Key Active' : 'Generate ML-DSA Key'}</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
              {keypair 
                ? 'Your ML-DSA-65 keypair is ready. Register it on-chain to enable quantum-safe transactions.'
                : 'Create a real FIPS-204 ML-DSA-65 post-quantum keypair. The private key stays in your browser.'}
            </p>
            {!keypair ? (
              <button className="btn-primary" onClick={generateKey} disabled={generating}>
                {generating ? 'Generating ML-DSA-65 Keypair...' : 'Generate ML-DSA Keypair'}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-primary" onClick={registerOnChain} disabled={registering || !isConnected}>
                  {registering ? 'Committing Hash...' : 'Register On-Chain'}
                </button>
                <button className="btn-secondary" onClick={testSignAndVerify}>
                  Test Sign & Verify
                </button>
              </div>
            )}
          </div>

          {/* Web3 Relayer Card */}
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <h3 className="heading-md" style={{ marginBottom: '1rem' }}>Web3 Relayer</h3>
            {isConnected ? (
              <div>
                <p style={{ color: '#00ff88', marginBottom: '0.5rem' }}>Connected: {address?.slice(0,6)}...{address?.slice(-4)}</p>
                <button className="btn-secondary" onClick={() => disconnect()}>Disconnect</button>
              </div>
            ) : (
              <div>
                <p className="text-muted" style={{ marginBottom: '1rem' }}>Connect a standard EVM wallet to act as your relayer for PQC transactions.</p>
                {connectors.map((connector) => (
                  <button key={connector.uid} className="btn-primary" onClick={() => connect({ connector })}>
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Key Details */}
        <div className="glass-card">
          <h3 className="heading-md">Active Key Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            
            {keypair ? (
              <>
                {/* Key Info */}
                <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600 }}>ML-DSA-65</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', borderRadius: '4px' }}>Active</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>FIPS-204 • Lattice-Based • Security Level 3</div>
                </div>

                {/* Public Key Fingerprint */}
                <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Public Key Fingerprint</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#00ff88', wordBreak: 'break-all' }}>
                    {keypair.publicKey.slice(0, 66)}...
                  </div>
                </div>

                {/* Key Hash (for on-chain commitment) */}
                <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>On-Chain Hash Commitment</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-purple)', wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? (() => { try { return keccak256(keypair.publicKey); } catch { return 'N/A'; } })() : 'N/A'}
                  </div>
                </div>

                {/* Created At */}
                <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Created</div>
                  <div style={{ fontSize: '0.9rem' }}>{new Date(keypair.createdAt).toLocaleString()}</div>
                </div>

                {/* Verify Result */}
                {verifyResult && (
                  <div style={{ 
                    padding: '1rem', 
                    background: verifyResult.valid ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255, 68, 68, 0.05)', 
                    border: `1px solid ${verifyResult.valid ? '#00ff88' : '#ff4444'}`, 
                    borderRadius: '12px' 
                  }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Signature Verification Result
                    </div>
                    <div style={{ fontWeight: 600, color: verifyResult.valid ? '#00ff88' : '#ff4444' }}>
                      {verifyResult.valid ? '✓ ML-DSA-65 Signature Valid' : '✗ Verification Failed'}
                    </div>
                    {verifyResult.algorithm && (
                      <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                        Algorithm: {verifyResult.algorithm}
                      </div>
                    )}
                  </div>
                )}

                {/* Revoke Button */}
                <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={revokeKey}>
                  Revoke & Delete Key
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <p>No active PQC keypair.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Generate an ML-DSA-65 keypair to get started.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

