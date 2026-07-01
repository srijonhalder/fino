const { Contract, nativeToScVal, scValToNative, TransactionBuilder, Operation, Asset, Memo, BASE_FEE, rpc, Horizon, Address } = require('@stellar/stellar-sdk');
const { server, adminKeypair, networkPassphrase } = require('../config/stellar');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Contract IDs from environment
const GOVERNANCE_CONTRACT_ID = process.env.GOVERNANCE_CONTRACT_ID;
const DOCUMENT_REGISTRY_ID = process.env.DOCUMENT_REGISTRY_ID;
const ESCROW_CONTRACT_ID = process.env.ESCROW_CONTRACT_ID;
const DIVIDEND_CONTRACT_ID = process.env.DIVIDEND_CONTRACT_ID;

const horizonServer = new Horizon.Server(
    process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
);

/**
 * Helper to fetch accounts safely with validation and retry logic
 */
async function getAccount(publicKey, retries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const account = await server.getAccount(publicKey);
      
      // Validate the account object has expected methods
      if (!account) {
        throw new Error('Received null/undefined account object');
      }
      
      if (typeof account.sequenceNumber !== 'function') {
        console.error('[Stellar Service] Invalid account object structure:', {
          accountType: typeof account,
          constructor: account?.constructor?.name,
          hasSequenceNumber: 'sequenceNumber' in (account || {}),
          methods: Object.getOwnPropertyNames(Object.getPrototypeOf(account || {}))
        });
        throw new Error('Invalid account object: missing sequenceNumber method');
      }
      
      if (typeof account.accountId !== 'function') {
        throw new Error('Invalid account object: missing accountId method');
      }
      
      // Verify we can call sequenceNumber without error
      const seqNum = account.sequenceNumber();
      if (seqNum === null || seqNum === undefined) {
        throw new Error('Account sequenceNumber returned null/undefined');
      }
      
      console.log(`[Stellar Service] Account loaded successfully: ${publicKey.substring(0, 8)}... (seq: ${seqNum})`);
      return account;
    } catch (err) {
      lastError = err;
      console.warn(`[Stellar Service] Account load attempt ${attempt}/${retries} failed for ${publicKey}:`, err.message);
      
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        break;
      }
      
      // Wait before retrying (exponential backoff: 500ms, 1s, 2s)
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)));
    }
  }
  
  throw new Error(`Failed to load account ${publicKey} after ${retries} attempts: ${lastError.message}`);
}

/**
 * Submit and manage Soroban transactions with Simulation and proper REST processing.
 */
async function submitTransaction(tx, signerKeypair) {
    console.log('[Stellar Service] Preparing transaction...');
    
    // Step 1: Simulate and prepare the transaction (adds resource info, footprint, etc.)
    let preparedTx;
    try {
        preparedTx = await server.prepareTransaction(tx);
    } catch (e) {
        // Check if it's a simulation error
        if (e.message && e.message.includes('simulation')) {
            throw new Error(`Transaction simulation failed: ${e.message}`);
        }
        throw new Error(`Failed to prepare transaction: ${e.message}`);
    }
    
    // Step 2: Sign the prepared transaction
    preparedTx.sign(signerKeypair);
    
    console.log('[Stellar Service] Sending transaction...');
    
    // Step 3: Submit the signed transaction
    let sendResult;
    try {
        sendResult = await server.sendTransaction(preparedTx);
    } catch (e) {
        throw new Error(`Failed to send transaction: ${e.message}`);
    }
    
    if (sendResult.errorResultXdr) {
       throw new Error(`Tx Error: ${sendResult.errorResultXdr}`);
    }

    let status = sendResult.status;
    let getTxResult;
    let attempts = 0;
    const maxAttempts = 30; // Wait up to 45 seconds
    
    // Step 4: Wait for the transaction to be confirmed
    while (status === "PENDING" || status === "NOT_FOUND") {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        getTxResult = await server.getTransaction(sendResult.hash);
        status = getTxResult.status;
        attempts++;
        
        if (attempts >= maxAttempts) {
            throw new Error(`Transaction timeout after ${maxAttempts} attempts. Last status: ${status}`);
        }
    }

    if (status === "SUCCESS") {
        console.log(`✅ Tx Success: ${sendResult.hash}`);
        return sendResult.hash;
    } else {
        throw new Error(`Tx Failed with status ${status}`);
    }
}

