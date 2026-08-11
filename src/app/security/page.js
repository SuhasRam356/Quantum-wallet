"use client";

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { formatEther } from 'ethers';
import { useSmartWallet } from '@/hooks/useSmartWallet';

export default function SecurityPage() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { smartWalletAddress } = useSmartWallet();
  
  const [loading, setLoading] = useState(true);
  const [guardians, setGuardians] = useState([]);
  const [newGuardian, setNewGuardian] = useState("");
  const [addingGuardian, setAddingGuardian] = useState(false);
  
  // Real settings from localStorage
  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('quantum_security_settings');
      if (savedSettings) return JSON.parse(savedSettings);
    }
    return {
      biometricEnabled: false,
      twoFactorEnabled: false,
      quantumProtectionLevel: 'Maximum (Kyber-1024)'
    };
  });
  
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Removed setSettings to avoid cascading renders

    async function fetchRealLogs() {
      try {
        let dynamicLogs = [];
        
        if (address) {
          dynamicLogs.push({
            id: 'login',
            event: 'Successful Wallet Connection',
            detail: `Address: ${address.slice(0,6)}...${address.slice(-4)}`,
            time: new Date().toLocaleString(),
            status: 'Success'
          });
        }

        if (address) {
          const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/1757567/quantum/version/latest";
          const graphqlQuery = `
            query {
              transactions(
                first: 10,
                orderBy: blockNumber,
                orderDirection: desc,
                where: { address: "${address.toLowerCase()}" }
              ) {
                id
                type
                amount
                date
              }
              guardians(
                first: 5,
                orderBy: addedAt,
                orderDirection: desc,
                where: { user: "${address.toLowerCase()}" }
              ) {
                guardianAddress
                addedAt
              }
            }
          `;
          
          const resGql = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: graphqlQuery })
          });
          
          const gqlData = await resGql.json();
          
          if (gqlData.data && gqlData.data.transactions) {
            const txLogs = gqlData.data.transactions.map(tx => ({
              id: tx.id,
              event: tx.type === 'Sent ETH' ? 'Transaction Signed' : 'Transaction Received',
              detail: `${tx.type === 'Sent ETH' ? 'Sent' : 'Received'} ${parseFloat(formatEther(tx.amount)).toFixed(4)} ETH`,
              time: new Date(Number(tx.date) * 1000).toLocaleString(),
              status: 'Success'
            }));
            dynamicLogs = [...dynamicLogs, ...txLogs];
          }
          
          if (gqlData.data && gqlData.data.guardians) {
            setGuardians(gqlData.data.guardians);
          }
        }
        
        const savedLogs = JSON.parse(localStorage.getItem('quantum_security_logs') || '[]');
        setLogs([...savedLogs, ...dynamicLogs]);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
    fetchRealLogs();
  }, [address]);

  const toggleBiometric = () => {
    const newStatus = !settings.biometricEnabled;
    const newSettings = { ...settings, biometricEnabled: newStatus };
    setSettings(newSettings);
    localStorage.setItem('quantum_security_settings', JSON.stringify(newSettings));
    
    const newLog = {
      id: Date.now(),
      event: `Biometric Login ${newStatus ? 'Enabled' : 'Disabled'}`,
      detail: 'Updated via Settings',
      time: new Date().toLocaleString(),
      status: 'Info'
    };
    
    const savedLogs = JSON.parse(localStorage.getItem('quantum_security_logs') || '[]');
    localStorage.setItem('quantum_security_logs', JSON.stringify([newLog, ...savedLogs]));
    setLogs(prev => [newLog, ...prev]);
  };
  
  const handleAddGuardian = async () => {
    if(!newGuardian) return;
    if(!address) { alert("Connect wallet first!"); return; }
    if(!smartWalletAddress) { alert("Smart wallet not ready."); return; }
    
    setAddingGuardian(true);
    try {
      const { Interface } = await import('ethers');
      const iface = new Interface(["function addGuardian(address guardian)"]);
      const rawCallData = iface.encodeFunctionData("addGuardian", [newGuardian]);

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
      userOp.signature = await signMessageAsync({ message: { raw: hashBytes } });

      const { signPayload, getStoredKeypair } = await import('@/utils/pqcKeyManager');
      const keypair = getStoredKeypair();
      if (!keypair) throw new Error("No PQC keypair. Generate one on the Keys page.");
      const pqcSig = await signPayload(hashBytes);

      const submitRes = await fetch('/api/bundler/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userOp, pqcSignature: pqcSig, pqcPublicKey: keypair.publicKey }),
      });
      const submitResult = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitResult.error);

      alert("Guardian added via EntryPoint!");
      setGuardians([{ guardianAddress: newGuardian, addedAt: Math.floor(Date.now()/1000) }, ...guardians]);
      setNewGuardian("");
    } catch (err) {
      console.error(err);
      alert("Failed to add guardian: " + err.message);
    }
    setAddingGuardian(false);
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading real-time security data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="heading-lg">Security & Settings</h1>
        <p className="text-muted">Manage your wallet&apos;s defense mechanisms and security logs.</p>
      </div>

      <div className="grid-cols-2">
        
        {/* Security Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card">
            <h3 className="heading-md">Authentication</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Biometric Login</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Use Fingerprint or FaceID</div>
                </div>
                
                {/* Interactive Toggle */}
                <div 
                  onClick={toggleBiometric}
                  style={{ 
                    width: 48, height: 24, 
                    background: settings.biometricEnabled ? 'var(--accent-cyan)' : 'var(--surface-border)', 
                    borderRadius: 12, position: 'relative', cursor: 'pointer',
                    transition: 'background 0.3s ease'
                  }}
                >
                  <div style={{ 
                    width: 20, height: 20, background: 'white', borderRadius: '50%', 
                    position: 'absolute', top: 2, 
                    left: settings.biometricEnabled ? 26 : 2,
                    transition: 'left 0.3s ease'
                  }}></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* NEW SOCIAL RECOVERY SECTION */}
          <div className="glass-card" style={{ borderLeft: '4px solid #ff0055' }}>
            <h3 className="heading-md" style={{ color: '#ff0055' }}>Quantum Social Recovery</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
              Add trusted guardian addresses. If you ever lose your post-quantum private key, these guardians can collaborate to decrypt your IPFS vault backups.
            </p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                placeholder="0x... Guardian Address" 
                value={newGuardian}
                onChange={(e) => setNewGuardian(e.target.value)}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.3)', color: 'white' }}
              />
              <button 
                className="btn-primary" 
                onClick={handleAddGuardian} 
                disabled={addingGuardian}
                style={{ background: '#ff0055', borderColor: '#ff0055', padding: '8px 16px' }}
              >
                {addingGuardian ? 'Adding...' : 'Add'}
              </button>
            </div>
            
            {guardians.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ color: 'var(--text-secondary)' }}>Trusted Guardians:</h4>
                {guardians.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '4px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{g.guardianAddress}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card">
            <h3 className="heading-md">Quantum Resistance</h3>
            <div style={{ padding: '16px', background: 'rgba(112, 0, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(112, 0, 255, 0.3)', marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <div>
                  <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>{settings.quantumProtectionLevel} Active</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your wallet is currently using {settings.quantumProtectionLevel.split(' ')[1] || 'advanced'} encryption algorithms, protecting your assets against quantum computer attacks.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Security Logs */}
        <div className="glass-card">
          <h3 className="heading-md">Real-Time Security Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', maxHeight: '500px', overflowY: 'auto' }}>
            
            {logs.length === 0 ? (
              <div className="text-muted">No security logs found.</div>
            ) : (
              logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: i === logs.length - 1 ? 'none' : '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.status === 'Warning' ? '#ff4444' : log.status === 'Info' ? 'var(--accent-cyan)' : '#00ff88', marginTop: 6, flexShrink: 0 }}></div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{log.event}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>{log.detail}</div>
                    </div>
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{log.time}</div>
                </div>
              ))
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
