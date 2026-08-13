const hre = require("hardhat");

async function main() {
  const pqcPublicKeyMock = "mock_dilithium_public_key_12345";
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying QuantumSmartWallet with account:", deployer.address);

  const ENTRY_POINT = "0x0000000071727de22e5e9d8baf0edac6f37da032";
  const PQC_PRECOMPILE = "0x0000000000000000000000000000000000000101";
  const placeholderHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("placeholder_pqc_key_pending_registration"));
  
  const Wallet = await hre.ethers.getContractFactory("QuantumSmartWallet");
  const wallet = await Wallet.deploy(ENTRY_POINT, 2, placeholderHash, deployer.address, PQC_PRECOMPILE);

  await wallet.waitForDeployment();

  console.log("QuantumSmartWallet deployed to:", await wallet.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