async function sendXLM(recipientAddress, amount, memoText = '') {
    if (!adminKeypair) {
        throw new Error('Admin wallet is not configured. Set ADMIN_WALLET_PRIVATE_KEY in backend .env.');
    }

    const parsedAmount = Number(amount);
    if (!recipientAddress || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Invalid recipient or amount for XLM transfer.');
    }

    const sourceAccount = await horizonServer.loadAccount(adminKeypair.publicKey());
    const fee = await horizonServer.fetchBaseFee();

    const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: String(fee || BASE_FEE),
        networkPassphrase,
    }).addOperation(
        Operation.payment({
            destination: recipientAddress,
            asset: Asset.native(),
            amount: parsedAmount.toFixed(6),
        })
    );

    if (memoText) {
        txBuilder.addMemo(Memo.text(String(memoText).slice(0, 28)));
    }

    const tx = txBuilder.setTimeout(30).build();
    tx.sign(adminKeypair);

    const result = await horizonServer.submitTransaction(tx);
    return { success: true, txHash: result.hash };
}

/**
 * Deploy BusinessToken using stellar-cli to offload the complexity of WASM uploads natively.
 */
const deployBusinessToken = async (tokenName, tokenSymbol, totalTokens, businessId, tokenPriceINR, fundingGoalINR) => {
    try {
        console.log(`🚀 Deploying BusinessToken: ${tokenName} (${tokenSymbol})`);
        
        let wasmPath = path.join(__dirname, '../../../smart-contracts/soroban-contracts/target/wasm32v1-none/release/business_token_contract.optimized.wasm');
        if (!fs.existsSync(wasmPath)) {
            wasmPath = wasmPath.replace('.optimized.wasm', '.wasm');
        }

        const args = [
            `--admin`, adminKeypair.publicKey(),
            `--name`, `"${tokenName}"`,
            `--symbol`, `"${tokenSymbol}"`,
            `--total_supply`, `${totalTokens}`,
            `--business_id`, `"${businessId.toString()}"`,
            `--token_price_inr`, `${tokenPriceINR}`,
            `--funding_goal_inr`, `${fundingGoalINR}`
        ];

        // Use an explicit --rpc-url/--network-passphrase pair rather than --network testnet:
        // the Stellar CLI auto-loads a .env file from its cwd (the backend process's cwd),
        // and backend/.env's own STELLAR_RPC_URL makes the CLI misresolve the named
        // "testnet" network, failing with "rpc-url is used but network passphrase is missing".
        const rpcUrl = process.env.STELLAR_RPC_URL || process.env.STELLAR_SOROBAN_RPC || 'https://soroban-testnet.stellar.org:443';
        let cmd = `stellar contract deploy --source ${adminKeypair.secret()} --rpc-url "${rpcUrl}" --network-passphrase "${networkPassphrase}" --wasm "${wasmPath}" -- ${args.join(' ')}`;
        
        const result = execSync(cmd, { encoding: 'utf-8' });
        const contractId = result.match(/Contract ID:\s+(C[A-Z0-9]{55})/)?.[1] || result.split('\n')[0].trim();
        
        console.log(`✅ BusinessToken deployed at: ${contractId}`);
        return { contractAddress: contractId, txHash: 'Deployed via CLI' };
    } catch (err) {
        throw new Error(`Token deployment failed: ${err.message}`);
    }
};

/**
 * Issue raw transfer locally if needed. Admin signs.
 */
const transferTokens = async (tokenContractAddress, investorWalletAddress, tokenAmount) => {
    try {
        const contract = new Contract(tokenContractAddress);
        const sourceAccount = await getAccount(adminKeypair.publicKey());
        
        const tx = new TransactionBuilder(sourceAccount, { fee: BASE_FEE, networkPassphrase })
            .addOperation(contract.call('transfer', nativeToScVal(adminKeypair.publicKey(), {type: 'address'}), nativeToScVal(investorWalletAddress, {type: 'address'}), nativeToScVal(tokenAmount, {type: 'i128'})))
            .setTimeout(30)
            .build();
            
        const txHash = await submitTransaction(tx, adminKeypair);
        return { txHash };
    } catch (err) {
        throw new Error(`Token transfer failed: ${err.message}`);
    }
};

const checkTransactionStatus = async (txHash) => {
    // Treat as "success" immediately if missing since Soroban tx fetching lacks historic context simply in some testnets
    // Or we use getTransaction
    try {
        const res = await server.getTransaction(txHash);
        return { status: res.status === "SUCCESS" ? "success" : "failed" };
    } catch {
        return { status: "pending" };
    }
};

