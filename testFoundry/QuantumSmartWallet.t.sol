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
    
    // Simulate ML-DSA public key
    bytes public validPqcPubKey;
    bytes32 public validPqcPubKeyHash;

    function setUp() public {
        entryPoint = address(1);
        owner = address(this); // Test contract is the owner
        
        validPqcPubKey = bytes("mock_valid_pqc_pub_key");
        validPqcPubKeyHash = keccak256(validPqcPubKey);
        
        wallet = new QuantumSmartWallet(entryPoint, validPqcPubKeyHash, owner);
        vm.deal(address(wallet), 10 ether);
    }

    function testExecuteValid() public {
        address target = address(0xDEAD);
        uint256 amount = 1 ether;
        
        uint256 initialBalance = target.balance;
        
        vm.prank(entryPoint);
        wallet.execute(target, amount, "", validPqcPubKey);
        
        assertEq(target.balance, initialBalance + amount);
    }

    /**
     * @dev Fuzz test: Ensure that ANY random bytes provided as the PQC public key 
     * that are NOT the correct key will revert the transaction. This proves the 
     * hash commitment access control is robust against arbitrary inputs.
     */
    function testFuzz_ExecuteWithInvalidPqcKey(bytes calldata invalidPqcPubKey) public {
        // Skip if the fuzzer somehow guesses the correct key
        vm.assume(keccak256(invalidPqcPubKey) != validPqcPubKeyHash);
        
        address target = address(0xDEAD);
        uint256 amount = 1 ether;
        
        vm.prank(entryPoint);
        vm.expectRevert("Invalid PQC public key");
        wallet.execute(target, amount, "", invalidPqcPubKey);
    }
}
