"use client";

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';

export default function VaultPage() {
  const { address } = useAccount();
  const { data: balanceData } = useBalance({ address });

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/wallet');
        const data = await res.json();
        setAssets(data.assets);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const handleAddToken = () => {
    const newToken = { symbol: 'USDC', name: 'USD Coin', balance: 500, value: 500.00, change: '+0.01%' };
    setAssets([...assets, newToken]);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading assets...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="heading-lg">Quantum Vault</h1>
        <p className="text-muted">Secure storage and staking for your digital assets.</p>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 className="heading-md" style={{ margin: 0 }}>Your Assets</h3>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={handleAddToken}>
            + Add Custom Token
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Asset</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Balance</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>Value (USD)</th>
              <th style={{ padding: '1rem', fontWeight: 500 }}>24h Change</th>
            </tr>
          </thead>
          <tbody>
            {balanceData && (
              <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      E
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>ETH</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>Sepolia Ether</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{parseFloat(formatEther(balanceData.value)).toFixed(4)}</td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>--</td>
                <td style={{ padding: '1rem', fontWeight: 500, color: '#00ff88' }}>Live on-chain</td>
              </tr>
            )}
            {assets.map((asset, i) => (
              <tr key={i} style={{ borderBottom: i === assets.length - 1 ? 'none' : '1px solid var(--surface-border)' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {asset.symbol[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{asset.symbol}</div>
                      <div className="text-muted" style={{ fontSize: '0.85rem' }}>{asset.name}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{asset.balance}</td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '1rem', fontWeight: 500, color: asset.change.startsWith('+') ? '#00ff88' : '#ff4444' }}>
                  {asset.change}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
