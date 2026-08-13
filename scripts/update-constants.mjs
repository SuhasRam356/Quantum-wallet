import fs from "fs";

const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/QuantumSmartWallet.sol/QuantumSmartWallet.json', 'utf8'));
const factoryArtifact = JSON.parse(fs.readFileSync('./artifacts/contracts/QuantumSmartWalletFactory.sol/QuantumSmartWalletFactory.json', 'utf8'));

const address = "0x6F0d410f7f0514A65fAB25431F61f4eDdf898c3A";
const factoryAddress = "0x403b90554E54D7d30A09b11eCB0e95B16F34C68c";

const content = `export const CONTRACT_ADDRESS = "${address}";
export const FACTORY_ADDRESS = "${factoryAddress}";

export const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};
export const FACTORY_ABI = ${JSON.stringify(factoryArtifact.abi, null, 2)};
`;

fs.writeFileSync('./src/utils/constants.js', content, 'utf8');
console.log("constants.js updated successfully.");
