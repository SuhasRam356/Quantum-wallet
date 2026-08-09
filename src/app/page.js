"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '@/utils/constants';
import PerformanceChart from '@/components/PerformanceChart';

export default function Dashboard() {
  const { address } = useAccount();
  
  const { data: userBalance } = useBalance({ address });
  
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
          // Fetch real blockchain logs from the LIVE Subgraph!
          const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/1757567/quantum/version/latest";
          const graphqlQuery = `
            query {
              transactions(
                first: 5,
                orderBy: blockNumber,
                orderDirection: desc,
                where: { address: "${address.toLowerCase()}" }
              ) {
                type
                amount
                date
                status
              }
            }
          `;
          
          const resGql = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: graphqlQuery })
          });
          
          const gqlData = await resGql.json();
          
          // Merge Live Subgraph data into the dashboard state
          if (gqlData.data && gqlData.data.transactions) {
            jsonData.recentTransactions = gqlData.data.transactions.map(tx => ({
              type: tx.type,
              amount: tx.type.includes("Received") ? 
                `+${parseFloat(formatEther(tx.amount)).toFixed(2)}` : 
                `-${parseFloat(formatEther(tx.amount)).toFixed(2)}`,
              date: new Date(Number(tx.date) * 1000).toLocaleString(),
              status: tx.status
            }));
          }
        } else {
          jsonData.recentTransactions = [{ type: 'Please connect wallet', amount: '', date: '', status: '' }];
        }

        setData(jsonData);
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [address]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="heading-lg">Welcome back, User</h1>
          <p className="text-muted">Here is your portfolio overview</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-muted">Wallet Balance (ETH)</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 700 }}>
            {userBalance ? parseFloat(formatEther(userBalance.value)).toFixed(4) : '0.0000'} ETH
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '4px' }}>
            <button onClick={handleFundGas} disabled={funding} style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
              {funding ? 'Funding...' : 'Auto-Fund Gas'}
            </button>
          </div>
          <p style={{ color: data.change24h.startsWith('+') ? '#00ff88' : '#ff4444', fontWeight: 600, marginTop: '8px' }}>
            {data.change24h} (24h)
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-cols-3">
        <Link href="/transfer" style={{ textDecoration: 'none' }}>
          <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '50%' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </div>
            <span style={{ fontWeight: 600 }}>Send</span>
          </div>
        </Link>
        <Link href="/transfer" style={{ textDecoration: 'none' }}>
          <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '50%' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
            </div>
            <span style={{ fontWeight: 600 }}>Receive</span>
          </div>
        </Link>
        <Link href="/vault" style={{ textDecoration: 'none' }}>
          <div className="glass-card flex-center" style={{ flexDirection: 'column', gap: '1rem', padding: '1.5rem', cursor: 'pointer', height: '100%' }}>
            <div style={{ background: 'var(--surface-hover)', padding: '12px', borderRadius: '50%' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            </div>
            <span style={{ fontWeight: 600 }}>Buy / Sell</span>
          </div>
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="grid-cols-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
        
        {/* Chart / Performance (Mock) */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 className="heading-md">Performance</h3>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', background: 'var(--surface)', borderRadius: '8px', marginTop: '1rem', padding: '1rem 1rem 0 0' }}>
            <PerformanceChart />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card">
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
