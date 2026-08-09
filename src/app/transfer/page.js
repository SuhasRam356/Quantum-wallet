"use client";

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, stringToHex } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export default function TransferPage() {
  const [mode, setMode] = useState('send');
  const [amount, setAmount] = useState('');
  const [toAddress, setToAddress] = useState('');
  
  const { data: hash, error, isPending, writeContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleTransfer = () => {
    if (!amount || !toAddress) {
      alert("Please enter a valid amount and recipient address.");
      return;
    }
    
    // Construct the mock post-quantum signature
    const mockPqcSignature = stringToHex("mock_pqc_signature_" + Date.now());

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'executeTransaction',
      args: [
        toAddress, // target
        parseEther(amount), // value
        "0x", // empty data
        mockPqcSignature // mocked post-quantum signature bytes
      ],
    });
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Asset</label>
          <select style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '1rem', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
            <option>Bitcoin (BTC)</option>
            <option>Ethereum (ETH)</option>
            <option>Quantum Token (QNT)</option>
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
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>Max: 2.45 BTC</span>
          </div>
          <div style={{ position: 'relative' }}>
            <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '1.25rem', fontWeight: 600, outline: 'none' }} />
            <span style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--text-secondary)' }}>ETH</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Network Fee (Est.)</span>
            <span style={{ fontWeight: 500 }}>0.00042 ETH</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="text-muted">Security Level</span>
            <span style={{ fontWeight: 500, color: '#00ff88' }}>Post-Quantum (QKD)</span>
          </div>
        </div>

        <button className="btn-primary" onClick={handleTransfer} disabled={isPending || isConfirming} style={{ padding: '16px', fontSize: '1.1rem', marginTop: '1rem' }}>
          {isPending ? 'Confirming in Wallet...' : isConfirming ? 'Waiting for block confirmation...' : 'Execute Transaction'}
        </button>

        {isConfirmed && <div style={{ color: '#00ff88', textAlign: 'center', marginTop: '1rem' }}>Transaction Confirmed! Hash: {hash?.slice(0,10)}...</div>}
        {error && <div style={{ color: '#ff4444', textAlign: 'center', marginTop: '1rem' }}>Error: {error.shortMessage || error.message}</div>}

      </div>

    </div>
  );
}
