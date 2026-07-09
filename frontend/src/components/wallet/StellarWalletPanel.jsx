import React, { useEffect, useState } from 'react';
import { detectFreighter, signTx } from '../../lib/stellarWallet';
import { buildPaymentXdr, submitSignedTx } from '../../lib/stellarSdk';
import { useFreighterDemoWallet } from '../../hooks/useFreighterDemoWallet';

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

const StellarWalletPanel = () => {
  const [freighterInstalled, setFreighterInstalled] = useState(null);
  const {
    address,
    balance,
    isConnected,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
  } = useFreighterDemoWallet();

  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [txFeedback, setTxFeedback] = useState(null);

  useEffect(() => {
    let cancelled = false;
    detectFreighter().then((installed) => {
      if (!cancelled) setFreighterInstalled(installed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!address) return;

    setSending(true);
    setTxFeedback(null);
    try {
      const unsignedXdr = await buildPaymentXdr(address, destination, amount);
      const signedXdr = await signTx(unsignedXdr);
      const result = await submitSignedTx(signedXdr);
      setTxFeedback({ status: 'success', hash: result.hash });
      setDestination('');
      setAmount('');
      await refreshBalance();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTxFeedback({ status: 'error', message });
    } finally {
      setSending(false);
    }
  };

  // Step 1: still checking for the extension.
  if (freighterInstalled === null) {
    return (
      <div className="rounded-xl border border-white/10 bg-dark-800 p-5">
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Spinner /> Detecting Freighter…
        </p>
      </div>
    );
  }

  // Step 1: extension not installed.
  if (!freighterInstalled) {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-5">
        <p className="mb-3 font-medium text-yellow-300">Freighter wallet not detected.</p>
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-dark-900 transition-colors hover:bg-yellow-400"
        >
          Install Freighter ↗
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Network badge */}
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-400">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
          Stellar Testnet — horizon-testnet.stellar.org
        </span>
      </div>

      {/* Step 2: connect / connected state */}
      {!isConnected ? (
        <div className="rounded-xl border border-white/10 bg-dark-800 p-5">
          <p className="mb-4 text-sm text-gray-400">
            Connect your Freighter wallet to get started on Stellar Testnet.
          </p>
          {error && <p className="mb-3 text-sm font-medium text-red-400">{error}</p>}
          <button
            onClick={() => connect()}
            disabled={isLoading}
            className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-dark-900 transition-colors hover:bg-primary-400 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Connecting…
              </span>
            ) : (
              'Connect Wallet'
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 p-5">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-primary-400">
            Connected — Testnet
          </p>
          <p className="mb-4 break-all font-mono text-sm font-semibold text-gray-100">
            {address}
          </p>
          <button
            onClick={disconnect}
            className="rounded-lg border border-primary-500/40 bg-dark-900 px-4 py-2 text-sm font-semibold text-primary-400 transition-colors hover:bg-primary-500/10"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Step 3: balance */}
      {isConnected && (
        <div className="rounded-xl border border-white/10 bg-dark-800 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              XLM Balance
            </h2>
            <button
              onClick={() => refreshBalance()}
              disabled={isLoading}
              className="rounded-md bg-white/5 px-3 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              {isLoading ? 'Refreshing…' : 'Refresh Balance'}
            </button>
          </div>

          {balance === null ? (
            <p className="text-2xl font-bold text-gray-600">—</p>
          ) : balance === '0' ? (
            <div>
              <p className="text-2xl font-bold text-gray-200">0 XLM (account not funded)</p>
              <a
                href="https://laboratory.stellar.org/#account-creator?network=test"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-primary-400 underline hover:text-primary-300"
              >
                Fund via Friendbot ↗
              </a>
            </div>
          ) : (
            <p className="text-3xl font-bold tabular-nums text-gray-100">
              {parseFloat(balance).toFixed(7)}{' '}
              <span className="text-xl font-semibold text-gray-400">XLM</span>
            </p>
          )}
        </div>
      )}

      {/* Step 4: send XLM */}
      {isConnected && (
        <div className="rounded-xl border border-white/10 bg-dark-800 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Send XLM
          </h2>

          {txFeedback?.status === 'success' && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <p className="mb-1 text-sm font-semibold text-green-400">
                Transaction sent! Hash: {txFeedback.hash}
              </p>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txFeedback.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary-400 underline hover:text-primary-300"
              >
                View on stellar.expert ↗
              </a>
            </div>
          )}

          {txFeedback?.status === 'error' && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm font-medium text-red-400">{txFeedback.message}</p>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label htmlFor="destination" className="mb-1 block text-sm font-medium text-gray-300">
                Destination Address
              </label>
              <input
                id="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="G…"
                required
                pattern="G[A-Z2-7]{55}"
                title="Must be a valid Stellar G-address (56 characters starting with G)"
                className="w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 font-mono text-sm text-gray-100 placeholder-gray-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="amount" className="mb-1 block text-sm font-medium text-gray-300">
                Amount (XLM)
              </label>
              <input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0000000"
                min="0.0000001"
                step="0.0000001"
                required
                className="w-full rounded-lg border border-white/10 bg-dark-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-dark-900 transition-colors hover:bg-primary-400 disabled:opacity-50"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Sending…
                </span>
              ) : (
                'Send XLM'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default StellarWalletPanel;
