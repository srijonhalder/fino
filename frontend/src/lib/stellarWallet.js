import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';

export const STELLAR_TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
export const HORIZON_TESTNET_URL = 'https://horizon-testnet.stellar.org';

/**
 * Detects whether the Freighter browser extension is installed.
 * @returns {Promise<boolean>}
 */
export async function detectFreighter() {
  try {
    const result = await isConnected();
    if (result?.error) return false;
    return Boolean(result?.isConnected);
  } catch {
    return false;
  }
}

/**
 * Requests permission from Freighter (prompts the user if not already
 * granted) and returns the connected wallet's public address.
 * @returns {Promise<string>}
 */
export async function connectWallet() {
  const allowed = await isAllowed();
  if (allowed?.error) {
    throw new Error(allowed.error.message || String(allowed.error));
  }

  if (!allowed?.isAllowed) {
    const access = await requestAccess();
    if (access?.error) {
      throw new Error(access.error.message || String(access.error));
    }
    if (!access?.address) {
      throw new Error('Freighter did not return a wallet address.');
    }
    return access.address;
  }

  const address = await getAddress();
  if (address?.error) {
    throw new Error(address.error.message || String(address.error));
  }
  if (!address?.address) {
    throw new Error('Freighter did not return a wallet address.');
  }
  return address.address;
}

/**
 * Returns the currently authorized wallet address, or null if the
 * extension hasn't granted this site access yet.
 * @returns {Promise<string | null>}
 */
export async function getWalletAddress() {
  const allowed = await isAllowed();
  if (allowed?.error || !allowed?.isAllowed) return null;

  const address = await getAddress();
  if (address?.error || !address?.address) return null;
  return address.address;
}

/**
 * Signs a base64 transaction XDR via Freighter using the Stellar
 * Testnet network passphrase, returning the signed transaction XDR.
 * @param {string} xdr
 * @returns {Promise<string>}
 */
export async function signTx(xdr) {
  const result = await signTransaction(xdr, {
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
  });

  if (result?.error) {
    throw new Error(result.error.message || String(result.error));
  }
  if (!result?.signedTxXdr) {
    throw new Error('Freighter did not return a signed transaction.');
  }
  return result.signedTxXdr;
}
