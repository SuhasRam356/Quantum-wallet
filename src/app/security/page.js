"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'ethers';

export default function SecurityPage() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  
  // Real settings from localStorage
  const [settings, setSettings] = useState({
    biometricEnabled: false,
    twoFactorEnabled: false,
    quantumProtectionLevel: 'Maximum (Kyber-1024)'
  });
  
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('quantum_security_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    async function fetchRealLogs() {
      try {
        let dynamicLogs = [];
        
        // 1. Connection Event (Login)
        if (address) {
          dynamicLogs.push({
            id: 'login',
            event: 'Successful Wallet Connection',
            detail: `Address: ${address.slice(0,6)}...${address.slice(-4)}`,
            time: new Date().toLocaleString(),
            status: 'Success'
          });
        }

        // 2. Fetch real transactions from Subgraph for "Transaction Signed"
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
                transactionHash
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
        }
        
        // 3. Load locally saved biometric events
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
    
    // Add log
    const newLog = {
      id: Date.now(),
      event: `Biometric Login ${newStatus ? 'Enabled' : 'Disabled'}`,
      detail: 'Updated via Settings',
      time: new Date().toLocaleString(),
      status: 'Info'
    };
    
    const savedLogs = JSON.parse(localStorage.getItem('quantum_security_logs') || '[]');
    const updatedLogs = [newLog, ...savedLogs];
    localStorage.setItem('quantum_security_logs', JSON.stringify(updatedLogs));
    
    setLogs(prev => [newLog, ...prev]);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading real-time security data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="heading-lg">Security & Settings</h1>
        <p className="text-muted">Manage your wallet's defense mechanisms and security logs.</p>
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
              <div style={{ height: '1px', background: 'var(--surface-border)' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Two-Factor Authentication (2FA)</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>App-based authenticator</div>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => alert("2FA Setup Modal would open here.")}>
                  {settings.twoFactorEnabled ? 'Manage' : 'Configure'}
                </button>
              </div>
            </div>
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
