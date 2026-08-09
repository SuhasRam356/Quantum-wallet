import hre from "hardhat";

async function main() {
  const pqcPublicKeyMock = "mock_dilithium_public_key_12345";
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying QuantumSmartWallet with account:", deployer.address);

  const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
  const wallet = await Wallet.deploy(pqcPublicKeyMock, deployer.address);

  await wallet.waitForDeployment();

  console.log("QuantumSmartWallet deployed to:", await wallet.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
