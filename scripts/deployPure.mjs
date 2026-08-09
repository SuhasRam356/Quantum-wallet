import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  const privateKey = process.env.LOCAL_PRIVATE_KEY;
  if (!privateKey) throw new Error("Please set LOCAL_PRIVATE_KEY in your .env file");
  
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/QuantumSmartWallet.sol/QuantumSmartWallet.json", "utf8"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Deploying QuantumSmartWallet...");
  const contract = await factory.deploy("mock_dilithium_public_key_12345", wallet.address);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("QuantumSmartWallet deployed to:", address);

  console.log("Funding the Smart Wallet with 10 ETH...");
  const tx = await wallet.sendTransaction({
    to: address,
    value: ethers.parseEther("10.0")
  });
  await tx.wait();
  console.log("Funding complete!");
}

main().catch(console.error);
