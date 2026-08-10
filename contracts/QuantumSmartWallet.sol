// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title QuantumSmartWallet
 * @dev A smart contract wallet secured by a Post-Quantum Oracle architecture (ERC-4337).
 *
 * Architecture:
 *   1. validateUserOp (Multi-sig): Requires two ECDSA signatures appended together.
 *      - Sig 1 (0-65 bytes): The user's ECDSA signature (proves ECDSA ownership).
 *      - Sig 2 (65-130 bytes): The PQC Validator's ECDSA signature.
 *   2. The PQC Validator (Oracle) only signs the userOpHash if it first successfully 
 *      verifies the user's ML-DSA (FIPS-204) signature off-chain against the on-chain 
 *      pqcPubKeyHash commitment.
 *   3. This binds the post-quantum signature exactly to the executed calldata, nonce, 
 *      and chain ID, preventing all replay attacks.
 */
contract QuantumSmartWallet is IAccount {
    using ECDSA for bytes32;

    address public immutable entryPoint;
    bytes32 public pqcPubKeyHash;   // keccak256 commitment of the ML-DSA public key
    address public owner;           // ECDSA owner for standard 2FA
    address public pqcValidator;    // The ECDSA public key of our Post-Quantum Oracle

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

    constructor(
        address _entryPoint, 
        bytes32 _pqcPubKeyHash, 
        address _initialOwner, 
        address _pqcValidator
    ) {
        entryPoint = _entryPoint;
        pqcPubKeyHash = _pqcPubKeyHash;
        owner = _initialOwner;
        pqcValidator = _pqcValidator;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- ERC-4337 Account Abstraction ---

    /**
     * @dev Validates the dual-signature UserOperation.
     *      Expects userOp.signature to be 130 bytes: [User ECDSA (65)] + [Validator ECDSA (65)]
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override requireEntryPoint returns (uint256 validationData) {
        if (userOp.signature.length < 130) {
            return 1; // SIG_VALIDATION_FAILED
        }

        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        
        // 1. Recover User Signature
        address userSigner = hash.recover(userOp.signature[0:65]);
        if (userSigner != owner) {
            return 1; // SIG_VALIDATION_FAILED
        }

        // 2. Recover PQC Oracle (Validator) Signature
        address validatorSigner = hash.recover(userOp.signature[65:130]);
        if (validatorSigner != pqcValidator) {
            return 1; // SIG_VALIDATION_FAILED
        }

        // Both signatures valid, pay entrypoint
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds, gas: type(uint256).max}("");
            (success); // ignore failure, entrypoint will revert if not paid
        }

        return 0; // SIG_VALIDATION_SUCCESS
    }

    // --- PQC Key Management ---

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
     *      Because the UserOp hash was cryptographically bound to the ML-DSA signature 
     *      and validated by the PQC Oracle in validateUserOp, we no longer need the 
     *      pqcPubKey payload injection here.
     */
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external requireEntryPoint returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Transaction execution failed");

        emit Executed(target, value, data);
        return result;
    }
}