const getAdminBalance = async () => {
    if (!adminKeypair) {
        throw new Error('Admin wallet is not configured.');
    }
    const { xlmBalance } = await checkBalance(adminKeypair.publicKey());
    return Number(xlmBalance || 0);
};

const checkBalance = async (walletAddress, tokenContractAddress = null) => {
    const account = await horizonServer.loadAccount(walletAddress);
    const xlmEntry = (account.balances || []).find((b) => b.asset_type === 'native');

    // Soroban token balances by contract ID require contract invocation.
    // During migration we return 0 unless a custom lookup is implemented.
    const tokenBalance = tokenContractAddress ? 0 : null;

    return {
        xlmBalance: xlmEntry ? Number(xlmEntry.balance) : 0,
        tokenBalance,
    };
};

const distributeDividends = async (payouts = []) => {
    const results = [];

    for (const payout of payouts) {
        try {
            const tx = await sendXLM(payout.walletAddress, payout.xlmAmount, 'Dividend');
            results.push({ success: true, txHash: tx.txHash });
        } catch (err) {
            results.push({ success: false, txHash: null, error: err.message });
        }
    }

    return results;
};

const escrowReleaseToBusiness = async () => {
    throw new Error('Escrow release via Soroban contract is not implemented yet. Using fallback direct transfer.');
};

const getBusinessTokenInfo = async () => {
    return {
        totalSupply: 0,
        circulatingSupply: 0,
        tokenPriceINR: Number(process.env.DEFAULT_TOKEN_PRICE_INR || 100),
    };
};

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNANCE CONTRACT FUNCTIONS (On-Chain)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Simulate a read-only Soroban contract call
 * @param {string} contractId - Contract address
 * @param {string} method - Method name to call
 * @param {Array} args - Arguments as ScVal array
 * @returns {any} Decoded return value
 */
async function simulateContractCall(contractId, method, args = []) {
    const contract = new Contract(contractId);
    const sourceAccount = await getAccount(adminKeypair.publicKey());
    
    const tx = new TransactionBuilder(sourceAccount, { 
        fee: BASE_FEE, 
        networkPassphrase 
    })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();
    
    const simulation = await server.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationError(simulation)) {
        throw new Error(`Simulation failed: ${simulation.error}`);
    }
    
    // Extract return value from simulation result
    if (simulation.result?.retval) {
        return scValToNative(simulation.result.retval);
    }
    
    return null;
}

/**
 * Execute a write operation on a Soroban contract
 * @param {string} contractId - Contract address  
 * @param {string} method - Method name to call
 * @param {Array} args - Arguments as ScVal array
 * @returns {string} Transaction hash
 */
async function executeContractCall(contractId, method, args = []) {
    try {
        if (!adminKeypair) {
            throw new Error('Admin keypair not configured. Check STELLAR_ADMIN_SECRET environment variable.');
        }
        
        console.log(`[Stellar Service] Executing contract call: ${method} on ${contractId.substring(0, 10)}...`);
        
        const contract = new Contract(contractId);
        const sourceAccount = await getAccount(adminKeypair.publicKey());
        
        console.log(`[Stellar Service] Building transaction with source account: ${sourceAccount.accountId().substring(0, 8)}...`);
        
        const tx = new TransactionBuilder(sourceAccount, { 
            fee: BASE_FEE, 
            networkPassphrase 
        })
            .addOperation(contract.call(method, ...args))
            .setTimeout(30)
            .build();
        
        const txHash = await submitTransaction(tx, adminKeypair);
        console.log(`[Stellar Service] Contract call successful: ${txHash}`);
        return txHash;
    } catch (err) {
        console.error(`[Stellar Service] Contract call failed for ${method}:`, err.message);
        // Re-throw with more context
        throw new Error(`Contract call ${method} failed: ${err.message}`);
    }
}

/**
 * Get proposal count from governance contract
 */
async function getProposalCount() {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    return await simulateContractCall(GOVERNANCE_CONTRACT_ID, 'get_proposal_count', []);
}

/**
 * Get proposal details by ID from governance contract
 * @param {number} proposalId - Proposal ID
 */
async function getProposal(proposalId) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    const result = await simulateContractCall(
        GOVERNANCE_CONTRACT_ID, 
        'get_proposal', 
        [nativeToScVal(proposalId, { type: 'u32' })]
    );
    
    // Map Soroban struct to JS object
    return {
        id: Number(result.id),
        proposalType: Number(result.proposal_type),
        businessHash: result.business_hash,
        metadataIpfs: result.metadata_ipfs,
        proposer: result.proposer,
        startTime: Number(result.start_time),
        endTime: Number(result.end_time),
        upvoteWeight: result.upvote_weight.toString(),
        downvoteWeight: result.downvote_weight.toString(),
        voterCount: Number(result.voter_count),
        status: Number(result.status),
        executed: result.executed,
    };
}

