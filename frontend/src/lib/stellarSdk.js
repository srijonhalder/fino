import {
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { STELLAR_TESTNET_PASSPHRASE, HORIZON_TESTNET_URL } from './stellarWallet';

const server = new Horizon.Server(HORIZON_TESTNET_URL);

/**
 * Fetches the native XLM balance for a Stellar Testnet account.
 * Resolves to "0" if the account isn't funded yet (HTTP 404).
 * @param {string} address
 * @returns {Promise<string>}
 */
export async function fetchXlmBalance(address) {
  try {
    const account = await server.loadAccount(address);
    const native = account.balances.find((b) => b.asset_type === 'native');
    return native?.balance ?? '0';
  } catch (err) {
    if (err?.response?.status === 404) {
      return '0';
    }
    throw err;
  }
}

/**
 * Builds an unsigned native-XLM payment transaction and returns its XDR,
 * ready to be signed by Freighter.
 * @param {string} from
 * @param {string} to
 * @param {string} amount
 * @returns {Promise<string>}
 */
export async function buildPaymentXdr(from, to, amount) {
  const account = await server.loadAccount(from);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: to,
        asset: Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build();

  return transaction.toXDR();
}

/**
 * Submits a signed transaction XDR to Horizon Testnet.
 * @param {string} signedXdr
 * @returns {Promise<{ hash: string }>}
 */
export async function submitSignedTx(signedXdr) {
  const transaction = TransactionBuilder.fromXDR(signedXdr, STELLAR_TESTNET_PASSPHRASE);
  const result = await server.submitTransaction(transaction);
  return { hash: result.hash };
}
