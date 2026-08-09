import { ethers } from "ethers";
import fs from "fs";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  // Default hardhat account 0 private key
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

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
