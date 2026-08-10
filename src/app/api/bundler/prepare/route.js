import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS } from '@/utils/constants';

export async function POST(req) {
  try {
    const { sender, target, value, data, owner, pqcPubKeyHash } = await req.json();

    if (!sender || !target || value === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const ENTRY_POINT_ADDRESS = "0x0000000071727de22e5e9d8baf0edac6f37da032";

    const entryPointAbi = [
      "function getNonce(address sender, uint192 key) view returns (uint256)",
      "function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)"
    ];
    const entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, entryPointAbi, provider);

    // Get Wallet Nonce (defaults to 0 if not deployed)
    let nonce;
    try {
        nonce = await entryPoint.getNonce(sender, 0);
    } catch {
        nonce = 0n;
    }

    // Check if wallet is deployed
    const code = await provider.getCode(sender);
    let initCode = "0x";
    if (code === "0x") {
        if (!owner) {
             return NextResponse.json({ error: "owner required for deployment" }, { status: 400 });
        }
        const { FACTORY_ADDRESS, FACTORY_ABI } = await import('@/utils/constants');
        const factoryInterface = new ethers.Interface(FACTORY_ABI);
        const factoryData = factoryInterface.encodeFunctionData("createAccount", [owner, ethers.id("placeholder_pqc_key_pending_registration"), 0]);
        initCode = ethers.concat([FACTORY_ADDRESS, factoryData]);
    }

    // Encode the call to wallet.execute(target, value, data)
    const walletAbi = ["function execute(address target, uint256 value, bytes calldata data)"];
    const walletInterface = new ethers.Interface(walletAbi);
    const callData = walletInterface.encodeFunctionData("execute", [target, value, data || "0x"]);

    // Construct the UserOperation with simple placeholder gas limits (since it's a PoC)
    // A real bundler would do eth_estimateUserOperationGas here.
    const userOp = {
      sender: sender,
      nonce: nonce,
      initCode: initCode,
      callData: callData,
      accountGasLimits: ethers.concat([ethers.zeroPadValue(ethers.toBeHex(2000000), 16), ethers.zeroPadValue(ethers.toBeHex(500000), 16)]), // Verification (16 bytes) | Call (16 bytes)
      preVerificationGas: 50000,
      gasFees: ethers.concat([ethers.zeroPadValue(ethers.toBeHex(1000000000), 16), ethers.zeroPadValue(ethers.toBeHex(1000000000), 16)]), // MaxPriorityFee (16 bytes) | MaxFee (16 bytes)
      paymasterAndData: "0x",
      signature: "0x"
    };

    // Note: Ethers v6 requires tuples to be passed perfectly matching the ABI
    const opTuple = {
      sender: userOp.sender,
      nonce: userOp.nonce,
      initCode: userOp.initCode,
      callData: userOp.callData,
      accountGasLimits: userOp.accountGasLimits,
      preVerificationGas: userOp.preVerificationGas,
      gasFees: userOp.gasFees,
      paymasterAndData: userOp.paymasterAndData,
      signature: userOp.signature
    };

    const userOpHash = await entryPoint.getUserOpHash(opTuple);

    // We stringify BigInts to hex for JSON serialization
    const serializedUserOp = {
      ...opTuple,
      nonce: ethers.toBeHex(opTuple.nonce),
      preVerificationGas: ethers.toBeHex(opTuple.preVerificationGas)
    };

    return NextResponse.json({ userOp: serializedUserOp, userOpHash });
  } catch (err) {
    console.error("Bundler Prepare Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
