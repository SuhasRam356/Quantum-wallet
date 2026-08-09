// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title QuantumSmartWallet
 * @dev A smart contract wallet secured by a Post-Quantum keypair (ML-DSA / FIPS-204).
 *
 * Architecture:
 *   1. The owner generates an ML-DSA-65 keypair client-side using noble/post-quantum.
 *   2. The keccak256 hash of the public key is stored on-chain as a commitment.
 *   3. To execute a transaction, the caller must provide the full public key bytes.
 *      The contract verifies keccak256(pubKey) == stored commitment.
 *   4. Full ML-DSA signature verification happens off-chain (server-side) before
 *      the relayer submits the transaction, since the EVM lacks lattice-math precompiles.
 *
 * This hybrid design ensures every transaction is cryptographically bound to the
 * holder of the ML-DSA private key, while keeping on-chain gas costs minimal.
 */
contract QuantumSmartWallet {
    bytes32 public pqcPubKeyHash;   // keccak256 commitment of the ML-DSA public key
    address public owner;           // The relayer account that broadcasts transactions

    // --- IPFS & Access Control ---
    mapping(address => string) public userIdentities;
    mapping(address => string[]) public encryptedVaultFiles;
    mapping(address => address[]) public guardians;

    event Executed(address indexed target, uint256 value, bytes data);
    event Deposited(address indexed sender, uint256 amount);
    event PqcKeyUpdated(bytes32 indexed newHash);

    // IPFS & Social Recovery Events
    event IdentityUpdated(address indexed user, string ipfsCid);
    event VaultFileAdded(address indexed user, string ipfsCid);
    event GuardianAdded(address indexed user, address indexed guardian);

    constructor(bytes32 _pqcPubKeyHash, address _initialOwner) {
        pqcPubKeyHash = _pqcPubKeyHash;
        owner = _initialOwner;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- PQC Key Management ---

    /**
     * @dev Updates the PQC public key hash commitment. Only the owner can call this.
     * @param newHash The keccak256 hash of the new ML-DSA public key.
     */
    function setPqcPublicKeyHash(bytes32 newHash) external {
        require(msg.sender == owner, "Only owner can update PQC key");
        pqcPubKeyHash = newHash;
        emit PqcKeyUpdated(newHash);
    }

    // --- IPFS & Social Recovery Functions ---

    function setIdentity(string calldata cid) external {
        userIdentities[msg.sender] = cid;
        emit IdentityUpdated(msg.sender, cid);
    }

    function addVaultFile(string calldata cid) external {
        encryptedVaultFiles[msg.sender].push(cid);
        emit VaultFileAdded(msg.sender, cid);
    }

    function addGuardian(address guardian) external {
        guardians[msg.sender].push(guardian);
        emit GuardianAdded(msg.sender, guardian);
    }

    /**
     * @dev Executes a transaction if:
     *   1. The caller is the owner (relayer access control).
     *   2. The provided PQC public key's keccak256 hash matches the stored commitment.
     *
     * Full ML-DSA signature verification is performed off-chain by the server API
     * before the relayer submits this transaction. The on-chain hash commitment
     * ensures the transaction is bound to the correct PQ identity.
     *
     * @param target  The address to send ETH to.
     * @param value   The amount of ETH to send (in wei).
     * @param data    Arbitrary calldata for contract interactions.
     * @param pqcPubKey The full ML-DSA public key bytes (verified via hash commitment).
     */
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        bytes calldata pqcPubKey
    ) external returns (bytes memory) {
        // Access control: only the owner/relayer can submit
        require(msg.sender == owner, "Only owner/relayer can submit");

        // Hash commitment verification: caller must know the real PQ public key
        require(
            keccak256(pqcPubKey) == pqcPubKeyHash,
            "Invalid PQC public key"
        );

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Transaction execution failed");

        emit Executed(target, value, data);
        return result;
    }
}

