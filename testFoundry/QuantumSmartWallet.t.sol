// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/QuantumSmartWallet.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract QuantumSmartWalletTest is Test {
    using ECDSA for bytes32;

    QuantumSmartWallet public wallet;
    address public entryPoint;
    address public owner;
    address public pqcValidator;
    
    // Simulate ML-DSA public key
    bytes public validPqcPubKey;
    bytes32 public validPqcPubKeyHash;

    function setUp() public {
        entryPoint = address(1);
        owner = address(this); // Test contract is the owner
        pqcValidator = address(0xABC);
        
        validPqcPubKey = bytes("mock_valid_pqc_pub_key");
        validPqcPubKeyHash = keccak256(validPqcPubKey);
        
        // Pass the PQC algorithm id (2 => FALCON-512) to match the constructor signature
        wallet = new QuantumSmartWallet(entryPoint, 2, validPqcPubKeyHash, owner, pqcValidator);
        vm.deal(address(wallet), 10 ether);
    }

    function testExecuteValid() public {
        address target = address(0xDEAD);
        uint256 amount = 1 ether;
        
        uint256 initialBalance = target.balance;
        
        vm.prank(entryPoint);
        wallet.execute(target, amount, "");
        
        assertEq(target.balance, initialBalance + amount);
    }

    /**
     * @dev Fuzz test: Ensure that ANY signature less than 130 bytes fails validation.
     */
    function testFuzz_ValidateUserOpShortSignature(bytes calldata shortSig) public {
        vm.assume(shortSig.length < 130);
        
        PackedUserOperation memory userOp = PackedUserOperation({
            sender: address(wallet),
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: shortSig
        });

        vm.prank(entryPoint);
        uint256 result = wallet.validateUserOp(userOp, bytes32(0), 0);
        assertEq(result, 1); // SIG_VALIDATION_FAILED
    }
}
