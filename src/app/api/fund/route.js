import { ethers } from 'ethers';

// Simple in-memory store for rate limiting (Demo purposes only)
// In a production environment, use Redis or a database.
const rateLimitCache = new Map();

export async function POST(req) {
  try {
    const { address } = await req.json();
    
    if (!address) {
      return Response.json({ success: false, error: 'No address provided' }, { status: 400 });
    }

    // Rate Limiting: 1 request per address every 24 hours
    const now = Date.now();
    const lastFunded = rateLimitCache.get(address.toLowerCase());
    const ONE_DAY = 24 * 60 * 60 * 1000;
    
    if (lastFunded && (now - lastFunded) < ONE_DAY) {
      const hoursLeft = Math.ceil((ONE_DAY - (now - lastFunded)) / (1000 * 60 * 60));
      return Response.json({ 
        success: false, 
        error: `Rate limit exceeded. Try again in ${hoursLeft} hours.` 
      }, { status: 429 });
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);

    console.log(`Auto-funding ${address} with 0.005 ETH...`);
    const tx = await wallet.sendTransaction({
      to: address,
      value: ethers.parseEther("0.005")
    });
    
    await tx.wait();
    console.log(`Auto-fund complete!`);
    
    // Update the cache
    rateLimitCache.set(address.toLowerCase(), Date.now());

    try {
      const { addActivity } = await import('@/utils/activityStore');
      addActivity({
        sender: 'Auto-Fund Relayer',
        target: address,
        amount: '0.005',
      });
    } catch (e) {
      console.error("Error logging fund activity", e);
    }

    return Response.json({ success: true, hash: tx.hash });
  } catch (error) {
    console.error(error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
