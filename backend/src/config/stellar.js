const { rpc, Keypair, Networks } = require('@stellar/stellar-sdk');

// Testnet RPC Server Configuration
const server = new rpc.Server(
  process.env.STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org:443'
);
const networkPassphrase = Networks.TESTNET;

// Admin Wallet configuration for backend signatures
let adminKeypair = null;
const secretKey = process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.STELLAR_ADMIN_SECRET;

if (secretKey && secretKey.startsWith('S') && secretKey.length === 56) {
  try {
    adminKeypair = Keypair.fromSecret(secretKey);
    console.log('[Stellar] Admin wallet loaded successfully:', adminKeypair.publicKey());
  } catch (err) {
    console.warn('[Stellar] Invalid ADMIN_WALLET_PRIVATE_KEY format (expected S...):', err.message);
  }
} else {
  console.warn('[Stellar] ADMIN_WALLET_PRIVATE_KEY/STELLAR_ADMIN_SECRET not set or invalid (must be 56-char secret key starting with S). Operations requiring admin signature will fail.');
}

module.exports = {
  server,
  networkPassphrase,
  adminKeypair,
};
