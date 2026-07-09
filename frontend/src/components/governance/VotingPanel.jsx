import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { prepareVoteTransaction, submitSignedVote } from '../../services/governance.api';
import { useWallet } from '../../hooks/useWallet';
import { FiThumbsUp, FiThumbsDown, FiLoader, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

const VotingPanel = ({ proposalId, userVoteStatus, onVoteComplete }) => {
  const { signSorobanTransaction, walletAddress, isConnected } = useWallet();
  const [selectedVote, setSelectedVote] = useState(null);
  const [step, setStep] = useState('choose'); // choose | preparing | signing | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [txHashState, setTxHash] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVote = async (support) => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSelectedVote(support);
    setStep('preparing');
    setErrorMsg('');
    setIsProcessing(true);

    try {
      // Step 1: Request unsigned transaction from backend
      console.log(`[VotingPanel] Preparing vote transaction for proposal #${proposalId}...`);
      setStep('preparing');
      
      const prepareResponse = await prepareVoteTransaction(proposalId, { support });
      const { unsignedXdr } = prepareResponse.data.data || prepareResponse.data;

      if (!unsignedXdr) {
        throw new Error('Backend did not return unsigned transaction');
      }

      // Step 2: Sign with Freighter
      console.log('[VotingPanel] Opening Freighter for signature...');
      setStep('signing');
      
      const signedXdr = await signSorobanTransaction(unsignedXdr);
      
      if (!signedXdr) {
        throw new Error('Failed to sign transaction');
      }

      // Step 3: Submit signed transaction to backend
      console.log('[VotingPanel] Submitting signed vote to blockchain...');
      setStep('submitting');
      
      const submitResponse = await submitSignedVote(proposalId, { signedXdr });
      const { txHash, voterCount, quorumMet } = submitResponse.data.data || submitResponse.data;
      
      setTxHash(txHash);
      setStep('done');
      setIsProcessing(false);
      
      toast.success(
        `Vote ${support ? 'FOR' : 'AGAINST'} recorded on-chain! ${voterCount} vote${voterCount !== 1 ? 's' : ''} cast${quorumMet ? ' (quorum met!)' : ''}`
      );
      
      if (onVoteComplete) onVoteComplete();
      
    } catch (err) {
      console.error('Vote error:', err);
      
      // Handle specific errors
      let userFriendlyMsg = err.message || 'Unexpected error occurred';
      
      if (err.message.includes('rejected') || err.message.includes('declined')) {
        userFriendlyMsg = 'You rejected the transaction in Freighter';
      } else if (err.message.includes('already voted')) {
        userFriendlyMsg = 'You have already voted on this proposal';
      } else if (err.message.includes('not active')) {
        userFriendlyMsg = 'This proposal is no longer active';
      } else if (err.message.includes('voting ended')) {
        userFriendlyMsg = 'The voting period has ended';
      } else if (err.response?.data?.message) {
        userFriendlyMsg = err.response.data.message;
      }
      
      setErrorMsg(userFriendlyMsg);
      setStep('error');
      setIsProcessing(false);
      toast.error(userFriendlyMsg);
    }
  };

  // ── UI States ──

  // If user already voted
  if (userVoteStatus?.hasVoted) {
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center text-indigo-700 mb-2">
          <FiCheckCircle className="mr-2 text-lg" />
          <span className="font-semibold">You have already voted</span>
        </div>
        <p className="text-sm text-indigo-600">
          You voted <strong>{userVoteStatus.support ? 'FOR ✓' : 'AGAINST ✗'}</strong> this proposal.
        </p>
        {userVoteStatus.txHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${userVoteStatus.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline mt-1 inline-block"
          >
            View transaction →
          </a>
        )}
      </div>
    );
  }

  // Success state
  if (step === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <FiCheckCircle className="mx-auto text-green-500 text-3xl mb-2" />
        <h4 className="font-semibold text-green-800">Vote Submitted Successfully!</h4>
        <p className="text-sm text-green-600 mt-1">
          You voted <strong>{selectedVote ? 'FOR ✓' : 'AGAINST ✗'}</strong>. Your vote has been recorded on the Stellar blockchain.
        </p>
        {txHashState && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHashState}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 hover:underline mt-2 inline-block"
          >
            View on Stellar Expert →
          </a>
        )}
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-center text-red-700 mb-2">
          <FiAlertTriangle className="mr-2" />
          <span className="font-semibold">Vote Failed</span>
        </div>
        <p className="text-sm text-red-600 mb-3">{errorMsg}</p>
        <button
          onClick={() => { setStep('choose'); setErrorMsg(''); setIsProcessing(false); }}
          className="text-sm text-red-700 font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Processing state
  if (isProcessing) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-center py-4 text-indigo-600">
          <FiLoader className="animate-spin mr-2 text-xl" />
          <span className="text-sm font-medium">
            {step === 'preparing' && 'Preparing transaction...'}
            {step === 'signing' && 'Please sign in Freighter wallet...'}
            {step === 'submitting' && 'Submitting to blockchain...'}
          </span>
        </div>
        {step === 'signing' && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Check your Freighter extension popup to approve the vote transaction
          </p>
        )}
      </div>
    );
  }

  // Default voting state
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h4 className="font-semibold text-gray-900 mb-1">Cast Your Vote</h4>
      <p className="text-xs text-gray-500 mb-4">
        Your vote will be signed with your Freighter wallet and recorded on-chain.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => handleVote(true)}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiThumbsUp />
          Vote FOR
        </button>
        <button
          onClick={() => handleVote(false)}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiThumbsDown />
          Vote AGAINST
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        Each wallet has 1 equal vote in governance decisions.
      </p>
    </div>
  );
};

export default VotingPanel;
