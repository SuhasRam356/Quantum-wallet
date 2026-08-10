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
  
  console.log("Deploying QuantumSmartWallet...");
  const ENTRY_POINT = "0x0000000071727de22e5e9d8baf0edac6f37da032";
  const placeholderHash = ethers.keccak256(ethers.toUtf8Bytes("placeholder_pqc_key_pending_registration"));
  const contract = await factory.deploy(ENTRY_POINT, placeholderHash, wallet.address, validatorWallet.address);
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