/**
 * Get vote result for a proposal
 * @param {number} proposalId - Proposal ID
 */
async function getVoteResult(proposalId) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    const result = await simulateContractCall(
        GOVERNANCE_CONTRACT_ID, 
        'get_vote_result', 
        [nativeToScVal(proposalId, { type: 'u32' })]
    );
    
    return {
        upvotes: result.upvotes.toString(),
        downvotes: result.downvotes.toString(),
        voters: Number(result.voters),
        status: Number(result.status),
    };
}

/**
 * Get voting power for an address (always returns 1 in new system)
 * @param {string} voterAddress - Stellar address
 */
async function getVotingPower(voterAddress) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    const result = await simulateContractCall(
        GOVERNANCE_CONTRACT_ID, 
        'get_voting_power', 
        [nativeToScVal(voterAddress, { type: 'address' })]
    );
    
    return Number(result);
}

/**
 * Create a new governance proposal
 * @param {string} proposerAddress - Proposer's Stellar address
 * @param {number} proposalType - Type (0=BusinessApproval, 1=RevenueVerification, etc)
 * @param {string} businessHash - 32-byte hash of business ID
 * @param {string} metadataIpfs - IPFS CID for proposal metadata
 */
async function createProposal(proposerAddress, proposalType, businessHash, metadataIpfs) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    // Convert businessHash string to BytesN<32>
    const hashBytes = Buffer.from(businessHash, 'hex');
    
    const txHash = await executeContractCall(
        GOVERNANCE_CONTRACT_ID,
        'create_proposal',
        [
            nativeToScVal(proposerAddress, { type: 'address' }),
            nativeToScVal(proposalType, { type: 'u32' }),
            nativeToScVal(hashBytes, { type: 'bytes' }),
            nativeToScVal(metadataIpfs, { type: 'string' }),
        ]
    );
    
    // Get the new proposal count to determine the proposal ID
    const count = await getProposalCount();
    
    return {
        txHash,
        proposalId: count,
    };
}

/**
 * Build an unsigned vote transaction for client-side signing
 * @param {string} voterAddress - Voter's Stellar address
 * @param {number} proposalId - Proposal ID
 * @param {boolean} support - true for upvote, false for downvote
 * @returns {string} Unsigned transaction XDR
 */
async function buildVoteTransaction(voterAddress, proposalId, support) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    console.log(`[Stellar Service] Building vote transaction: Proposal #${proposalId}, Voter: ${voterAddress.substring(0, 8)}..., Support: ${support}`);
    
    try {
        const contract = new Contract(GOVERNANCE_CONTRACT_ID);
        const voterAccount = await getAccount(voterAddress);
        
        // Build the transaction with voter as source account
        const tx = new TransactionBuilder(voterAccount, { 
            fee: BASE_FEE, 
            networkPassphrase 
        })
            .addOperation(contract.call('vote',
                nativeToScVal(voterAddress, { type: 'address' }),
                nativeToScVal(proposalId, { type: 'u32' }),
                nativeToScVal(support, { type: 'bool' })
            ))
            .setTimeout(30)
            .build();
        
        // Simulate to get resource estimation and prepare the transaction
        const preparedTx = await server.prepareTransaction(tx);
        
        // Return unsigned XDR for client-side signing
        const unsignedXdr = preparedTx.toXDR();
        console.log(`[Stellar Service] Vote transaction built successfully`);
        
        return unsignedXdr;
    } catch (err) {
        console.error('[Stellar Service] Failed to build vote transaction:', err);
        throw new Error(`Failed to build vote transaction: ${err.message}`);
    }
}

/**
 * Submit a signed vote transaction from the client
 * @param {string} signedXdr - Signed transaction XDR from Freighter
 * @returns {Object} Transaction result with hash
 */
