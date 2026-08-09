import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

export async function GET() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  let recentTransactions = [];

  try {
    // Fetch Executed events
    const executedFilter = contract.filters.Executed();
    const executedEvents = await contract.queryFilter(executedFilter, 0, 'latest');
    
    // Fetch Deposited events
    const depositedFilter = contract.filters.Deposited();
    const depositedEvents = await contract.queryFilter(depositedFilter, 0, 'latest');

    // Process Executed events
    for (const event of executedEvents) {
      const block = await event.getBlock();
      const date = new Date(block.timestamp * 1000).toLocaleString();
      recentTransactions.push({
        type: 'Sent ETH',
        amount: `-${ethers.formatEther(event.args.value)}`,
        date: date,
        status: 'completed',
        blockNumber: event.blockNumber
      });
    }

    // Process Deposited events
    for (const event of depositedEvents) {
      const block = await event.getBlock();
      const date = new Date(block.timestamp * 1000).toLocaleString();
      recentTransactions.push({
        type: 'Received ETH',
        amount: `+${ethers.formatEther(event.args.amount)}`,
        date: date,
        status: 'completed',
        blockNumber: event.blockNumber
      });
    }

    // Sort by block number descending (most recent first)
    recentTransactions.sort((a, b) => b.blockNumber - a.blockNumber);
    // Take top 5
    recentTransactions = recentTransactions.slice(0, 5);
  } catch (error) {
    console.error("Error fetching logs:", error);
    // Fallback if node is down or contract not deployed
    recentTransactions = [
      { type: 'No Recent Activity', amount: '', date: '', status: '' }
    ];
  }

  if (recentTransactions.length === 0) {
    recentTransactions = [
      { type: 'No Recent Activity', amount: '', date: '', status: '' }
    ];
  }

  const walletData = {
    totalBalance: 124592.45,
    change24h: '+5.24%',
    assets: [
      { symbol: 'BTC', name: 'Bitcoin', balance: 2.45, value: 85420.00, change: '+2.4%' },
      { symbol: 'ETH', name: 'Ethereum', balance: 18.2, value: 34125.00, change: '+5.1%' },
      { symbol: 'QNT', name: 'Quantum Token', balance: 1050, value: 4200.00, change: '+12.4%' },
      { symbol: 'SOL', name: 'Solana', balance: 45.0, value: 847.45, change: '-1.2%' }
    ],
    recentTransactions: recentTransactions
  };

  return NextResponse.json(walletData);
}
