/**
 * Stellar Account Initialization Script
 * 
 * Initializes Stellar accounts, manages XLM funds, and sets up trustlines.
 * Run: node scripts/initializeStellarAccounts.js
 */

const StellarSdk = require('@stellar/stellar-sdk');
require('dotenv').config();

const { Horizon, Keypair, Networks, TransactionBuilder, Operation, Asset } = StellarSdk;
const server = new Horizon.Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
const networkPassphrase = Networks.TESTNET;
const ADMIN_PUBLIC_ADDRESS =
  process.env.STELLAR_ADMIN_PUBLIC_ADDRESS ||
  (process.env.STELLAR_ADMIN_SECRET
    ? Keypair.fromSecret(process.env.STELLAR_ADMIN_SECRET).publicKey()
    : undefined);
const adminSecret = process.env.ADMIN_WALLET_PRIVATE_KEY || process.env.STELLAR_ADMIN_SECRET;
const adminKeypair =
  adminSecret && adminSecret.startsWith('S') && adminSecret.length === 56
    ? Keypair.fromSecret(adminSecret)
    : null;

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

/**
 * Check if account exists on Stellar Testnet
 */
async function accountExists(publicKey) {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (err) {
    if (err.status === 404) {
      return false;
    }
    throw err;
  }
}

/**
 * Check XLM balance of account
 */
async function getXLMBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    return xlmBalance ? parseFloat(xlmBalance.balance) : 0;
  } catch (err) {
    console.error(`Error getting balance for ${publicKey}:`, err.message);
    return null;
  }
}

/**
 * Create and fund new account using Stellar Testnet Friendbot
 * Only works on testnet!
 */
async function createTestnetAccount(publicKey) {
  try {
    console.log(`\n💰 Creating Stellar Testnet account: ${publicKey}`);
    const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Account created and funded with test XLM');
      return true;
    } else {
      console.error('✗ Failed to create account:', data.detail);
      return false;
    }
  } catch (err) {
    console.error('Error creating testnet account:', err.message);
    return false;
  }
}

/**
 * Fund existing account (for businesses, investors)
 */
async function fundAccount(toPublicKey, xlmAmount) {
  if (!adminKeypair) {
    console.error('✗ Admin keypair not configured. Set STELLAR_ADMIN_SECRET in .env');
    return false;
  }

  try {
    console.log(`\n💸 Sending ${xlmAmount} XLM to ${toPublicKey}`);

    const sourceAccount = await server.loadAccount(ADMIN_PUBLIC_ADDRESS);
    
    const baseFee = await server.fetchBaseFee();
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: String(baseFee),
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination: toPublicKey,
          asset: Asset.native(),
          amount: xlmAmount.toString(),
        })
      )
      .setNetworkPassphrase(networkPassphrase)
      .build();

    transaction.sign(adminKeypair);
    const result = await server.submitTransaction(transaction);
    
    console.log('✓ Payment successful');
    console.log(`  Transaction ID: ${result.id}`);
    return true;
  } catch (err) {
    console.error('✗ Payment failed:', err.message);
    return false;
  }
}

/**
 * Setup INVX trustline for account
 */
async function setupINVXTrustline(accountPublicKey, accountSecret, invxIssuer) {
  if (!invxIssuer) {
    console.warn('⚠ INVX_CONTRACT_ADDRESS not set. Skipping trustline setup.');
    return false;
  }

  try {
    console.log(`\n🔗 Setting up INVX trustline for ${accountPublicKey}`);

    const account = await server.loadAccount(accountPublicKey);
    const keypair = Keypair.fromSecret(accountSecret);

    const baseFee = await server.fetchBaseFee();
    const transaction = new TransactionBuilder(account, {
      fee: String(baseFee),
      networkPassphrase: networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset('INVX', invxIssuer),
          limit: '1000000000', // 1 billion INVX max
        })
      )
      .setNetworkPassphrase(networkPassphrase)
      .build();

    transaction.sign(keypair);
    const result = await server.submitTransaction(transaction);

    console.log('✓ INVX trustline established');
    console.log(`  Transaction ID: ${result.id}`);
    return true;
  } catch (err) {
    console.error('✗ Trustline setup failed:', err.message);
    return false;
  }
}

/**
 * Verify admin account setup
 */
async function verifyAdminAccount() {
  console.log('\n📋 Verifying Admin Account Setup\n');
  console.log(`Admin Public Address: ${ADMIN_PUBLIC_ADDRESS}`);

  const exists = await accountExists(ADMIN_PUBLIC_ADDRESS);
  if (!exists) {
    console.log('⚠ Admin account does not exist on Stellar Testnet');
    console.log('Creating account using Friendbot...');
    const created = await createTestnetAccount(ADMIN_PUBLIC_ADDRESS);
    if (!created) {
      console.error('✗ Failed to create admin account');
      process.exit(1);
    }
  } else {
    console.log('✓ Admin account exists');
  }

  const balance = await getXLMBalance(ADMIN_PUBLIC_ADDRESS);
  if (balance !== null) {
    console.log(`✓ Admin XLM Balance: ${balance} XLM`);
    if (balance < 1) {
      console.warn('⚠ Low balance! Consider funding the admin account.');
    }
  }

  if (adminKeypair) {
    console.log('✓ Admin keypair configured');
  } else {
    console.warn('⚠ Admin keypair not configured (STELLAR_ADMIN_SECRET not set)');
  }

  console.log('\n✓ Admin account verification complete');
}

/**
 * Interactive setup wizard
 */
async function interactiveSetup() {
  console.log('\n🌟 Stellar Account Initialization Wizard\n');

  await verifyAdminAccount();

  const actionNum = await prompt('\nChoose action:\n1. Fund new account\n2. Setup trustline\n3. Check balance\n4. Exit\n\nChoice: ');

  switch (actionNum) {
    case '1': {
      const publicKey = await prompt('Enter public key: ');
      const amount = await prompt('Amount (XLM): ');
      
      // First check if account exists
      const exists = await accountExists(publicKey);
      if (!exists) {
        const create = await prompt('Account does not exist. Create via Friendbot? (y/n): ');
        if (create === 'y') {
          await createTestnetAccount(publicKey);
        }
      }
      
      // Fund it
      await fundAccount(publicKey, parseFloat(amount));
      break;
    }
    case '2': {
      const publicKey = await prompt('Account public key: ');
      const secret = await prompt('Account secret key: ');
      const invxIssuer = process.env.INVX_CONTRACT_ADDRESS || '';
      await setupINVXTrustline(publicKey, secret, invxIssuer);
      break;
    }
    case '3': {
      const publicKey = await prompt('Enter public key: ');
      const balance = await getXLMBalance(publicKey);
      if (balance !== null) {
        console.log(`\nBalance: ${balance} XLM`);
      }
      break;
    }
    case '4':
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
  }

  rl.close();
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'verify':
        await verifyAdminAccount();
        break;
      case 'fund':
        {
          const toAddress = process.argv[3];
          const amount = process.argv[4];
          if (!toAddress || !amount) {
            console.error('Usage: node scripts/initializeStellarAccounts.js fund <address> <amount>');
            process.exit(1);
          }
          await fundAccount(toAddress, parseFloat(amount));
        }
        break;
      case 'create':
        {
          const publicKey = process.argv[3];
          if (!publicKey) {
            console.error('Usage: node scripts/initializeStellarAccounts.js create <publicKey>');
            process.exit(1);
          }
          await createTestnetAccount(publicKey);
        }
        break;
      default:
        await interactiveSetup();
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
