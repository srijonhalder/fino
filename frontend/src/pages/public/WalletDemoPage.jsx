import React from 'react';
import StellarWalletPanel from '../../components/wallet/StellarWalletPanel';

const WalletDemoPage = () => {
  return (
    <main className="mx-auto max-w-lg px-4 pt-28 pb-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-100">
          Stellar Wallet — Freighter Integration
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Detect → Connect → Balance → Send, all on Stellar Testnet.
        </p>
      </div>

      <StellarWalletPanel />

      <p className="mt-8 text-center text-xs text-gray-500">
        All transactions are on Stellar Testnet — no real XLM is used.
      </p>
    </main>
  );
};

export default WalletDemoPage;
