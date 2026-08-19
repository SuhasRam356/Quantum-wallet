// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockFalconPrecompile
 * @dev Mocks the FALCON-512 EVM Precompile (EIP-7619) at 0x00...0100 for local testing.
 */
contract MockFalconPrecompile {
    /**
     * @dev The fallback function receives the staticcall payload:
     *      [Hash (32 bytes)] + [FALCON Sig (666 bytes)] (MTU-Optimized)
     */
    fallback() external {
        // Ensure payload length is correct (32 + 666 = 698)
        if (msg.data.length != 698) {
            _returnFalse();
            return;
        }

        bytes32 messageHash = bytes32(msg.data[0:32]);
        bytes memory sig = msg.data[32:698];

        // Our pqcKeyManager.js mock sets the first 32 bytes of the signature 
        // to the keccak256 hash of the message to simulate successful verification.
        bytes32 embeddedHash = bytes32(msg.data[32:64]);

        if (messageHash == embeddedHash) {
            _returnTrue();
        } else {
            _returnFalse();
        }
    }

    function _returnTrue() internal pure {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 1) // true
            return(ptr, 0x20)
        }
    }

    function _returnFalse() internal pure {
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0) // false
            return(ptr, 0x20)
        }
    }
}
