import { ethers } from "ethers";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/QuantumSmartWalletFactory.sol/QuantumSmartWalletFactory.json", "utf8"));
  
  let validatorPrivKey = process.env.VALIDATOR_PRIVATE_KEY;
  let validatorWallet;
  if (!validatorPrivKey) {
    console.log("VALIDATOR_PRIVATE_KEY not found in .env. Generating a new one...");
    validatorWallet = ethers.Wallet.createRandom();
    fs.appendFileSync(".env", `\nVALIDATOR_PRIVATE_KEY="${validatorWallet.privateKey}"\n`);
    console.log(`Generated and saved new Validator Private Key to .env`);
  } else {
    validatorWallet = new ethers.Wallet(validatorPrivKey);
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log("Deploying QuantumSmartWalletFactory to Sepolia...");
  const ENTRY_POINT = "0x0000000071727de22e5e9d8baf0edac6f37da032";
  
  // Deploy the Factory! We pass the entry point and the PQC Validator address.
  const contract = await factory.deploy(ENTRY_POINT, validatorWallet.address);
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("QuantumSmartWalletFactory deployed to:", address);

  // Update constants.js
  console.log("Updating constants.js with new FACTORY_ADDRESS...");
  let constantsFile = fs.readFileSync("./src/utils/constants.js", "utf8");
  
  // Add FACTORY_ADDRESS and FACTORY_ABI
  if (constantsFile.includes("export const FACTORY_ADDRESS")) {
    constantsFile = constantsFile.replace(/export const FACTORY_ADDRESS = ".*";/, `export const FACTORY_ADDRESS = "${address}";`);
  } else {
    constantsFile += `\nexport const FACTORY_ADDRESS = "${address}";\n`;
  }

  if (constantsFile.includes("export const FACTORY_ABI")) {
    constantsFile = constantsFile.replace(/export const FACTORY_ABI = \[[\s\S]*?\];/, `export const FACTORY_ABI = ${JSON.stringify(artifact.abi, null, 2)};`);
  } else {
    constantsFile += `\nexport const FACTORY_ABI = ${JSON.stringify(artifact.abi, null, 2)};\n`;
  }
  
  fs.writeFileSync("./src/utils/constants.js", constantsFile);
  console.log("Deployment and update complete!");
}

main().catch(console.error);