async function submitSignedTransaction(signedXdr) {
    console.log('[Stellar Service] Submitting signed transaction...');
    
    try {
        // Submit directly using the signed XDR string, wrapped to pass the SDK's .toXDR() check
        const txWrapper = { toXDR: () => signedXdr };
        
        // Submit to Soroban RPC
        const sendResult = await server.sendTransaction(txWrapper);
        if (sendResult.errorResultXdr) {
            throw new Error(`Transaction error: ${sendResult.errorResultXdr}`);
        }
        
        let status = sendResult.status;
        let getTxResult;
        let attempts = 0;
        const maxAttempts = 30;
        
        // Wait for confirmation
        while (status === "PENDING" || status === "NOT_FOUND") {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            getTxResult = await server.getTransaction(sendResult.hash);
            status = getTxResult.status;
            attempts++;
            
            if (attempts >= maxAttempts) {
                throw new Error(`Transaction timeout after ${maxAttempts} attempts. Last status: ${status}`);
            }
        }
        
        if (status === "SUCCESS") {
            console.log(`✅ Transaction Success: ${sendResult.hash}`);
            return { 
                success: true, 
                txHash: sendResult.hash,
                status: 'success'
            };
        } else {
            throw new Error(`Transaction failed with status ${status}`);
        }
    } catch (err) {
        // Parse common errors and provide user-friendly messages
        const errorMsg = err.message.toLowerCase();
        
        if (errorMsg.includes('already voted')) {
            throw new Error('You have already voted on this proposal.');
        }
        
        if (errorMsg.includes('proposal not active') || errorMsg.includes('not active')) {
            throw new Error('This proposal is no longer active.');
        }
        
        if (errorMsg.includes('voting ended')) {
            throw new Error('The voting period for this proposal has ended.');
        }
        
        console.error('[Stellar Service] Signed transaction submission error:', err);
        throw new Error(`Vote submission failed: ${err.message}`);
    }
}

/**
 * Check if a user has already voted on a proposal
 * @param {string} voterAddress - Voter's Stellar address
 * @param {number} proposalId - Proposal ID
 * @returns {Object} { hasVoted: boolean, support: boolean | null }
 */
async function hasUserVoted(voterAddress, proposalId) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    try {
        console.log(`[Stellar Service] Checking vote status for ${voterAddress.substring(0, 8)}... on proposal #${proposalId}`);
        
        // Call the new has_voted contract method
        const result = await simulateContractCall(
            GOVERNANCE_CONTRACT_ID,
            'has_voted',
            [
                nativeToScVal(proposalId, { type: 'u32' }),
                nativeToScVal(voterAddress, { type: 'address' })
            ]
        );
        
        // Result is VoteRecord { has_voted: bool, support: bool }
        return {
            hasVoted: result.has_voted || false,
            support: result.has_voted ? result.support : null
        };
    } catch (err) {
        console.error('[Stellar Service] Failed to check vote status:', err);
        // Return safe default on error
        return {
            hasVoted: false,
            support: null
        };
    }
}

/**
 * Get list of voters for a proposal
 * @param {number} proposalId - Proposal ID
 * @returns {Array<string>} Array of voter addresses
 */
async function getVoters(proposalId) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    try {
        const result = await simulateContractCall(
            GOVERNANCE_CONTRACT_ID,
            'get_voters',
            [nativeToScVal(proposalId, { type: 'u32' })]
        );
        
        // Result is Vec<Address>
        return result || [];
    } catch (err) {
        console.error('[Stellar Service] Failed to get voters:', err);
        return [];
    }
}

/**
 * Check if a user has voted on a proposal
 * @param {number} proposalId - Proposal ID
 * @param {string} voterAddress - Voter address
 * @returns {boolean} True if the user has voted
 */
async function hasVoted(proposalId, voterAddress) {
    try {
        // Simulate reading the Vote storage key from the contract
        // The contract stores: Vote(proposal_id, voter) → VoteRecord { has_voted, support }
        const contract = new Contract(GOVERNANCE_CONTRACT_ID);
        const sourceAccount = await getAccount(adminKeypair.publicKey());
        
        // Build a simulated call to check vote status
        // Note: The contract doesn't expose a direct method for this,
        // so we need to query storage directly or handle gracefully
        
        // For now, we'll try to simulate getting the vote record
        // If the contract had a has_voted() view method, we'd call that
        // Since it doesn't, we return a conservative answer
        
        console.log(`[Stellar Service] Checking vote status for ${voterAddress.substring(0, 8)}... on proposal #${proposalId}`);
        
        // TODO: This requires either:
        // 1. Adding a has_voted() view method to the contract
        // 2. Indexing VoteSubmitted events
        // 3. Attempting a vote and catching "Already voted" error
        
        // For now, return conservative answer (will be caught by actual vote attempt)
        return {
            hasVoted: false,
            support: null
        };
    } catch (err) {
        console.error('[Stellar Service] Failed to check vote status:', err);
        return {
            hasVoted: false,
            support: null
        };
    }
}

