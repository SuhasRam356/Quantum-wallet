# Quantum Wallet: The Future of Post-Quantum Web3 Security 🌌

<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Quantum_computing.svg/1024px-Quantum_computing.svg.png" width="150" alt="Quantum Shield"/>
  <br/>
  <h3>A Decentralized Application (dApp) demonstrating post-quantum secure wallet architectures.</h3>
</div>

---

## 📖 Table of Contents
1. [Introduction](#-introduction)
2. [The Quantum Threat](#-the-quantum-threat)
3. [Our Solution](#-our-solution)
4. [Architecture & System Design](#-architecture--system-design)
5. [Technology Stack](#-technology-stack)
6. [Core Features](#-core-features)
7. [Comprehensive Setup Guide](#-comprehensive-setup-guide)
    - [Prerequisites](#prerequisites)
    - [1. Frontend Application Setup](#1-frontend-application-setup)
    - [2. Smart Contract Deployment](#2-smart-contract-deployment)
    - [3. Subgraph Deployment (The Graph)](#3-subgraph-deployment-the-graph)
8. [Usage Guide](#-usage-guide)
9. [Troubleshooting & FAQ](#-troubleshooting--faq)
10. [Roadmap](#-roadmap)
11. [License](#-license)

---

## 🌟 Introduction

Welcome to **Quantum Wallet**. 

In the rapidly evolving landscape of Web3, cryptocurrency wallets rely heavily on classical cryptographic algorithms (such as Elliptic Curve Digital Signature Algorithm, or ECDSA) to generate public-private key pairs and sign transactions. While these algorithms are practically unbreakable by today's classical computers, the horizon is changing. 

This repository serves as a **Production-Grade Proof of Concept (PoC)** to showcase what a future-proof, post-quantum secure Web3 interface looks like. It combines a stunning, modern frontend with a simulated ML-DSA (Module-Lattice-Based Digital Signature Algorithm) smart contract architecture running on the live Ethereum Sepolia Testnet.

---

## ⚠️ The Quantum Threat

### Why do we need Quantum Resistance?
Shor's algorithm, executed on a sufficiently powerful quantum computer, has the potential to solve the discrete logarithm problem exponentially faster than classical computers. This means a quantum computer could mathematically derive a user's private key solely from their public key. 

If this happens, the fundamental security assumption of Bitcoin, Ethereum, and all modern Web3 networks is broken. Funds held in standard Externally Owned Accounts (EOAs) would be completely vulnerable to theft.

---

## 🛡️ Our Solution

To mitigate this impending threat, **Quantum Wallet** proposes a transition away from traditional EOAs and towards **Smart Contract Wallets**.

### How it works:
1. **The Smart Wallet (Vault):** Instead of storing your funds in a standard MetaMask account, your assets are securely locked inside a programmable Smart Contract deployed on the blockchain.
2. **Post-Quantum Signatures:** When you wish to transfer funds out of your Smart Wallet, you must provide a transaction payload signed using a post-quantum cryptographic algorithm (like ML-DSA).
3. **The Relayer (Account Abstraction):** Because post-quantum signatures are currently too large to be verified cheaply by standard blockchain nodes, we employ a "Relayer" architecture. The user connects a standard, low-value EOA (like their MetaMask) simply to act as the "sender" who pays the network gas fee. The Smart Contract verifies the quantum signature and executes the internal transfer.

---

## 🏗️ Architecture & System Design

The architecture of Quantum Wallet is divided into three distinct layers, ensuring decentralization, security, and a seamless user experience.

### 1. The Smart Contract Layer (Solidity)
- `QuantumSmartWallet.sol`: The core vault. It holds the funds and intercepts execution requests. In a full production environment, this contract would implement complete EVM-based verification of ML-DSA signatures. For this PoC, it simulates the signature requirement to demonstrate the structural flow of Account Abstraction.

### 2. The Indexing Layer (The Graph Protocol)
- Instead of relying on a centralized database to fetch the history of transactions, we deployed a custom **Subgraph** to The Graph Studio. 
- The Subgraph actively monitors the Sepolia blockchain for `Executed` and `Deposited` events emitted by our specific Smart Contract.
- It indexes these events into a decentralized GraphQL API, providing lightning-fast, highly reliable transaction history to the frontend.

### 3. The Presentation Layer (Next.js & React)
- A highly optimized, Server-Side Rendered (SSR) web application.
- Utilizes the `wagmi` and `viem` libraries to connect to browser extension wallets (MetaMask).
- Features a completely bespoke Glassmorphic / Neumorphic user interface with interactive data visualization (Recharts).

---

## 💻 Technology Stack

**Frontend / Client:**
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React.js
- **Styling:** Vanilla CSS3 (Custom Glassmorphism, CSS Variables, Animations)
- **Data Visualization:** Recharts
- **Web3 Connection:** Wagmi v2, Viem, Ethers.js v6

**Smart Contracts / Backend:**
- **Language:** Solidity (^0.8.24)
- **Framework:** Hardhat
- **Deployment Network:** Ethereum Sepolia Testnet
- **RPC Provider:** Alchemy

**Decentralized Data Indexing:**
- **Protocol:** The Graph Protocol
- **Language:** AssemblyScript / TypeScript
- **Querying:** GraphQL

---

## ✨ Core Features

1. **Stunning Glassmorphic Dashboard:** A visually striking interface that feels premium, featuring blurred translucent panels, glowing neon accents, and smooth micro-animations.
2. **Live Portfolio Tracking:** Real-time fetching of smart wallet balances directly from the Sepolia testnet.
3. **Interactive Performance Chart:** A dynamic, gradient-filled bezier curve chart powered by Recharts that visualizes asset performance.
4. **Decentralized Activity Logs:** The Activity and Security logs are not mocked! They fetch real, indexed blockchain transaction data dynamically from The Graph Protocol.
5. **Auto-Funding Mechanism:** Built-in API endpoints to automatically fund the smart contract vault for testing purposes.
6. **Dynamic Security Settings:** LocalStorage-persisted security settings (like Biometric toggles) that automatically generate real-time local audit logs.

---

## 🛠️ Comprehensive Setup Guide

This guide will walk you through setting up every layer of the Quantum Wallet project on your local machine from scratch.

### Prerequisites
Before you begin, ensure you have the following installed and set up:
- **Node.js:** Version 18.x or higher installed on your machine.
- **Git:** Version control system.
- **MetaMask:** A browser extension installed in Chrome, Firefox, or Brave.
- **Alchemy Account:** Sign up at [Alchemy](https://www.alchemy.com/) to get a free API key for the Sepolia network.
- **The Graph Studio:** Sign in to [The Graph Studio](https://thegraph.com/studio/) with your Ethereum wallet.

---

### 1. Frontend Application Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SuhasRam356/Quantum-wallet.git
   cd Quantum-wallet
   ```

2. **Install core dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a new file named `.env` in the root directory of the project. This file will securely hold your private keys and RPC URLs.
   ```env
   # Your Alchemy RPC URL for the Sepolia Testnet
   SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY_HERE"
   
   # The private key of your MetaMask wallet (Make sure it has Sepolia test ETH)
   # DO NOT use a private key that holds real, mainnet funds!
   SEPOLIA_PRIVATE_KEY="your_metamask_private_key_here"
   ```

---

### 2. Smart Contract Deployment

While a Smart Contract is already deployed for this project, you can deploy your own instance to the Sepolia testnet to have complete ownership.

1. **Get Testnet ETH:**
   Ensure the MetaMask account associated with your `SEPOLIA_PRIVATE_KEY` has some Sepolia ETH. You can request free Sepolia ETH from faucets like [Alchemy's Sepolia Faucet](https://sepoliafaucet.com/).

2. **Run the Deployment Script:**
   Execute the deployment script using Node.js:
   ```bash
   node scripts/deploySepolia.mjs
   ```

3. **Update Contract References:**
   Once the script finishes, it will print a new contract address to your terminal (e.g., `0x123...abc`).
   - Open `src/utils/constants.js` and update `CONTRACT_ADDRESS` with your new address.
   - Open `subgraph/subgraph.yaml` and update the `address` field under `source` with your new address.

---

### 3. Subgraph Deployment (The Graph)

To enable real-time, decentralized transaction indexing, you must deploy the subgraph code to The Graph Studio.

1. **Navigate to the subgraph directory:**
   ```bash
   cd subgraph
   ```

2. **Install subgraph dependencies:**
   ```bash
   npm install
   ```

3. **Authenticate with The Graph Studio:**
   Go to [The Graph Studio](https://thegraph.com/studio/), create a new subgraph named `quantum-wallet`, and copy your Deploy Key. Run:
   ```bash
   npx graph auth --studio YOUR_DEPLOY_KEY_HERE
   ```

4. **Generate code and build:**
   ```bash
   npm run codegen
   npm run build
   ```

5. **Deploy the Subgraph:**
   Deploy the compiled WebAssembly code to the decentralized network:
   ```bash
   npx graph deploy --studio quantum-wallet --version-label 0.0.1
   ```

6. **Update GraphQL Endpoint:**
   After deployment, The Graph Studio will provide you with a **Query URL**. 
   - Open `src/app/page.js` and `src/app/security/page.js`.
   - Locate the `SUBGRAPH_URL` constant and replace it with your new Query URL.

---

### 4. Start the Application

You have successfully configured the Smart Contracts, the Decentralized Indexer, and the Frontend variables!

Navigate back to the root directory and start the Next.js development server:
```bash
cd ..
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application!

---

## 🎮 Usage Guide

Once the application is running:
1. **Connect Wallet:** Click the "Connect Wallet" button in the top right corner. Ensure your MetaMask is set to the **Sepolia** network.
2. **Dashboard:** View your live Smart Wallet balance and the interactive performance chart. Your recent activity log will initially be empty.
3. **Transfer:** Navigate to the "Transfer" page. Enter an amount (e.g., `0.001` ETH) and a recipient address. Click **Execute Transaction**.
4. **Approve:** MetaMask will prompt you to approve the network gas fee. The Smart Contract will intercept the call, simulate the Post-Quantum verification, and execute the transfer!
5. **View Logs:** Wait a few seconds for the blockchain block to confirm, then navigate back to the Dashboard or Security page. You will see your newly executed transaction beautifully rendered via the live Subgraph GraphQL query!

---

## 🛑 Troubleshooting & FAQ

**Q: My transaction fails with "transaction gas limit too high"**
**A:** This happens if your Smart Wallet Contract has a balance of `0.00 ETH`. When you try to send ETH that the contract doesn't have, the blockchain simulation fails, causing Wagmi to throw a massive gas limit error. 
*Fix:* Manually send a small amount of Sepolia ETH from your MetaMask directly to your `QuantumSmartWallet` contract address to fund it.

**Q: The Subgraph logs aren't updating immediately after a transaction.**
**A:** The Graph Protocol takes a few seconds to index new blocks. Once your transaction is confirmed on Sepolia, wait 5-10 seconds and refresh the dashboard.

**Q: I get a "chainId mismatch" error in MetaMask.**
**A:** Ensure your MetaMask is explicitly connected to the **Sepolia Testnet** network. The application Wagmi configuration restricts connections to Sepolia to prevent mainnet fund loss.

---

## 🚀 Roadmap

While this Proof of Concept is fully functional, here is what we plan to implement in future iterations:
- [ ] **True On-Chain ML-DSA Verification:** Implementing optimized EVM assembly or waiting for an EIP precompile to handle raw ML-DSA matrix math on-chain.
- [ ] **Paymaster Integration:** Implementing a full ERC-4337 Paymaster so that the user does not even need to pay the gas fee with their relayer wallet; the protocol or the Smart Vault itself covers the gas.
- [ ] **Multi-Signature Quantum Vaults:** Requiring multiple distinct post-quantum keys to authorize a single transaction for institutional asset custody.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

*Disclaimer: This is a proof-of-concept for educational and demonstration purposes regarding post-quantum cryptography in Web3. Do not use this architecture with real mainnet funds without undergoing professional smart contract audits.*
