// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPQCPrecompile {
    fallback() external {
        // Return true (abi-encoded bool)
        assembly {
            mstore(0, 1)
            return(0, 32)
        }
    }
}
