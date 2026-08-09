import fs from "fs";

const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/QuantumSmartWallet.sol/QuantumSmartWallet.json', 'utf8'));
const address = "0x6F0d410f7f0514A65fAB25431F61f4eDdf898c3A";
const content = `export const CONTRACT_ADDRESS = "${address}";\n\nexport const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};\n`;

fs.writeFileSync('./src/utils/constants.js', content, 'utf8');
console.log("constants.js updated successfully.");
