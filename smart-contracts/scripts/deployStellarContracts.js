#!/usr/bin/env node

/**
 * Stellar Contract Deployment Helper
 *
 * Deploys 5 Soroban contracts to Stellar Testnet sequentially,
 * resolving dependencies and passing __constructor arguments.
 * 
 * Note: INVX token and reward distributor have been removed as the 
 * governance system now uses 1-wallet-1-vote instead of token-weighted voting.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const TESTNET_RPC = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const NATIVE_XLM_SAC = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // Testnet XLM

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) { console.log(`${color}${message}${colors.reset}`); }
function success(message) { log(`✅ ${message}`, colors.green); }
function error(message) { log(`❌ ${message}`, colors.red); }

function setupNetworkAndAdmin() {
  try {
    log('🔧 Setting up Stellar Testnet network...', colors.bold);
    try { execSync(`stellar network add testnet --rpc-url ${TESTNET_RPC} --network-passphrase "${NETWORK_PASSPHRASE}"`, { stdio: 'pipe' }); } catch (e) {}
    execSync('stellar network use testnet', { stdio: 'pipe' });
    log('🔑 Setting up admin keypair...', colors.bold);
    try { execSync('stellar keys generate admin', { stdio: 'pipe' }); } catch (e) {}
    try { execSync('stellar keys fund admin', { stdio: 'pipe' }); } catch (e) {}
    const adminAddress = execSync('stellar keys address admin', { encoding: 'utf-8' }).trim();
    return adminAddress;
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    return null;
  }
}

function deployContract(name, file, argsArray) {
  try {
    log(`\n🚀 Deploying ${name}...`, colors.bold);
    let wasmPath = path.join(__dirname, `../soroban-contracts/target/wasm32v1-none/release/${file}`);
    if (!fs.existsSync(wasmPath)) { wasmPath = wasmPath.replace('.optimized.wasm', '.wasm'); }
    
    let cmd = `stellar contract deploy --source admin --network testnet --wasm "${wasmPath}"`;
    if (argsArray && argsArray.length > 0) cmd += ` -- ${argsArray.join(' ')}`;
    
    const result = execSync(cmd, { encoding: 'utf-8' });
    const contractId = result.match(/Contract ID:\s+(C[A-Z0-9]{55})/)?.[1] || result.split('\n')[0].trim();
    success(`Deployed! ID: ${colors.cyan}${contractId}${colors.reset}`);
    return contractId;
  } catch (err) {
    error(`${name} deployment failed: ${err.message}`);
    process.exit(1);
  }
}

function deployAll() {
  const adminAddress = setupNetworkAndAdmin();
  if (!adminAddress) process.exit(1);
  log(`Admin: ${adminAddress}`);

  const results = {};
  
  const bizArgs = [`--admin`, adminAddress, `--name`, `"Business Token"`, `--symbol`, `"BTKN"`, `--total_supply`, `10000`, `--business_id`, `"business_123"`, `--token_price_inr`, `100`, `--funding_goal_inr`, `100000`];
  const bizId = deployContract('Business Token', 'business_token_contract.optimized.wasm', bizArgs);
  results['BUSINESS_TOKEN_CONTRACT_ID'] = bizId;
  
  const escrowArgs = [`--admin`, adminAddress, `--xlm_token`, NATIVE_XLM_SAC];
  const escrowId = deployContract('Escrow', 'escrow_contract.optimized.wasm', escrowArgs);
  results['ESCROW_CONTRACT_ID'] = escrowId;
  results['ESCROW_CONTRACT_ADDRESS'] = escrowId;
  
  const divArgs = [`--admin`, adminAddress, `--xlm_token`, NATIVE_XLM_SAC, `--backend_wallet`, adminAddress];
  const divId = deployContract('Dividend Distributor', 'dividend_distributor_contract.optimized.wasm', divArgs);
  results['DIVIDEND_CONTRACT_ID'] = divId;
  
  const docArgs = [`--admin`, adminAddress];
  const docId = deployContract('Document Registry', 'document_registry_contract.optimized.wasm', docArgs);
  results['DOCUMENT_REGISTRY_ID'] = docId;
  
  // Governance no longer needs INVX token - uses 1-wallet-1-vote
  const govArgs = [`--admin`, adminAddress];
  const govId = deployContract('Governance', 'governance_contract.optimized.wasm', govArgs);
  results['GOVERNANCE_CONTRACT_ID'] = govId;
  
  const envPath = path.join(__dirname, '../../backend/.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  if (!envContent.includes('# Soroban Contract IDs')) envContent += `\n\n# Soroban Contract IDs\n`;
  for (const [key, id] of Object.entries(results)) {
     const regex = new RegExp(`${key}=.*`);
     if (envContent.match(regex)) envContent = envContent.replace(regex, `${key}=${id}`);
     else envContent += `${key}=${id}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  success('✅ Deployment complete! Environment file (.env) updated.');
}

deployAll();
