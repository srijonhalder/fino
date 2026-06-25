require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/**
 * Hardhat configuration for Fino smart contracts
 * 
 * MIGRATION NOTE: This project has been migrated from Celo EVM to Stellar blockchain.
 * This Hardhat config is DEPRECATED for production use. 
 * Use Stellar CLI (`stellar contract`) for deploying Soroban contracts.
 * This config remains for legacy EVM contract tests only.
 */

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks: {
    // Maintained for reference - Stellar uses Soroban instead
    stellarTestnet: {
      // Note: Stellar is not EVM-compatible
      // Use stellar-cli and Soroban SDK for contract deployment
      url: "https://horizon-testnet.stellar.org",
      chainId: 0, // Stellar uses network passphrases, not chain IDs
      // For Stellar, use: STELLAR_ADMIN_SECRET environment variable
    },
    hardhat: {
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
