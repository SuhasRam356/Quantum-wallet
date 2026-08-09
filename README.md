# Quantum Wallet: Next-Gen Crypto Interface 🌌

Quantum Wallet is a cutting-edge, production-grade decentralized application (dApp) designed to demonstrate a post-quantum secure wallet architecture. Built on a modern Web3 stack, it features dynamic Subgraph data indexing, responsive Neumorphic/Glassmorphic design, and seamless Sepolia Testnet integration.

## 🚀 Features & What We Built

### 1. Smart Contract Architecture
- Built a Solidity smart contract (`QuantumSmartWallet.sol`) that simulates a Post-Quantum Keypair verification process (mocking ML-DSA on-chain).
- The wallet uses a Relayer model (ERC-4337 style architecture) where the user pays gas from a standard EOA wallet to execute transactions from the secured Smart Wallet.
- Deployed on the public **Sepolia Testnet**.

### 2. The Graph Protocol Subgraph
- Replaced basic internal APIs with a true decentralized indexing solution using **The Graph Studio**.
- Scaffolded an AssemblyScript subgraph (`subgraph.yaml`, `mapping.ts`) that listens to the `Executed` and `Deposited` events emitted by the smart contract.
- Subgraph is live and indexes the Sepolia Testnet, allowing the frontend to fetch real-time wallet transaction logs using GraphQL.

### 3. Stunning Next.js Dashboard
- Developed a dynamic frontend using **Next.js 14**, **React**, and **Wagmi/viem**.
- Built a premium dark-mode interface featuring glassmorphic cards and neon-cyan/purple accents.
- Integrated **Recharts** to render an interactive, beautiful gradient curve graph representing portfolio performance.
- Connected the UI to **MetaMask** for real-time wallet balance fetching and transaction signing.

### 4. Dynamic Security Logging
- Security & Settings page uses **LocalStorage** to persist user settings (like Biometric Login toggles) and fetches real-time blockchain interactions (via The Graph) to display a comprehensive security audit log.

---

## 🛠️ How to Run This Project From Scratch

If you are cloning this repository for the first time, follow these steps to get everything running locally!

### Prerequisites
- Node.js (v18+)
- MetaMask browser extension
- Alchemy or Infura account (for Sepolia RPC)
- An account on [The Graph Studio](https://thegraph.com/studio/)

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install subgraph dependencies
cd subgraph
npm install
cd ..
```

### 2. Environment Variables
Create a `.env` file in the root directory and add your Sepolia credentials:
```env
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
SEPOLIA_PRIVATE_KEY="your_private_key_with_sepolia_eth"
```

### 3. Deploy the Smart Contract
If you want to deploy your own instance of the QuantumSmartWallet to Sepolia:
```bash
node scripts/deploySepolia.mjs
```
*Note the deployed contract address. Update `src/utils/constants.js` and `subgraph/subgraph.yaml` with this new address.*

### 4. Deploy the Subgraph
Authenticate and deploy your own subgraph instance to The Graph Studio:
```bash
cd subgraph
npx graph auth --studio <YOUR_DEPLOY_KEY>
npm run codegen
npm run build
npx graph deploy --studio quantum-wallet --version-label 0.0.1
```
*Update the `SUBGRAPH_URL` in `src/app/page.js` and `src/app/security/page.js` to point to your new Studio endpoint.*

### 5. Start the Application
Return to the root directory and launch the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Connect your MetaMask wallet, switch to the Sepolia network, and experience the Quantum Wallet!
