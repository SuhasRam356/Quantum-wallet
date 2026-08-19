import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/QuantumSmartWalletFactory.sol/QuantumSmartWalletFactory.json", "utf8"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Deploying QuantumSmartWalletFactory to Sepolia...");
  const ENTRY_POINT = "0x0000000071727de22e5e9d8baf0edac6f37da032";
  const PQC_PRECOMPILE = "0x0000000000000000000000000000000000000101";
  
  const contract = await factory.deploy(ENTRY_POINT, PQC_PRECOMPILE);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("QuantumSmartWalletFactory deployed to:", address);
}

main().catch(console.error);