/**
 * Submit a vote on a proposal (OLD METHOD - kept for backward compatibility)
 * @deprecated Use buildVoteTransaction + submitSignedTransaction instead
 * @param {string} voterAddress - Voter's Stellar address
 * @param {number} proposalId - Proposal ID
 * @param {boolean} support - true for upvote, false for downvote
 */
async function submitVoteOnChain(voterAddress, proposalId, support) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    console.log(`[Stellar Service] Submitting vote: Proposal #${proposalId}, Voter: ${voterAddress.substring(0, 8)}..., Support: ${support}`);
    
    try {
        const txHash = await executeContractCall(
            GOVERNANCE_CONTRACT_ID,
            'vote',
            [
                nativeToScVal(voterAddress, { type: 'address' }),
                nativeToScVal(proposalId, { type: 'u32' }),
                nativeToScVal(support, { type: 'bool' }),
            ]
        );
        
        console.log(`[Stellar Service] Vote submitted successfully: ${txHash}`);
        return { txHash };
    } catch (err) {
        // Parse common errors and provide user-friendly messages
        const errorMsg = err.message.toLowerCase();
        
        if (errorMsg.includes('already voted')) {
            throw new Error('You have already voted on this proposal.');
        }
        
        if (errorMsg.includes('proposal not active')) {
            throw new Error('This proposal is no longer active.');
        }
        
        if (errorMsg.includes('voting ended')) {
            throw new Error('The voting period for this proposal has ended.');
        }
        
        if (errorMsg.includes('account') && errorMsg.includes('not found')) {
            throw new Error('Admin account not found on Stellar network. Please contact support.');
        }
        
        if (errorMsg.includes('sequencenumber') || errorMsg.includes('sequence')) {
            throw new Error('Transaction sequence error. Please try again.');
        }
        
        // Re-throw original error if not a known case
        console.error('[Stellar Service] Vote submission error:', err);
        throw new Error(`Vote submission failed: ${err.message}`);
    }
}

/**
 * Finalize a proposal after voting period ends
 * @param {number} proposalId - Proposal ID
 */
async function finalizeProposal(proposalId) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    const txHash = await executeContractCall(
        GOVERNANCE_CONTRACT_ID,
        'finalize_proposal',
        [nativeToScVal(proposalId, { type: 'u32' })]
    );
    
    return { txHash };
}

/**
 * Mark a proposal as executed
 * @param {string} callerAddress - Authorized caller address
 * @param {number} proposalId - Proposal ID
 */
async function markProposalExecuted(callerAddress, proposalId) {
    if (!GOVERNANCE_CONTRACT_ID) {
        throw new Error('GOVERNANCE_CONTRACT_ID not configured');
    }
    
    const txHash = await executeContractCall(
        GOVERNANCE_CONTRACT_ID,
        'mark_executed',
        [
            nativeToScVal(callerAddress, { type: 'address' }),
            nativeToScVal(proposalId, { type: 'u32' }),
        ]
    );
    
    return { txHash };
}

/**
 * Get all proposals from the governance contract
 * @returns {Array} Array of proposal objects
 */
async function getAllProposals() {
    const count = await getProposalCount();
    const proposals = [];
    
    for (let i = 1; i <= count; i++) {
        try {
            const proposal = await getProposal(i);
            proposals.push(proposal);
        } catch (err) {
            console.error(`Failed to fetch proposal #${i}:`, err.message);
        }
    }
    
    return proposals;
}

/**
 * Get active proposals only
 * @returns {Array} Array of active proposal objects
 */
