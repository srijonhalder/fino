import { useCallback, useState } from 'react';
import { connectWallet, signTx } from '../lib/stellarWallet';
import { fetchXlmBalance, buildPaymentXdr, submitSignedTx } from '../lib/stellarSdk';

/**
 * Standalone Freighter demo wallet hook — talks directly to Horizon Testnet
 * and Freighter, with no backend calls. Independent from the app-wide
 * WalletContext (see src/context/WalletContext.jsx) used for investing/voting.
 */
export function useFreighterDemoWallet() {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const xlmBalance = await fetchXlmBalance(address);
      setBalance(xlmBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const walletAddress = await connectWallet();
      setAddress(walletAddress);
      const xlmBalance = await fetchXlmBalance(walletAddress);
      setBalance(xlmBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const sendXlm = useCallback(
    async (to, amount) => {
      if (!address) {
        throw new Error('Connect a wallet before sending XLM.');
      }
      setIsLoading(true);
      setError(null);
      try {
        const unsignedXdr = await buildPaymentXdr(address, to, amount);
        const signedXdr = await signTx(unsignedXdr);
        const result = await submitSignedTx(signedXdr);
        await refreshBalance();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, refreshBalance]
  );

  return {
    address,
    balance,
    isConnected: address !== null,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    sendXlm,
  };
}
