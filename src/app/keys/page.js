"use client";

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function KeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/keys');
        const data = await res.json();
        setKeys(data.activeKeys);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/keys', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setKeys([...keys, data.newKey]);
      }
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  const revokeKey = (id) => {
    setKeys(keys.filter(k => k.id !== id));
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading active keys...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="heading-lg">Key Management</h1>
        <p className="text-muted">Manage your quantum-resistant cryptographic keys and active sessions.</p>
      </div>

      <div className="grid-cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '300px' }}>
            <div style={{ background: 'var(--gradient-glow)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>
            <h3 className="heading-md">Generate New Key</h3>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Create a new post-quantum cryptographic key pair for enhanced security.</p>
            <button className="btn-primary" onClick={generateKey} disabled={generating}>
              {generating ? 'Generating via QKD...' : 'Generate Q-Key'}
            </button>
          </div>

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

        <div className="glass-card">
          <h3 className="heading-md">Active Keys</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            {keys.map((key) => (
              <div key={key.id} style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{key.id}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: key.status === 'Active' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 255, 255, 0.1)', color: key.status === 'Active' ? '#00ff88' : 'white', borderRadius: '4px' }}>{key.status}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>{key.type} • {key.algorithm}</div>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => revokeKey(key.id)}>Revoke</button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
