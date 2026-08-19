"use client";

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useState, useEffect } from 'react';
import { useSmartWallet } from '@/hooks/useSmartWallet';

export default function NavBar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { smartWalletAddress } = useSmartWallet();
  
  const [mounted, setMounted] = useState(false);
  const [identity, setIdentity] = useState(null);
  
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [newIdentityCid, setNewIdentityCid] = useState("");
  const [updatingIdentity, setUpdatingIdentity] = useState(false);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  
  useEffect(() => {
    async function fetchIdentity() {
      if (address) {
        try {
          const ethers = require('ethers');
          const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545');
          if (smartWalletAddress) {
            const abi = ['function userIdentity() view returns (string)'];
            const contract = new ethers.Contract(smartWalletAddress, abi, provider);
            try {
              const id = await contract.userIdentity();
              if (id) setIdentity(id);
            } catch(e) {
              // Not deployed yet or no identity
            }
          }
        } catch(e) {
            console.error(e);
        }
      } else {
        setIdentity(null);
      }
    }
    fetchIdentity();
  }, [address, smartWalletAddress]);

  const handleUpdateIdentity = async () => {
    if (!newIdentityCid) return;
    if (!smartWalletAddress) { alert("Smart wallet not ready."); return; }
    setUpdatingIdentity(true);
    try {
      const { Interface } = await import('ethers');
      const iface = new Interface(["function setIdentity(string cid)"]);
      const rawCallData = iface.encodeFunctionData("setIdentity", [newIdentityCid]);

      const prepRes = await fetch('/api/bundler/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: smartWalletAddress, rawCallData, owner: address }),
      });
      const prepResult = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepResult.error);
      const { userOp, userOpHash } = prepResult;

      const hashBytes = new Uint8Array(
        (userOpHash.startsWith('0x') ? userOpHash.slice(2) : userOpHash)
          .match(/.{1,2}/g).map(b => parseInt(b, 16))
      );
      let ecdsaSig = await signMessageAsync({ message: { raw: hashBytes } });
      
      // Normalize v value for OpenZeppelin ECDSA.recover
      // MetaMask sometimes returns v=00 or 01, OpenZeppelin expects 1b (27) or 1c (28)
      if (ecdsaSig.endsWith('00')) {
        ecdsaSig = ecdsaSig.slice(0, -2) + '1b';
      } else if (ecdsaSig.endsWith('01')) {
        ecdsaSig = ecdsaSig.slice(0, -2) + '1c';
      }
      userOp.signature = ecdsaSig;
      const { signPayload, getStoredKeypair } = await import('@/utils/pqcKeyManager');
      const keypair = getStoredKeypair();
      if (!keypair) {
        alert("No PQC keypair. Please generate one on the Keys page first.");
        setUpdatingIdentity(false);
        return;
      }
      const pqcSig = await signPayload(hashBytes);

      const submitRes = await fetch('/api/bundler/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userOp, pqcSignature: pqcSig, pqcPublicKey: keypair.publicKey }),
      });
      const submitResult = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitResult.error);

      alert("Identity updated via EntryPoint!");
      setIdentity(newIdentityCid);
      setShowIdentityModal(false);
      setNewIdentityCid("");
    } catch(e) {
      console.error(e);
      alert("Failed to update identity: " + e.message);
    }
    setUpdatingIdentity(false);
  };

  return (
    <>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2rem',
        background: 'rgba(9, 10, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--surface-border)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <Link href="/">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--gradient-glow)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
            }}>Q</div>
            <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.03em' }}>Quantum Wallet</span>
          </div>
        </Link>
        
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link href="/vault" className="text-muted" style={{ transition: 'color 0.2s', fontWeight: 500 }}>Vault</Link>
          <Link href="/keys" className="text-muted" style={{ transition: 'color 0.2s', fontWeight: 500 }}>Keys</Link>
          <Link href="/transfer" className="text-muted" style={{ transition: 'color 0.2s', fontWeight: 500 }}>Transfer</Link>
          <Link href="/security" className="text-muted" style={{ transition: 'color 0.2s', fontWeight: 500 }}>Security</Link>
          
          {(mounted && isConnected) && (
            <button
              onClick={() => setShowIdentityModal(true)}
              style={{
                background: 'rgba(112, 0, 255, 0.2)',
                border: '1px solid var(--accent-purple)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {identity ? `ID: ${identity.slice(0,6)}...` : 'Set Identity'}
            </button>
          )}

          <button 
            className="btn-primary" 
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.9rem', 
              background: (mounted && isConnected) ? '#00ff88' : 'var(--gradient-glow)', 
              color: (mounted && isConnected) ? 'black' : 'white' 
            }}
            onClick={() => (mounted && isConnected) ? disconnect() : connect({ connector: connectors[0] })}
          >
            {(mounted && isConnected) ? `Connected: ${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </nav>
      
      {showIdentityModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: 400 }}>
            <h3 className="heading-md">Decentralized Identity</h3>
            <p className="text-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
              Link an IPFS CID containing your profile data (avatar, display name) to your quantum wallet address.
            </p>
            {identity && (
              <p style={{ marginBottom: '1rem', color: '#00ff88', wordBreak: 'break-all', fontSize: '0.85rem' }}>
                Current Identity: ipfs://{identity}
              </p>
            )}
            <input 
              type="text" 
              placeholder="IPFS CID (e.g. Qm...)" 
              value={newIdentityCid}
              onChange={(e) => setNewIdentityCid(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: 'white', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowIdentityModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateIdentity} disabled={updatingIdentity || !newIdentityCid}>
                {updatingIdentity ? 'Updating...' : 'Set Identity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
