"use client";

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther, keccak256 } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export default function TransferPage() {
  const [mode, setMode] = useState('send');
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [signingStatus, setSigningStatus] = useState(''); // '', 'signing', 'verifying', 'verified', 'failed'
  
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Fetch the Smart Contract's Balance
  const { data: contractBalance } = useBalance({ address: CONTRACT_ADDRESS });
  
  const hasInsufficientContractBalance = () => {
    if (!contractBalance || !amount) return false;
    try {
        return parseEther(amount) > contractBalance.value;
    } catch {
        return false;
    }
  };

  const handleTransfer = async () => {
    if (!amount || !toAddress) {
      alert("Please enter a valid amount and recipient address.");
      return;
    }

    try {
      // Step 1: Load the PQC keypair
      const { getStoredKeypair, signPayload, bytesToHex } = await import('@/utils/pqcKeyManager');
      const keypair = getStoredKeypair();
      
      if (!keypair) {
        alert("No PQC keypair found! Please generate one on the Keys page first.");
        return;
      }

      // Step 2: Sign the transaction payload with real ML-DSA-65
      setSigningStatus('signing');
      const payload = `transfer:${toAddress}:${amount}:${Date.now()}`;
      const payloadHex = bytesToHex(new TextEncoder().encode(payload));
      const signatureHex = await signPayload(payload);

      // Step 3: Verify the signature server-side (REAL cryptographic verification)
      setSigningStatus('verifying');
      const verifyRes = await fetch('/api/verify-pqc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: payloadHex,
          signature: signatureHex,
          publicKey: keypair.publicKey,
        }),
      });
      const verifyResult = await verifyRes.json();

      if (!verifyResult.valid) {
        setSigningStatus('failed');
        alert("PQC signature verification failed! Transaction aborted.");
        return;
      }

      setSigningStatus('verified');

      // Step 4: Submit the transaction to the smart contract
      // Pass the real public key bytes — the contract will verify keccak256(pubKey) == stored commitment
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'executeTransaction',
        args: [
          toAddress,
          parseEther(amount),
          "0x",
          keypair.publicKey, // Real ML-DSA-65 public key for on-chain hash verification
        ],
      });
    } catch (err) {
      console.error('Transfer failed:', err);
      setSigningStatus('failed');
      alert('Transfer failed: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="heading-lg">Transfer Funds</h1>
        <p className="text-muted">Send and receive digital assets using quantum-safe channels.</p>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', background: 'var(--surface-hover)', padding: '6px', borderRadius: '12px', gap: '8px' }}>
          <button onClick={() => setMode('send')} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: mode === 'send' ? 'var(--surface-border)' : 'transparent', color: mode === 'send' ? 'white' : 'var(--text-secondary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          <button onClick={() => setMode('receive')} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: mode === 'receive' ? 'var(--surface-border)' : 'transparent', color: mode === 'receive' ? 'white' : 'var(--text-secondary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Receive</button>
        </div>

        {mode === 'send' ? (
          <>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', border: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>Smart Wallet Balance</span>
              <span style={{ fontWeight: 600, color: contractBalance?.value > 0 ? '#00ff88' : '#ff4444' }}>
                {contractBalance ? parseFloat(formatEther(contractBalance.value)).toFixed(4) : '0.0000'} ETH
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Asset</label>
              <select style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '1rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                <option>Ethereum (ETH)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Recipient Address</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="text" placeholder="0x..." value={toAddress} onChange={(e) => setToAddress(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '1rem', fontWeight: 500, outline: 'none', marginBottom: '1rem' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Amount</span>
              </div>
              <div style={{ position: 'relative' }}>
                <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '1.25rem', fontWeight: 600, outline: 'none' }} />
                <span style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-secondary)' }}>ETH</span>
              </div>
            </div>

            {hasInsufficientContractBalance() && (
              <div style={{ padding: '12px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', borderRadius: '8px', color: '#ff4444', fontSize: '0.9rem' }}>
                <strong>Insufficient Smart Wallet Balance.</strong> Your Quantum Smart Wallet contract currently has a balance of {contractBalance ? formatEther(contractBalance.value) : '0'} ETH. It cannot send {amount} ETH. Please deposit funds into the Smart Wallet using the 'Receive' tab first!
              </div>
            )}

            {/* PQC Signing Status */}
            {signingStatus && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px',
                border: `1px solid ${signingStatus === 'verified' ? '#00ff88' : signingStatus === 'failed' ? '#ff4444' : 'var(--accent-purple)'}`,
                background: signingStatus === 'verified' ? 'rgba(0, 255, 136, 0.05)' : signingStatus === 'failed' ? 'rgba(255, 68, 68, 0.05)' : 'rgba(112, 0, 255, 0.05)',
                display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
              }}>
                {signingStatus === 'signing' && <span>🔐 Signing payload with ML-DSA-65...</span>}
                {signingStatus === 'verifying' && <span>🔍 Verifying signature server-side (FIPS-204)...</span>}
                {signingStatus === 'verified' && <span style={{ color: '#00ff88' }}>✓ ML-DSA-65 Signature Verified</span>}
                {signingStatus === 'failed' && <span style={{ color: '#ff4444' }}>✗ PQC Signature Verification Failed</span>}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Security Level</span>
                <span style={{ fontWeight: 500, color: '#00ff88' }}>ML-DSA-65 (FIPS-204)</span>
              </div>
            </div>

            <button 
              className="btn-primary" 
              onClick={handleTransfer} 
              disabled={isPending || isConfirming || hasInsufficientContractBalance() || signingStatus === 'signing' || signingStatus === 'verifying'} 
              style={{ 
                padding: '16px', 
                fontSize: '1.1rem', 
                marginTop: '0.5rem',
                background: hasInsufficientContractBalance() ? 'gray' : 'var(--gradient-glow)',
                cursor: hasInsufficientContractBalance() ? 'not-allowed' : 'pointer'
              }}
            >
              {signingStatus === 'signing' ? '🔐 Signing with ML-DSA-65...' 
                : signingStatus === 'verifying' ? '🔍 Verifying PQC Signature...'
                : isPending ? 'Confirming in Wallet...' 
                : isConfirming ? 'Waiting for block confirmation...' 
                : 'Sign & Execute Transaction'}
            </button>

            {isConfirmed && <div style={{ color: '#00ff88', textAlign: 'center', marginTop: '1rem' }}>Transaction Confirmed! Hash: {hash?.slice(0,10)}...</div>}
            {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '1rem' }}>Error: {error.shortMessage || error.message}</div>}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '2rem 0' }}>
            <h3 className="heading-md">Your Smart Wallet Address</h3>
            <p className="text-muted" style={{ textAlign: 'center' }}>
              To use the Quantum Smart Wallet to send funds, you must deposit funds into its smart contract. Send Sepolia ETH to the address below.
            </p>
            <div style={{ padding: '16px', background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', borderRadius: '8px', color: '#00ff88', fontFamily: 'monospace', fontSize: '1.1rem' }}>
              {CONTRACT_ADDRESS}
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>This is the address of the deployed smart contract, not your connected MetaMask wallet.</p>
          </div>
        )}

      </div>
    </div>
  );
}
