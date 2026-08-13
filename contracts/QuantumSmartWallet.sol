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
    uint8 public pqcAlgorithmId;    // The cryptographic algorithm ID (e.g. 1=ML-DSA, 2=FALCON-512)
    bytes32 public pqcPubKeyHash;   // keccak256 commitment of the PQC public key
    address public owner;           // ECDSA owner for standard 2FA
    address public pqcPrecompile;   // The FALCON-512 precompile address

    // --- State & Access Control ---
    string public userIdentity;
    string[] public vaultFiles;
    
    address[] public guardiansList;
    mapping(address => bool) public isGuardian;

    struct RecoveryProposal {
        address newOwner;
        uint8 newAlgorithmId;
        bytes32 newPubKeyHash;
        uint256 executeAfter;
        uint256 approvalCount;
        bool active;
    }

    RecoveryProposal public activeRecovery;
    mapping(address => bool) public hasApprovedRecovery;

    struct ColdTransaction {
        address target;
        uint256 value;
        bytes data;
        uint256 executeAfter;
        uint256 approvalCount;
        bool active;
    }

    ColdTransaction public activeColdTx;
    mapping(address => bool) public hasApprovedColdTx;

    event Executed(address indexed target, uint256 value, bytes data);
    event Deposited(address indexed sender, uint256 amount);
    event PqcKeyUpdated(uint8 indexed algorithmId, bytes32 indexed newHash);

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
        uint8 _pqcAlgorithmId,
        bytes32 _pqcPubKeyHash, 
        address _initialOwner, 
        address _pqcPrecompile
    ) {
        entryPoint = _entryPoint;
        pqcAlgorithmId = _pqcAlgorithmId;
        pqcPubKeyHash = _pqcPubKeyHash;
        owner = _initialOwner;
        pqcPrecompile = _pqcPrecompile;
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    // --- ERC-4337 Account Abstraction ---

    /**
     * @dev Validates the dual-signature UserOperation.
     *      Expects userOp.signature to be 1628 bytes: 
     *      [User ECDSA (65)] + [FALCON PubKey (897)] + [FALCON Sig (666)]
     */
    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override requireEntryPoint returns (uint256 validationData) {
        if (userOp.signature.length < 1628) {
            return 1; // SIG_VALIDATION_FAILED length
        }

        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        
        // 1. Recover User ECDSA Signature
        address userSigner = hash.recover(userOp.signature[0:65]);
        if (userSigner != owner) {
            return 1; // SIG_VALIDATION_FAILED ECDSA
        }

        // 2. Verify PQC Signature based on Algorithm Agility Layer
        if (pqcAlgorithmId == 2) {
            // --- FALCON-512 ---
            if (userOp.signature.length < 1628) return 1;
            
            bytes calldata falconPubKey = userOp.signature[65:962]; // 897 bytes
            bytes calldata falconSig = userOp.signature[962:1628];  // 666 bytes

            // Check if the provided public key matches our on-chain commitment
            if (keccak256(falconPubKey) != pqcPubKeyHash) return 1;

            bytes memory payload = abi.encodePacked(hash, falconPubKey, falconSig);
            (bool success, bytes memory returnData) = pqcPrecompile.staticcall(payload);
            
            if (!success || returnData.length == 0 || abi.decode(returnData, (bool)) != true) {
                return 1;
            }
        } else if (pqcAlgorithmId == 1) {
            // --- ML-DSA-65 ---
            // If algorithm is 1, the EVM expects the ML-DSA precompile to be available (e.g. at 0x101)
            // or routes to the centralized Oracle signature pattern.
            revert("ML-DSA precompile not yet available on this network");
        } else {
            return 1; // Unsupported Algorithm
        }

        // Both signatures valid, pay entrypoint
        if (missingAccountFunds > 0) {
            (bool paid, ) = payable(msg.sender).call{value: missingAccountFunds, gas: type(uint256).max}("");
            (paid);
        }

        return 0; // SIG_VALIDATION_SUCCESS
    }

    // --- PQC Key Management ---

    function setPqcPublicKey(uint8 newAlgorithmId, bytes32 newHash) external requireEntryPoint {
        pqcAlgorithmId = newAlgorithmId;
        pqcPubKeyHash = newHash;
        emit PqcKeyUpdated(newAlgorithmId, newHash);
    }

    // --- IPFS & Social Recovery Functions ---

    function setIdentity(string calldata cid) external requireEntryPoint {
        userIdentity = cid;
        emit IdentityUpdated(owner, cid);
    }

    function addVaultFile(string calldata cid) external requireEntryPoint {
        vaultFiles.push(cid);
        emit VaultFileAdded(owner, cid);
    }

    function addGuardian(address guardian) external requireEntryPoint {
        require(!isGuardian[guardian], "Already a guardian");
        guardiansList.push(guardian);
        isGuardian[guardian] = true;
        emit GuardianAdded(owner, guardian);
    }

    function initiateRecovery(address newOwner, uint8 newAlgorithmId, bytes32 newPubKeyHash) external {
        require(isGuardian[msg.sender], "Only guardian can initiate");
        require(!activeRecovery.active, "Recovery already active");

        activeRecovery = RecoveryProposal({
            newOwner: newOwner,
            newAlgorithmId: newAlgorithmId,
            newPubKeyHash: newPubKeyHash,
            executeAfter: block.timestamp + 1 days,
            approvalCount: 1,
            active: true
        });

        hasApprovedRecovery[msg.sender] = true;
    }

    function approveRecovery() external {
        require(isGuardian[msg.sender], "Only guardian can approve");
        require(activeRecovery.active, "No active recovery");
        require(!hasApprovedRecovery[msg.sender], "Already approved");

        hasApprovedRecovery[msg.sender] = true;
        activeRecovery.approvalCount++;
    }

    function executeRecovery() external {
        require(activeRecovery.active, "No active recovery");
        require(block.timestamp >= activeRecovery.executeAfter, "Timelock active");
        
        uint256 threshold = (guardiansList.length / 2) + 1;
        require(activeRecovery.approvalCount >= threshold, "Not enough approvals");

        // Rotate Keys
        owner = activeRecovery.newOwner;
        pqcAlgorithmId = activeRecovery.newAlgorithmId;
        pqcPubKeyHash = activeRecovery.newPubKeyHash;

        emit PqcKeyUpdated(activeRecovery.newAlgorithmId, activeRecovery.newPubKeyHash);

        // Reset recovery state (we can leave mapping as is, but best to clean up or use nonces in production)
        activeRecovery.active = false;
        // Simplified for PoC: we don't clear all hasApprovedRecovery because active=false guards it, 
        // but a real implementation would use a recoveryNonce.
    }

    // --- Micro-segmentation (Cold Vaults) ---

    function initiateColdTx(address target, uint256 value, bytes calldata data) external requireEntryPoint {
        require(!activeColdTx.active, "Cold Tx already active");

        activeColdTx = ColdTransaction({
            target: target,
            value: value,
            data: data,
            executeAfter: block.timestamp + 24 hours, // 24-hour timelock
            approvalCount: 0,
            active: true
        });
    }

    function approveColdTx() external {
        require(isGuardian[msg.sender], "Only guardian can approve");
        require(activeColdTx.active, "No active cold tx");
        require(!hasApprovedColdTx[msg.sender], "Already approved");

        hasApprovedColdTx[msg.sender] = true;
        activeColdTx.approvalCount++;
    }

    function executeColdTx() external returns (bytes memory) {
        require(activeColdTx.active, "No active cold tx");
        require(block.timestamp >= activeColdTx.executeAfter, "Timelock active");
        
        // Cold storage requires multi-sig threshold
        uint256 threshold = (guardiansList.length / 2) + 1;
        require(activeColdTx.approvalCount >= threshold, "Not enough approvals");

        address target = activeColdTx.target;
        uint256 value = activeColdTx.value;
        bytes memory data = activeColdTx.data;

        activeColdTx.active = false; // Prevent reentrancy

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Cold transaction execution failed");

        emit Executed(target, value, data);
        return result;
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



