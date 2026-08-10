import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { keccak256, toHex, stringToHex } from 'viem';
import { FACTORY_ADDRESS, FACTORY_ABI } from '@/utils/constants';

export function useSmartWallet() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [smartWalletAddress, setSmartWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function computeAddress() {
      if (!address || !FACTORY_ADDRESS || !publicClient) {
        setSmartWalletAddress(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Step 1: Check if user has a PQC keypair generated
        const { getStoredKeypair } = await import('@/utils/pqcKeyManager');
        const keypair = getStoredKeypair();
        
        // Always use the placeholder hash for the initial deployment address calculation
        // This ensures the Smart Wallet address is deterministic based purely on the owner's address
        // and doesn't change when they generate a new PQC key. They can update the hash on-chain later.
        const pqcPubKeyHash = keccak256(stringToHex("placeholder_pqc_key_pending_registration"));

        // Salt is 0 for the first wallet
        const computedAddr = await publicClient.readContract({
          address: FACTORY_ADDRESS,
          abi: FACTORY_ABI,
          functionName: 'getAddress',
          args: [address, pqcPubKeyHash, 0n]
        });

        setSmartWalletAddress(computedAddr);
        setError(null);
      } catch (err) {
        console.error("Failed to compute smart wallet address", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    computeAddress();
  }, [address]);

  return { smartWalletAddress, isLoading, error };
}
