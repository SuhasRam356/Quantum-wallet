"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { useSmartWallet } from '@/hooks/useSmartWallet';
import PerformanceChart from '@/components/PerformanceChart';

import AssetAllocation from '@/components/AssetAllocation';

export default function Dashboard() {
  const { address } = useAccount();
  const { smartWalletAddress } = useSmartWallet();
  
  const { data: userBalance } = useBalance({ address: smartWalletAddress });
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch static portfolio data from original REST API
        const resRest = await fetch('/api/wallet');
        const jsonData = await resRest.json();

        if (address) {
          if (!smartWalletAddress) return; // Wait until smart wallet address is ready

          // Fetch real-time activity from our local activity store
          const resActivity = await fetch(`/api/activity?address=${smartWalletAddress}`);
          const activityData = await resActivity.json();
          
          if (activityData.activities && activityData.activities.length > 0) {
            jsonData.recentTransactions = activityData.activities.map(tx => {
              const isReceived = tx.target.toLowerCase() === smartWalletAddress.toLowerCase();
              return {
                type: tx.type || (isReceived ? (tx.sender === 'Auto-Fund Relayer' ? 'Auto-Fund Received' : 'Received ETH') : 'Sent ETH'),
                amount: isReceived ? 
                  `+${parseFloat(tx.amount).toFixed(4)}` : 
                  `-${parseFloat(tx.amount).toFixed(4)}`,
                date: new Date(tx.timestamp).toLocaleString(),
                status: 'completed'
              };
            });
          }

          // --- Calculate Real-Time Historical Balance ---
          const currentEth = userBalance ? parseFloat(formatEther(userBalance.value)) : 0;
          const mockEthPrice = 3450;
          const sortedActivities = [...(activityData.activities || [])].sort((a,b) => b.timestamp - a.timestamp);
          
          const chartData = [];
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          
          for (let i = 6; i >= 0; i--) {
            const targetTime = now - (i * oneDay);
            const dayName = new Date(targetTime).toLocaleDateString('en-US', { weekday: 'short' });
            
            let historicalEth = currentEth;
            for (const tx of sortedActivities) {
               if (tx.timestamp > targetTime) {
                  const isReceived = tx.target.toLowerCase() === smartWalletAddress.toLowerCase();
                  const amt = parseFloat(tx.amount);
                  if (isReceived) {
                     historicalEth -= amt;
                  } else {
                     historicalEth += amt;
                  }
               }
            }
            
            // Add slight synthetic price variance for visual realism
            const randomVariance = 1 + (Math.sin(i * 1.5) * 0.03); 
            const historicalPrice = mockEthPrice * randomVariance;
            
            chartData.push({
               name: dayName,
               balance: Math.max(0, parseFloat((historicalEth * historicalPrice).toFixed(2))),
            });
          }
          jsonData.performanceData = chartData;

          // --- Compute Asset Allocation ---
          const ethValue = parseFloat((currentEth * mockEthPrice).toFixed(2));
          jsonData.assets = [
            { name: 'Ethereum (ETH)', value: ethValue },
            { name: 'Mock USD (mUSD)', value: 1250.00 }, // Mock tokens for PoC UI
            { name: 'Quantum (QNT)', value: 450.00 },
          ];

          // Compute 24h Change properly
          if (chartData.length >= 2) {
            const todayBal = chartData[6].balance;
            const ydayBal = chartData[5].balance;
            if (ydayBal > 0) {
              const diff = ((todayBal - ydayBal) / ydayBal) * 100;
              jsonData.change24h = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
            } else if (todayBal > 0) {
               jsonData.change24h = '+100.00%';
            } else {
               jsonData.change24h = '+0.00%';
            }
          }

        } else {
          jsonData.recentTransactions = [{ type: 'Please connect wallet', amount: '', date: '', status: '' }];
          jsonData.performanceData = [];
          jsonData.assets = [];
        }

        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [address, smartWalletAddress, userBalance]);

  const handleFundGas = async () => {
    if (!address) {
      alert("Please connect your wallet first!");
      return;
    }
    setFunding(true);
    try {
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const json = await res.json();
      if (json.success) {
        alert("Success! Beamed 0.005 ETH to your wallet.");
      } else {
        alert("Failed to fund: " + json.error);
      }
    } catch (err) {
      alert("Error funding wallet.");
    }
    setFunding(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading dashboard data...</div>;
  }

  // Compute total USD value
  const totalUsdValue = data?.assets?.reduce((sum, asset) => sum + asset.value, 0) || 0;

  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
        <div>
          <h1 className="heading-lg">Welcome back, User</h1>
          <p className="text-muted">Here is your portfolio overview</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-muted">Total Portfolio Value</p>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '4px' }}>
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
              {userBalance ? parseFloat(formatEther(userBalance.value)).toFixed(4) : '0.0000'} ETH
            </span>
            <button className="btn-glow-small" onClick={handleFundGas} disabled={funding}>
              {funding ? 'Funding...' : 'Auto-Fund Gas'}
            </button>
          </div>
          <p style={{ color: (data.change24h || '').startsWith('+') ? '#00ff88' : '#ff4444', fontWeight: 600, marginTop: '8px', fontSize: '1.1rem' }}>
            {data.change24h || '+0.00%'} (24h)
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-cols-3 action-cards">
        <Link href="/transfer" style={{ textDecoration: 'none' }}>
          <div className="glass-card flex-center interactive-card" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
            <div className="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </div>
            <span style={{ fontWeight: 600 }}>Send</span>
          </div>
        </Link>
        <Link href="/transfer" style={{ textDecoration: 'none' }}>
          <div className="glass-card flex-center interactive-card" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
            <div className="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            </div>
            <span style={{ fontWeight: 600 }}>Receive</span>
          </div>
        </Link>
        <Link href="/vault" style={{ textDecoration: 'none' }}>
          <div className="glass-card flex-center interactive-card" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
            <div className="icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <span style={{ fontWeight: 600 }}>Buy / Sell</span>
          </div>
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-grid">
        
        {/* Chart / Performance */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="heading-md">Performance</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'var(--surface)', borderRadius: '8px', marginTop: '1rem', padding: '1rem 1rem 0 0' }}>
            <PerformanceChart data={data.performanceData} />
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="heading-md">Asset Allocation</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'var(--surface)', borderRadius: '8px', marginTop: '1rem', padding: '1rem' }}>
            <AssetAllocation data={data.assets} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card activity-card">
          <h3 className="heading-md">Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            
            {data.recentTransactions && data.recentTransactions.length > 0 ? (
              data.recentTransactions.map((tx, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: i === data.recentTransactions.length - 1 ? 'none' : '1px solid var(--surface-border)' }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{tx.type}</p>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>{tx.date}</p>
                  </div>
                  <div style={{ fontWeight: 600, color: tx.amount.startsWith('+') ? '#00ff88' : 'white' }}>
                    {tx.amount}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                No recent activity found on this network.
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
