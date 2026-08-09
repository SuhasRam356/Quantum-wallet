"use client";

import Link from 'next/link';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
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
  );
}
