import { ethers } from 'ethers';

export async function POST(req) {
  try {
    const { address } = await req.json();
    
    if (!address) {
      return Response.json({ success: false, error: 'No address provided' }, { status: 400 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

    console.log(`Auto-funding ${address} with 10 ETH...`);
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther("10.0")
    });
    
    await tx.wait();
    console.log(`Auto-fund complete!`);

    return Response.json({ success: true, hash: tx.hash });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
