import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/QuantumSmartWallet.sol/QuantumSmartWallet.json", "utf8"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Deploying QuantumSmartWallet to Sepolia...");
  const contract = await factory.deploy("mock_dilithium_public_key_sepolia", wallet.address);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("QuantumSmartWallet deployed to:", address);

  console.log("Funding the Smart Wallet with 0.05 ETH...");
  try {
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther("0.05")
    });
    await tx.wait();
    console.log("Funding complete!");
  } catch (error) {
    console.warn("Could not fund the wallet automatically. Make sure you have enough Sepolia ETH.", error);
  }
}

main().catch(console.error);
