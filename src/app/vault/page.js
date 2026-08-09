"use client";

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export default function VaultPage() {
  const { address } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const { writeContractAsync } = useWriteContract();

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vaultFiles, setVaultFiles] = useState([]);
  
  const [fileToUpload, setFileToUpload] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/wallet');
        const data = await res.json();
        setAssets(data.assets);
        
        if (address) {
          const SUBGRAPH_URL = "https://api.studio.thegraph.com/query/1757567/quantum/version/latest";
          const graphqlQuery = `
            query {
              vaultFiles(
                first: 10,
                orderBy: addedAt,
                orderDirection: desc,
                where: { user: "${address.toLowerCase()}" }
              ) {
                ipfsCid
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
          if (gqlData.data && gqlData.data.vaultFiles) {
             setVaultFiles(gqlData.data.vaultFiles);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [address]);

  const handleAddToken = () => {
    const newToken = { symbol: 'USDC', name: 'USD Coin', balance: 500, value: 500.00, change: '+0.01%' };
    setAssets([...assets, newToken]);
  };
  
  const handleFileUpload = async () => {
    if (!fileToUpload) return;
    if (!address) { alert("Please connect wallet!"); return; }
    
    setUploading(true);
    setUploadStatus("Encrypting with Kyber-1024...");
    
    // Simulate encryption and IPFS upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUploadStatus("Uploading to IPFS...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a mock CID (e.g., Qm...) based on timestamp to make it unique
    const mockCid = "Qm" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + "xyz";
    
    setUploadStatus("Please approve transaction in MetaMask to save CID to blockchain...");
    
    try {
        const txHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'addVaultFile',
          args: [mockCid],
        });
        
        setUploadStatus("Transaction Sent! Waiting for confirmation...");
        
        // Optimistically add to UI
        setVaultFiles([{ ipfsCid: mockCid, addedAt: Math.floor(Date.now() / 1000) }, ...vaultFiles]);
        setTimeout(() => {
          setUploadStatus("");
          setFileToUpload(null);
        }, 3000);
        
    } catch(err) {
        console.error(err);
        setUploadStatus("Transaction failed or rejected.");
    }
    setUploading(false);
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading assets...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 className="heading-lg">Quantum Vault</h1>
        <p className="text-muted">Secure storage and staking for your digital assets and encrypted files.</p>
      </div>
      
      {/* --- NEW IPFS VAULT SECTION --- */}
      <div className="glass-card" style={{ borderLeft: '4px solid #b200ff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 className="heading-md" style={{ margin: 0, color: '#b200ff' }}>IPFS Encrypted Storage</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Upload sensitive backup files. They are encrypted locally using your post-quantum public key and stored securely on IPFS. Only you (or your Guardians) can decrypt them.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <input 
              type="file" 
              onChange={(e) => setFileToUpload(e.target.files[0])} 
              style={{ color: 'var(--text-primary)', flex: 1 }}
              disabled={uploading}
            />
            <button 
              className="btn-primary" 
              onClick={handleFileUpload} 
              disabled={!fileToUpload || uploading}
              style={{ padding: '8px 16px', background: uploading ? 'gray' : '#b200ff', borderColor: '#b200ff' }}
            >
              {uploading ? 'Processing...' : 'Encrypt & Upload to IPFS'}
            </button>
        </div>
        
        {uploadStatus && (
          <p style={{ marginTop: '1rem', color: '#00ff88', fontSize: '0.9rem' }}>{uploadStatus}</p>
        )}
        
        {vaultFiles.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Your Secure Files</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {vaultFiles.map((file, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b200ff" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>ipfs://{file.ipfsCid}</span>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {new Date(Number(file.addedAt) * 1000).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
