import { createYoga, createSchema } from 'graphql-yoga';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/utils/constants';

const typeDefs = `
  type Transaction {
    type: String!
    amount: String!
    date: String!
    status: String!
    blockNumber: Int!
  }

  type Query {
    recentTransactions(address: String!, limit: Int): [Transaction!]!
  }
`;

const resolvers = {
  Query: {
    recentTransactions: async (_, { address, limit }) => {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      let transactions = [];

      try {
        if (!address) return [];

        const executedFilter = contract.filters.Executed();
        const executedEvents = await contract.queryFilter(executedFilter, 0, 'latest');
        
        const depositedFilter = contract.filters.Deposited();
        const depositedEvents = await contract.queryFilter(depositedFilter, 0, 'latest');

        for (const event of executedEvents) {
          const block = await event.getBlock();
          
          // If the target is the user, they received ETH
          if (event.args.target.toLowerCase() === address.toLowerCase()) {
            transactions.push({
              type: 'Received ETH',
              amount: `+${ethers.formatEther(event.args.value)}`,
              date: new Date(block.timestamp * 1000).toLocaleString(),
              status: 'completed',
              blockNumber: event.blockNumber
            });
          }
          
          // If the transaction was submitted by the user's relayer account
          const tx = await event.getTransaction();
          if (tx && tx.from.toLowerCase() === address.toLowerCase()) {
            transactions.push({
              type: 'Sent ETH',
              amount: `-${ethers.formatEther(event.args.value)}`,
              date: new Date(block.timestamp * 1000).toLocaleString(),
              status: 'completed',
              blockNumber: event.blockNumber
            });
          }
        }

        for (const event of depositedEvents) {
          if (event.args.sender.toLowerCase() === address.toLowerCase()) {
            const block = await event.getBlock();
            transactions.push({
              type: 'Sent ETH (Deposited)',
              amount: `-${ethers.formatEther(event.args.amount)}`,
              date: new Date(block.timestamp * 1000).toLocaleString(),
              status: 'completed',
              blockNumber: event.blockNumber
            });
          }
        }

        transactions.sort((a, b) => b.blockNumber - a.blockNumber);
        
        if (limit) {
          transactions = transactions.slice(0, limit);
        }

      } catch (error) {
        console.error("GraphQL Error fetching logs:", error);
      }

      if (transactions.length === 0) {
        transactions = [
          { type: 'No Recent Activity', amount: '', date: '', status: '', blockNumber: 0 }
        ];
      }

      return transactions;
    }
  }
};

const schema = createSchema({
  typeDefs,
  resolvers,
});

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Request, Response },
});

export { handleRequest as GET, handleRequest as POST };
