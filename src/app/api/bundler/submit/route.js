import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

const hexToBytes = (hex) => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
};

export async function POST(req) {
  try {
    const { userOp, pqcSignature, pqcPublicKey } = await req.json();

    if (!userOp || !pqcSignature || !pqcPublicKey) {
      return NextResponse.json({ error: "Missing userOp, pqcSignature, or pqcPublicKey" }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const relayerWallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
    const validatorWallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY);
    const ENTRY_POINT_ADDRESS = "0x0000000071727de22e5e9d8baf0edac6f37da032";

    const entryPointAbi = [
      "function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)",
      "function handleOps(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address beneficiary)"
    ];
    const entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, entryPointAbi, provider);
    
    // Parse the values correctly
    const opTuple = {
      sender: userOp.sender,
      nonce: BigInt(userOp.nonce),
      initCode: userOp.initCode,
      callData: userOp.callData,
      accountGasLimits: userOp.accountGasLimits,
      preVerificationGas: BigInt(userOp.preVerificationGas),
      gasFees: userOp.gasFees,
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature
    };
    
    const userOpHash = await entryPoint.getUserOpHash(opTuple);

    // 2. Append FALCON-512 Signature to UserOp signature (MTU-Optimized)
    // The new EVM precompile architecture expects: 
    // [ECDSA Sig (65 bytes)] + [FALCON Sig (666 bytes)]
    // Public key is recovered on-chain to save MTU bytes.
    
    let pqcSigHex = pqcSignature.startsWith('0x') ? pqcSignature.slice(2) : pqcSignature;
    
    // Fallback padding if the mock size isn't exact
    pqcSigHex = pqcSigHex.padEnd(666 * 2, '0');

    opTuple.signature = opTuple.signature + pqcSigHex;

    // 6. Submit UserOperation to EntryPoint (Act as Bundler)
    const entryPointWrite = entryPoint.connect(relayerWallet);
    const tx = await entryPointWrite.handleOps([opTuple], relayerWallet.address);
    const receipt = await tx.wait();

    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error("Bundler Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

