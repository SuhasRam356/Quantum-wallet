import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  const privateKey = process.env.LOCAL_PRIVATE_KEY;
  if (!privateKey) throw new Error("Please set LOCAL_PRIVATE_KEY in your .env file");
  
  const wallet = new ethers.Wallet(privateKey, provider);

  const targetAddress = "0x5Db7b10dB4827A346FaDF3FE2aa8b2c7d4a33b86";
  console.log(`Funding user address: ${targetAddress} with 100 ETH...`);
  
  const tx = await wallet.sendTransaction({
    to: targetAddress,
    value: ethers.parseEther("100.0")
  });
  
  await tx.wait();
  console.log("Funding complete! Tx hash:", tx.hash);
}

main().catch(console.error);
