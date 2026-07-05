/**
 * Stellar Network Configuration
 * The app uses Freighter wallet (Stellar) for wallet connections.
 * See WalletContext.jsx for the Freighter integration.
 *
 * Network: Stellar Testnet
 * Explorer: https://stellar.expert/explorer/testnet
 * RPC: https://soroban-testnet.stellar.org
 * Horizon: https://horizon-testnet.stellar.org
 */

export const STELLAR_NETWORK = "TESTNET";
export const STELLAR_EXPLORER_BASE =
  process.env.REACT_APP_STELLAR_EXPLORER_URL ||
  "https://stellar.expert/explorer/testnet";
export const STELLAR_RPC_URL = "https://soroban-testnet.stellar.org:443";
export const STELLAR_HORIZON_URL = "https://horizon-testnet.stellar.org";
