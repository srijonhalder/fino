#!/usr/bin/env node

/**
 * Redeploy Governance Contract with Correct Admin
 *
 * This script redeploys ONLY the governance contract using the
 * STELLAR_ADMIN_SECRET from the backend .env file, ensuring the
 * backend can create proposals on-chain.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`${message}`, colors.green);
}

function error(message) {
  log(`${message}`, colors.red);
}

function setupNetwork() {
  try {
    log('\n=== Setting up Stellar Testnet network ===', colors.bold);
    
    // Add testnet network (ignore error if already exists)
    try {
      execSync(`stellar network add testnet --rpc-url ${TESTNET_RPC} --network-passphrase "${NETWORK_PASSPHRASE}"`, { stdio: 'pipe' });
    } catch (e) {
      // Network already exists, that's fine
    }
    
    execSync('stellar network use testnet', { stdio: 'pipe' });
    success('Network configured: testnet');
    return true;
  } catch (err) {
    error(`Network setup failed: ${err.message}`);
    return false;
  }
}

function setupAdminFromEnv() {
  try {
    log('\n=== Setting up admin from .env ===', colors.bold);
    
    const adminSecret = process.env.STELLAR_ADMIN_SECRET;
    const adminPublic = process.env.STELLAR_ADMIN_PUBLIC_KEY;
    
    if (!adminSecret) {
      error('STELLAR_ADMIN_SECRET not found in .env');
      return null;
    }
    
    log(`Expected admin public key: ${adminPublic}`, colors.cyan);
    
    // Import the admin key from .env (use a specific name to avoid conflicts)
    const keyName = 'fino-admin';
    
    // Remove existing key if present
    try {
      execSync(`stellar keys rm ${keyName}`, { stdio: 'pipe' });
    } catch (e) {
      // Key doesn't exist, that's fine
    }
    
    // Add the key from secret
    execSync(`stellar keys add ${keyName} --secret-key`, {
      input: adminSecret + '\n',
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Verify the address matches
    const actualAddress = execSync(`stellar keys address ${keyName}`, { encoding: 'utf-8' }).trim();
    log(`Actual admin address: ${actualAddress}`, colors.cyan);
    
    if (actualAddress !== adminPublic) {
      error(`Address mismatch! Expected ${adminPublic}, got ${actualAddress}`);
      return null;
    }
    
    success(`Admin key imported successfully: ${actualAddress}`);
    
    // Fund the account if needed
    try {
      log('Funding admin account...', colors.yellow);
      execSync(`stellar keys fund ${keyName}`, { stdio: 'pipe', timeout: 30000 });
      success('Admin account funded');
    } catch (e) {
      log('Account may already be funded (this is OK)', colors.yellow);
    }
    
    return { keyName, address: actualAddress };
  } catch (err) {
    error(`Admin setup failed: ${err.message}`);
    return null;
  }
}

function deployGovernanceContract(admin) {
  try {
    log('\n=== Deploying Governance Contract ===', colors.bold);
    
    // Check multiple possible WASM locations
    const possiblePaths = [
      path.join(__dirname, '../soroban-contracts/target/wasm32v1-none/release/governance_contract.optimized.wasm'),
      path.join(__dirname, '../soroban-contracts/target/wasm32v1-none/release/governance_contract.wasm'),
      path.join(__dirname, '../soroban-contracts/target/wasm32-unknown-unknown/release/governance_contract.optimized.wasm'),
      path.join(__dirname, '../soroban-contracts/target/wasm32-unknown-unknown/release/governance_contract.wasm'),
    ];
    
    let finalWasmPath = null;
    for (const wasmPath of possiblePaths) {
      if (fs.existsSync(wasmPath)) {
        finalWasmPath = wasmPath;
        break;
      }
    }
    
    if (!finalWasmPath) {
      error('WASM file not found in any expected location:');
      possiblePaths.forEach(p => error(`  - ${p}`));
      error('Please build the contract first: cd governance-contract && cargo build --release --target wasm32v1-none');
      return null;
    }
    
    log(`Using WASM: ${finalWasmPath}`, colors.cyan);
    log(`Admin address: ${admin.address}`, colors.cyan);
    
    // Deploy with constructor args
    const cmd = `stellar contract deploy --source ${admin.keyName} --network testnet --wasm "${finalWasmPath}" -- --admin ${admin.address}`;
    log(`Running: ${cmd}`, colors.yellow);
    
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 120000 });
    
    // Extract contract ID from output
    const lines = result.trim().split('\n');
    let contractId = null;
    
    // Try to find contract ID in output
    for (const line of lines) {
      const match = line.match(/Contract ID:\s+(C[A-Z0-9]{55})/);
      if (match) {
        contractId = match[1];
        break;
      }
      // Sometimes it's just the contract ID on a line by itself
      if (/^C[A-Z0-9]{55}$/.test(line.trim())) {
        contractId = line.trim();
        break;
      }
    }
    
    if (!contractId) {
      // Last resort: take the last non-empty line
      contractId = lines.filter(l => l.trim()).pop()?.trim();
    }
    
    if (!contractId || !contractId.startsWith('C')) {
      error(`Could not extract contract ID from output: ${result}`);
      return null;
    }
    
    success(`Governance contract deployed!`);
    log(`Contract ID: ${contractId}`, colors.cyan);
    
    return contractId;
  } catch (err) {
    error(`Deployment failed: ${err.message}`);
    if (err.stderr) error(`stderr: ${err.stderr}`);
    return null;
  }
}

function updateEnvFile(contractId) {
  try {
    log('\n=== Updating .env file ===', colors.bold);
    
    const envPath = path.join(__dirname, '../../backend/.env');
    let envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Replace the GOVERNANCE_CONTRACT_ID
    const regex = /GOVERNANCE_CONTRACT_ID=.*/;
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `GOVERNANCE_CONTRACT_ID=${contractId}`);
    } else {
      envContent += `\nGOVERNANCE_CONTRACT_ID=${contractId}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    success(`Updated GOVERNANCE_CONTRACT_ID=${contractId}`);
    
    return true;
  } catch (err) {
    error(`Failed to update .env: ${err.message}`);
    return false;
  }
}

function verifyDeployment(contractId, admin) {
  try {
    log('\n=== Verifying Deployment ===', colors.bold);
    
    // Check proposal count
    const countCmd = `stellar contract invoke --id ${contractId} --source ${admin.keyName} --network testnet -- get_proposal_count`;
    log(`Running: ${countCmd}`, colors.yellow);
    
    const countResult = execSync(countCmd, { encoding: 'utf-8', timeout: 60000 });
    log(`Proposal count: ${countResult.trim()}`, colors.cyan);
    
    success('Deployment verified successfully!');
    return true;
  } catch (err) {
    error(`Verification failed: ${err.message}`);
    return false;
  }
}

async function main() {
  log('\n' + '='.repeat(60), colors.bold);
  log('  Fino Governance Contract Redeployment', colors.bold);
  log('='.repeat(60), colors.bold);
  
  // Step 1: Setup network
  if (!setupNetwork()) {
    process.exit(1);
  }
  
  // Step 2: Setup admin from .env
  const admin = setupAdminFromEnv();
  if (!admin) {
    process.exit(1);
  }
  
  // Step 3: Deploy governance contract
  const contractId = deployGovernanceContract(admin);
  if (!contractId) {
    process.exit(1);
  }
  
  // Step 4: Update .env file
  if (!updateEnvFile(contractId)) {
    process.exit(1);
  }
  
  // Step 5: Verify deployment
  verifyDeployment(contractId, admin);
  
  log('\n' + '='.repeat(60), colors.bold);
  success('Governance contract redeployment complete!');
  log('='.repeat(60), colors.bold);
  
  log('\nNext steps:', colors.yellow);
  log('1. Restart the backend server to pick up the new contract ID', colors.cyan);
  log('2. The cron job will automatically create proposals for vote_required businesses', colors.cyan);
  log('3. Check the governance page to see active proposals', colors.cyan);
}

main().catch(err => {
  error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
