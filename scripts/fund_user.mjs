import { ethers } from "ethers";

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  // Default hardhat account 0 private key
  const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);

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
