// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./QuantumSmartWallet.sol";

/**
 * @title QuantumSmartWalletFactory
 * @dev A factory contract to deploy deterministic QuantumSmartWallet instances via CREATE2.
 */
contract QuantumSmartWalletFactory {
    address public immutable entryPoint;
    address public immutable pqcPrecompile;

    event AccountCreated(address indexed account, address indexed owner);

    constructor(address _entryPoint, address _pqcPrecompile) {
        entryPoint = _entryPoint;
        pqcPrecompile = _pqcPrecompile;
    }

    /**
     * @dev Creates an account, and returns its address.
     * Returns the address even if the account is already deployed.
     * Note: during UserOperation execution, this method is called. 
     * If the account already exists, it simply returns its address.
     */
    function createAccount(address owner, uint8 pqcAlgorithmId, bytes32 pqcPubKeyHash, uint256 salt) public returns (QuantumSmartWallet ret) {
        address addr = getAddress(owner, pqcAlgorithmId, pqcPubKeyHash, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return QuantumSmartWallet(payable(addr));
        }

        bytes memory creationCode = type(QuantumSmartWallet).creationCode;
        bytes memory bytecode = abi.encodePacked(
            creationCode, 
            abi.encode(entryPoint, pqcAlgorithmId, pqcPubKeyHash, owner, pqcPrecompile)
        );

        addr = Create2.deploy(0, bytes32(salt), bytecode);
        ret = QuantumSmartWallet(payable(addr));
        
        emit AccountCreated(addr, owner);
    }

    /**
     * @dev Calculates the counterfactual address of this account as it would be returned by createAccount()
     */
    function getAddress(address owner, uint8 pqcAlgorithmId, bytes32 pqcPubKeyHash, uint256 salt) public view returns (address) {
        bytes memory creationCode = type(QuantumSmartWallet).creationCode;
        bytes memory bytecode = abi.encodePacked(
            creationCode, 
            abi.encode(entryPoint, pqcAlgorithmId, pqcPubKeyHash, owner, pqcPrecompile)
        );
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                bytes32(salt),
                keccak256(bytecode)
            )
        );
        return address(uint160(uint256(hash)));
    }
}
