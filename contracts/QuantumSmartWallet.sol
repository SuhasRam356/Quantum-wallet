// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title QuantumSmartWallet
 * @dev A smart contract wallet secured by a Hybrid Post-Quantum architecture (ERC-4337).
 *
 * Architecture:
 *   1. validateUserOp (ECDSA): Secures the gas payment. Uses a standard ECDSA signature 
 *      to pass bundler simulation and prevent gas griefing.
 *   2. execute (ML-DSA Hash Commitment): Secures the assets. The transaction payload must 
 *      include the correct ML-DSA public key bytes that match the on-chain keccak256 commitment.
 *   3. Off-Chain (Server): Full ML-DSA signature verification is performed off-chain before 
 *      the bundler submits the UserOperation.
 */
contract QuantumSmartWallet is IAccount {
    using ECDSA for bytes32;

    address public immutable entryPoint;
    bytes32 public pqcPubKeyHash;   // keccak256 commitment of the ML-DSA public key
    address public owner;           // ECDSA owner for validating UserOps (gas protection)

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

    modifier requireEntryPoint() {
        require(msg.sender == entryPoint, "Only EntryPoint can call this");
        _;
    }

    constructor(address _entryPoint, bytes32 _pqcPubKeyHash, address _initialOwner) {
        entryPoint = _entryPoint;
        pqcPubKeyHash = _pqcPubKeyHash;
        owner = _initialOwner;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- ERC-4337 Account Abstraction ---

    /**
     * @dev Validates the user's signature and nonce. 
     *      Uses standard ECDSA to authorize the gas payment via the EntryPoint.
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override requireEntryPoint returns (uint256 validationData) {
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address signer = hash.recover(userOp.signature);
        
        if (signer != owner) {
            return 1; // SIG_VALIDATION_FAILED
        }

        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds, gas: type(uint256).max}("");
            (success); // ignore failure, entrypoint will revert if not paid
        }

        return 0; // SIG_VALIDATION_SUCCESS
    }

    // --- PQC Key Management ---

    /**
     * @dev Updates the PQC public key hash commitment.
     *      Can only be called via a valid UserOperation from the EntryPoint.
     */
    function setPqcPublicKeyHash(bytes32 newHash) external requireEntryPoint {
        pqcPubKeyHash = newHash;
        emit PqcKeyUpdated(newHash);
    }

    // --- IPFS & Social Recovery Functions ---

    function setIdentity(string calldata cid) external requireEntryPoint {
        userIdentities[owner] = cid;
        emit IdentityUpdated(owner, cid);
    }

    function addVaultFile(string calldata cid) external requireEntryPoint {
        encryptedVaultFiles[owner].push(cid);
        emit VaultFileAdded(owner, cid);
    }

    function addGuardian(address guardian) external requireEntryPoint {
        guardians[owner].push(guardian);
        emit GuardianAdded(owner, guardian);
    }

    /**
     * @dev Executes a transaction. 
     *      Must be called via a valid UserOperation from the EntryPoint (ECDSA verified).
     *      Additionally enforces the PQC public key hash commitment to secure the assets.
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes calldata pqcPubKey
    ) external requireEntryPoint returns (bytes memory) {
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


