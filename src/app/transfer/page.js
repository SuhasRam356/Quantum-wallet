"use client";

import { useState } from 'react';
import { useBalance, useSignMessage, useAccount } from 'wagmi';
import { parseEther, formatEther, keccak256, toHex } from 'viem';
import { useSmartWallet } from '@/hooks/useSmartWallet';

export default function TransferPage() {
  const [mode, setMode] = useState('send');
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState('');
  
  // Status tracking
  const [signingStatus, setSigningStatus] = useState(''); 
  const [txHash, setTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { smartWalletAddress, isLoading: isWalletLoading } = useSmartWallet();

  // Fetch the Smart Contract's Balance
  const { data: contractBalance } = useBalance({ address: smartWalletAddress });
  
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
    
    if (!smartWalletAddress) {
      alert("Smart Wallet address not computed yet.");
      return;
    }
    
    setErrorMsg(null);
    setTxHash(null);

    try {
      // Step 1: Load the PQC keypair
      const { getStoredKeypair, signPayload, bytesToHex } = await import('@/utils/pqcKeyManager');
      const keypair = getStoredKeypair();
      
      if (!keypair) {
        alert("No PQC keypair found! Please generate one on the Keys page first.");
        return;
      }
      
      const pubKeyBytes = new Uint8Array(
        keypair.publicKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      const pqcPubKeyHash = keccak256(toHex(pubKeyBytes));

      setSigningStatus('preparing');

      // Step 2: Prepare UserOp from Bundler API
      const prepRes = await fetch('/api/bundler/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: smartWalletAddress,
          target: toAddress,
          value: parseEther(amount).toString(),
          data: "0x",
          owner: connectedAddress,
          pqcPubKeyHash: pqcPubKeyHash
        }),
      });
      const prepResult = await prepRes.json();

      if (!prepRes.ok) {
        throw new Error(prepResult.error || "Failed to prepare UserOp");
      }

      const { userOp, userOpHash } = prepResult;

      // Step 3: ECDSA Sign via MetaMask (standard ERC-4337 auth)
      setSigningStatus('ecdsa_signing');
      const userOpHashBytes = new Uint8Array(
        (userOpHash.startsWith('0x') ? userOpHash.slice(2) : userOpHash)
          .match(/.{1,2}/g).map(byte => parseInt(byte, 16))
      );
      
      const ecdsaSignature = await signMessageAsync({
        message: { raw: userOpHashBytes }
      });
      userOp.signature = ecdsaSignature;

      // Step 4: ML-DSA Sign (Cryptographic Binding to UserOp)
      setSigningStatus('pqc_signing');
      const pqcSignatureHex = await signPayload(userOpHashBytes);

      // Step 5: Submit to Bundler / Oracle
      setSigningStatus('submitting');
      const submitRes = await fetch('/api/bundler/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userOp,
          pqcSignature: pqcSignatureHex,
          pqcPublicKey: keypair.publicKey,
        }),
      });
      const submitResult = await submitRes.json();

      if (!submitRes.ok) {
        throw new Error(submitResult.error || "Failed to submit UserOp");
      }

      setSigningStatus('success');
      setTxHash(submitResult.txHash);
      
    } catch (err) {
      console.error('Transfer failed:', err);
      setSigningStatus('failed');
      setErrorMsg(err.message);
    }
  };

  if (isWalletLoading) {
     return <div style={{ textAlign: 'center', padding: '4rem' }}>Computing personalized smart wallet address...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <h1 className="heading-lg">Transfer Funds</h1>
        <p className="text-muted">Send and receive digital assets using hybrid post-quantum security via ERC-4337.</p>
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
                <strong>Insufficient Smart Wallet Balance.</strong> Deposit funds via the &apos;Receive&apos; tab first!
              </div>
            )}

            {/* AA / PQC Signing Status */}
            {signingStatus && (
              <div style={{ 
                padding: '12px', 
                borderRadius: '8px',
                border: `1px solid ${signingStatus === 'success' ? '#00ff88' : signingStatus === 'failed' ? '#ff4444' : 'var(--accent-purple)'}`,
                background: signingStatus === 'success' ? 'rgba(0, 255, 136, 0.05)' : signingStatus === 'failed' ? 'rgba(255, 68, 68, 0.05)' : 'rgba(112, 0, 255, 0.05)',
                display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'
              }}>
                {signingStatus === 'preparing' && <span>⚡ Building UserOperation...</span>}
                {signingStatus === 'ecdsa_signing' && <span>🦊 Sign UserOpHash in MetaMask...</span>}
                {signingStatus === 'pqc_signing' && <span>🔐 Post-Quantum Co-signing (ML-DSA)...</span>}
                {signingStatus === 'submitting' && <span>📡 Verifying & Submitting to EntryPoint...</span>}
                {signingStatus === 'success' && <span style={{ color: '#00ff88' }}>✓ Transaction Executed</span>}
                {signingStatus === 'failed' && <span style={{ color: '#ff4444' }}>✗ Failed: {errorMsg}</span>}
              </div>
            )}

            <button 
              className="btn-primary" 
              onClick={handleTransfer} 
              disabled={hasInsufficientContractBalance() || ['preparing', 'ecdsa_signing', 'pqc_signing', 'submitting'].includes(signingStatus)} 
              style={{ 
                padding: '16px', 
                fontSize: '1.1rem', 
                marginTop: '0.5rem',
                background: hasInsufficientContractBalance() ? 'gray' : 'var(--gradient-glow)',
                cursor: hasInsufficientContractBalance() ? 'not-allowed' : 'pointer'
              }}
            >
              {signingStatus === 'preparing' ? '⚡ Preparing...'
                : signingStatus === 'ecdsa_signing' ? '🦊 Waiting for Wallet...' 
                : signingStatus === 'pqc_signing' ? '🔐 PQC Signing...'
                : signingStatus === 'submitting' ? '📡 Submitting...'
                : 'Sign & Execute AA Transaction'}
            </button>

            {txHash && (
              <div style={{ color: '#00ff88', textAlign: 'center', marginTop: '1rem' }}>
                Transaction Confirmed! <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" style={{color: '#00ff88', textDecoration: 'underline'}}>View on Explorer</a>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '2rem 0' }}>
            <h3 className="heading-md">Your Smart Wallet Address</h3>
            <p className="text-muted" style={{ textAlign: 'center' }}>
              To use the Quantum Smart Wallet to send funds, you must deposit funds into its smart contract. Send Sepolia ETH to the address below.
            </p>
            <div style={{ padding: '16px', background: 'rgba(0,255,136,0.1)', border: '1px solid #00ff88', borderRadius: '8px', color: '#00ff88', fontFamily: 'monospace', fontSize: '1.1rem', overflowWrap: 'anywhere' }}>
              {smartWalletAddress}
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>This is the address of the deployed smart contract, not your connected MetaMask wallet.</p>
          </div>
        )}

      </div>
    </div>
  );
}
