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

    // 2. Verify ML-DSA signature over the userOpHash
    const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js');
    const messageBytes = hexToBytes(userOpHash);
    const signatureBytes = hexToBytes(pqcSignature);
    const publicKeyBytes = hexToBytes(pqcPublicKey);

    const isValidPqc = ml_dsa65.verify(signatureBytes, messageBytes, publicKeyBytes);
    
    if (!isValidPqc) {
      return NextResponse.json({ error: "Invalid ML-DSA Signature" }, { status: 403 });
    }
    
    // 4. PQC Oracle Co-Sign
    const validatorSignature = await validatorWallet.signMessage(ethers.getBytes(userOpHash));

    // 5. Append Validator signature to User signature
    opTuple.signature = opTuple.signature + validatorSignature.slice(2);

    // 6. Submit UserOperation to EntryPoint (Act as Bundler)
    const entryPointWrite = entryPoint.connect(relayerWallet);
    const tx = await entryPointWrite.handleOps([opTuple], relayerWallet.address);
    const receipt = await tx.wait();

    try {
      const walletAbi = ["function execute(address target, uint256 value, bytes calldata data)"];
      const walletInterface = new ethers.Interface(walletAbi);
      const decoded = walletInterface.decodeFunctionData("execute", opTuple.callData);
      const target = decoded[0];
      const amount = ethers.formatEther(decoded[1]);
      
      const { addActivity } = await import('@/utils/activityStore');
      addActivity({
        sender: opTuple.sender,
        target: target,
        amount: amount,
      });
    } catch (e) {
      console.error("Error logging activity", e);
    }

    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (err) {
    console.error("Bundler Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