async function getActiveProposals() {
    const proposals = await getAllProposals();
    // Status 0 = Active
    return proposals.filter(p => p.status === 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// BUSINESS TOKEN BALANCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get business token balance for an investor
 * @param {string} tokenContractId - BusinessToken contract address
 * @param {string} investorAddress - Investor's Stellar address
 */
async function getBusinessTokenBalance(tokenContractId, investorAddress) {
    if (!tokenContractId) {
        throw new Error('Token contract ID required');
    }
    
    const result = await simulateContractCall(
        tokenContractId,
        'balance',
        [nativeToScVal(investorAddress, { type: 'address' })]
    );
    
    return result ? BigInt(result).toString() : '0';
}

/**
 * Check if an address holds business tokens (is an investor)
 * @param {string} tokenContractId - BusinessToken contract address
 * @param {string} address - Address to check
 */
async function isBusinessInvestor(tokenContractId, address) {
    const balance = await getBusinessTokenBalance(tokenContractId, address);
    return BigInt(balance) > 0n;
}

// ===========================
// Document Registry Functions
// ===========================

/**
 * Convert MongoDB business ID to 32-byte hash for Soroban contract
 * @param {string} businessId - MongoDB ObjectId string
 * @returns {Buffer} 32-byte buffer
 */
function businessIdToBytes32(businessId) {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(businessId.toString()).digest();
    return hash; // Returns Buffer of 32 bytes
}

/**
 * Register a document hash on the Document Registry contract
 * @param {string} businessId - MongoDB business ID
 * @param {string} docType - Document type (e.g., 'GST', 'PAN', 'photo')
 * @param {string} docHashHex - SHA-256 hash of document as hex string
 * @param {string} encryptedCid - IPFS CID or encrypted reference
 * @returns {string} Transaction hash
 */
async function registerDocumentOnChain(businessId, docType, docHashHex, encryptedCid) {
    if (!DOCUMENT_REGISTRY_ID) {
        throw new Error('DOCUMENT_REGISTRY_ID not configured');
    }
    
    const businessHashBuffer = businessIdToBytes32(businessId);
    const docHashBuffer = Buffer.from(docHashHex, 'hex');
    
    if (docHashBuffer.length !== 32) {
        throw new Error(`Document hash must be 32 bytes, got ${docHashBuffer.length}`);
    }
    
    const args = [
        nativeToScVal(businessHashBuffer, { type: 'bytes' }),
        nativeToScVal(docType, { type: 'string' }),
        nativeToScVal(docHashBuffer, { type: 'bytes' }),
        nativeToScVal(encryptedCid, { type: 'string' })
    ];
    
    console.log(`[Document Registry] Registering document: ${docType} for business ${businessId}`);
    console.log(`  Business hash (hex): ${businessHashBuffer.toString('hex')}`);
    console.log(`  Document hash (hex): ${docHashBuffer.toString('hex')}`);
    const txHash = await executeContractCall(DOCUMENT_REGISTRY_ID, 'register_document', args);
    console.log(`[Document Registry] Document registered: ${txHash}`);
    
    return txHash;
}

/**
 * Add an attestation (verification result) to the Document Registry
 * @param {string} businessId - MongoDB business ID
 * @param {string} claim - Verification claim (e.g., 'GST_valid', 'PAN_verified')
 * @param {number} status - Verification status (0=Pending, 1=Verified, 2=Failed)
 * @param {string} proofHashHex - Hash of proof data as hex string
 * @param {string} method - Verification method (e.g., 'api_check', 'manual_review')
 * @returns {string} Transaction hash
 */
async function addAttestationOnChain(businessId, claim, status, proofHashHex, method) {
    if (!DOCUMENT_REGISTRY_ID) {
        throw new Error('DOCUMENT_REGISTRY_ID not configured');
    }
    
    const businessHash = businessIdToBytes32(businessId);
    const proofHash = Buffer.from(proofHashHex, 'hex');
    
    if (proofHash.length !== 32) {
        throw new Error(`Proof hash must be 32 bytes, got ${proofHash.length}`);
    }
    
    // Validate status enum (0, 1, or 2)
    if (![0, 1, 2].includes(status)) {
        throw new Error(`Invalid status: ${status}. Must be 0 (Pending), 1 (Verified), or 2 (Failed)`);
    }
    
    const args = [
        nativeToScVal(businessHash, { type: 'bytes' }),
        nativeToScVal(claim, { type: 'string' }),
        nativeToScVal(status, { type: 'u32' }),
        nativeToScVal(proofHash, { type: 'bytes' }),
        nativeToScVal(method, { type: 'string' })
    ];
    
    console.log(`[Document Registry] Adding attestation: ${claim} = ${status === 1 ? 'Verified' : status === 2 ? 'Failed' : 'Pending'} for business ${businessId}`);
    const txHash = await executeContractCall(DOCUMENT_REGISTRY_ID, 'add_attestation', args);
    console.log(`[Document Registry] Attestation added: ${txHash}`);
    
    return txHash;
}

/**
 * Add a range proof (zero-knowledge proof for privacy-preserving verification)
 * @param {string} businessId - MongoDB business ID
 * @param {string} claim - Claim type (e.g., 'funding_goal_range', 'age_range')
 * @param {number} threshold - Threshold value for comparison
 * @param {boolean} isAbove - True if value is above threshold, false if below
 * @param {string} zkProofHashHex - Hash of zero-knowledge proof as hex string
 * @returns {string} Transaction hash
 */
async function addRangeProofOnChain(businessId, claim, threshold, isAbove, zkProofHashHex) {
    if (!DOCUMENT_REGISTRY_ID) {
        throw new Error('DOCUMENT_REGISTRY_ID not configured');
    }
    
    const businessHash = businessIdToBytes32(businessId);
    const zkProofHash = Buffer.from(zkProofHashHex, 'hex');
    
    if (zkProofHash.length !== 32) {
        throw new Error(`ZK proof hash must be 32 bytes, got ${zkProofHash.length}`);
    }
    
    const args = [
        nativeToScVal(businessHash, { type: 'bytes' }),
        nativeToScVal(claim, { type: 'string' }),
        nativeToScVal(BigInt(threshold), { type: 'i128' }),
        nativeToScVal(isAbove, { type: 'bool' }),
        nativeToScVal(zkProofHash, { type: 'bytes' })
    ];
    
    console.log(`[Document Registry] Adding range proof: ${claim} ${isAbove ? '>' : '<'} ${threshold} for business ${businessId}`);
    const txHash = await executeContractCall(DOCUMENT_REGISTRY_ID, 'add_range_proof', args);
    console.log(`[Document Registry] Range proof added: ${txHash}`);
    
    return txHash;
}

/**
 * Get all attestations for a business from the Document Registry
 * @param {string} businessId - MongoDB business ID
 * @returns {Array} Array of attestation objects
 */
async function getAttestationsOnChain(businessId) {
    if (!DOCUMENT_REGISTRY_ID) {
        throw new Error('DOCUMENT_REGISTRY_ID not configured');
    }
    
    const businessHash = businessIdToBytes32(businessId);
    
    const args = [
        nativeToScVal(businessHash, { type: 'bytes' })
    ];
    
    console.log(`[Document Registry] Fetching attestations for business ${businessId}`);
    const result = await simulateContractCall(DOCUMENT_REGISTRY_ID, 'get_attestations', args);
    
    return result || [];
}

/**
 * Get all range proofs for a business from the Document Registry
 * @param {string} businessId - MongoDB business ID
 * @returns {Array} Array of range proof objects
 */
async function getRangeProofsOnChain(businessId) {
    if (!DOCUMENT_REGISTRY_ID) {
        throw new Error('DOCUMENT_REGISTRY_ID not configured');
    }
    
    const businessHash = businessIdToBytes32(businessId);
    
    const args = [
        nativeToScVal(businessHash, { type: 'bytes' })
    ];
    
    console.log(`[Document Registry] Fetching range proofs for business ${businessId}`);
    const result = await simulateContractCall(DOCUMENT_REGISTRY_ID, 'get_range_proofs', args);
    
    return result || [];
}

/**
 * Get verification summary for a business from the Document Registry
 * @param {string} businessId - MongoDB business ID
 * @returns {Object} Verification summary with counts
 */
async function getVerificationSummaryOnChain(businessId) {
    if (!DOCUMENT_REGISTRY_ID) {
        throw new Error('DOCUMENT_REGISTRY_ID not configured');
    }
    
    const businessHash = businessIdToBytes32(businessId);
    
    const args = [
        nativeToScVal(businessHash, { type: 'bytes' })
    ];
    
    console.log(`[Document Registry] Fetching verification summary for business ${businessId}`);
    const result = await simulateContractCall(DOCUMENT_REGISTRY_ID, 'get_verification_summary', args);
    
    return result || { total_attestations: 0, verified_count: 0, range_proof_count: 0 };
}

module.exports = {
    deployBusinessToken,
    transferTokens,
    checkTransactionStatus,
    sendXLM,
    getAdminBalance,
    distributeDividends,
    checkBalance,
    escrowReleaseToBusiness,
    getBusinessTokenInfo,
    // Governance contract functions
    simulateContractCall,
    executeContractCall,
    getProposalCount,
    getProposal,
    getVoteResult,
    getVotingPower,
    createProposal,
    submitVoteOnChain,
    finalizeProposal,
    markProposalExecuted,
    getAllProposals,
    getActiveProposals,
    // New client-side voting functions
    buildVoteTransaction,
    submitSignedTransaction,
    hasUserVoted,
    getVoters,
    // Business token functions
    getBusinessTokenBalance,
    isBusinessInvestor,
    // Document Registry functions
    businessIdToBytes32,
    registerDocumentOnChain,
    addAttestationOnChain,
    addRangeProofOnChain,
    getAttestationsOnChain,
    getRangeProofsOnChain,
    getVerificationSummaryOnChain,
};
