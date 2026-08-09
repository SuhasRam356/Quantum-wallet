# Quantum Wallet: Next-Gen Crypto Interface 🌌

Welcome to **Quantum Wallet**, a next-generation decentralized application (dApp) that demonstrates how Web3 wallets can be secured against future quantum computing threats.

If you are new to blockchain or cryptography, don't worry! This guide will explain exactly what this project is and how to run it.

---

## 📖 What is Quantum Wallet?

Standard cryptocurrency wallets rely on traditional cryptography (like ECDSA) to secure your funds. However, future quantum computers will be powerful enough to crack these traditional locks. 

**Quantum Wallet** is a proof-of-concept that explores a solution:
1. **The Smart Wallet:** Instead of a standard account, your funds are held inside a programmable Smart Contract.
2. **Post-Quantum Security:** We simulate a process where transactions are only approved if they are signed using **Post-Quantum Cryptography (ML-DSA)**, a new mathematical standard designed to be unbreakable even by supercomputers.
3. **The Relayer System:** Because quantum signatures are large, the user connects a standard MetaMask wallet (the "Relayer") to pay the network fees, while the Smart Wallet safely holds the actual funds.

---

## 🌟 Key Features
- **Live Testnet Integration:** Fully deployed and interacting with the real Ethereum Sepolia Testnet.
- **Real-Time Blockchain Indexing:** Uses **The Graph Protocol** to read transaction history directly from the blockchain instantly.
- **Stunning UI:** Built with **Next.js** and **React**, featuring a beautiful dark-mode, glassmorphic design, and interactive performance charts.
- **Dynamic Security Logs:** Tracks your wallet connections and transaction history in real-time.

---

## 🛠️ How to Run the Project Locally

Follow these step-by-step instructions to run the Quantum Wallet on your own computer.

### Step 1: Prerequisites
You will need to install a few standard developer tools:
- **Node.js** (v18 or higher)
- **MetaMask** (A browser extension wallet)
- An account on [Alchemy](https://www.alchemy.com/) (to connect to the blockchain)
- An account on [The Graph Studio](https://thegraph.com/studio/) (for transaction data)

### Step 2: Install Dependencies
Open your terminal, clone this repository, and install the required packages for both the frontend and the subgraph:
```bash
# Install frontend dependencies
npm install

# Install subgraph dependencies
cd subgraph
npm install
cd ..
```

### Step 3: Configure Environment Variables
Create a file named `.env` in the root folder of the project. Add your Alchemy API URL and your MetaMask Private Key (ensure it has some Sepolia test ETH):
```env
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY"
SEPOLIA_PRIVATE_KEY="your_metamask_private_key"
```

### Step 4: Start the Application
You are ready to go! Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser. 

*Make sure your MetaMask is set to the **Sepolia** network, connect your wallet, and enjoy the Quantum Wallet!*

---

## ⚙️ Advanced: Deploying Your Own Contracts & Subgraph
If you want to deploy your own version of the Smart Contract and data indexer rather than using the pre-deployed ones:

**1. Deploy the Smart Contract:**
```bash
node scripts/deploySepolia.mjs
```
*(Copy the new contract address and update it inside `src/utils/constants.js` and `subgraph/subgraph.yaml`)*

**2. Deploy the Subgraph to The Graph Studio:**
```bash
cd subgraph
npx graph auth --studio <YOUR_DEPLOY_KEY>
npm run codegen
npm run build
npx graph deploy --studio quantum-wallet --version-label 0.0.1
```
*(Update the GraphQL URL in `src/app/security/page.js` to your new Subgraph URL)*
