#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, BytesN, Env, String};

// ── Storage Keys ──

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;
const BALANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const BALANCE_LIFETIME_THRESHOLD: u32 = BALANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    XlmToken,                    // Address of the XLM token contract
    Deposit(DepositKey),         // Per-business per-investor deposit
    BusinessBalance(BytesN<32>), // Total per-business
    TotalDeposited,
}

#[derive(Clone)]
#[contracttype]
pub struct DepositKey {
    pub business_hash: BytesN<32>,
    pub investor: Address,
}

// ── Contract ──

#[contract]
pub struct FinoEscrow;

#[contractimpl]
impl FinoEscrow {
    /// Initialize the escrow contract
    /// - admin: platform admin wallet
    /// - xlm_token: address of the native XLM token contract (SAC)
    pub fn __constructor(e: Env, admin: Address, xlm_token: Address) {
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        e.storage().instance().set(&DataKey::TotalDeposited, &0i128);
    }

    // ── Investor: Deposit XLM ──

    /// Investor deposits XLM for a specific business campaign.
    /// The investor must have approved the escrow contract to spend their XLM.
    ///
    /// - business_id: The MongoDB ObjectId string of the business
    /// - investor: The investor's address
    /// - amount: Amount of XLM (in stroops) to deposit
    pub fn deposit(e: Env, business_hash: BytesN<32>, investor: Address, amount: i128) {
        investor.require_auth();
        if amount <= 0 {
            panic!("Deposit must be > 0");
        }

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();

        // Transfer XLM from investor to this contract
        token::Client::new(&e, &xlm_token).transfer(
            &investor,
            &e.current_contract_address(),
            &amount,
        );

        // Update investor deposit
        let dep_key = DataKey::Deposit(DepositKey {
            business_hash: business_hash.clone(),
            investor: investor.clone(),
        });
        let current: i128 = e.storage().persistent().get(&dep_key).unwrap_or(0);
        e.storage().persistent().set(&dep_key, &(current + amount));
        e.storage().persistent().extend_ttl(
            &dep_key,
            BALANCE_LIFETIME_THRESHOLD,
            BALANCE_BUMP_AMOUNT,
        );

        // Update business balance
        let biz_key = DataKey::BusinessBalance(business_hash);
        let biz_bal: i128 = e.storage().persistent().get(&biz_key).unwrap_or(0);
        e.storage().persistent().set(&biz_key, &(biz_bal + amount));
        e.storage().persistent().extend_ttl(
            &biz_key,
            BALANCE_LIFETIME_THRESHOLD,
            BALANCE_BUMP_AMOUNT,
        );

        // Update total
        let total: i128 = e
            .storage()
            .instance()
            .get(&DataKey::TotalDeposited)
            .unwrap_or(0);
        e.storage()
            .instance()
            .set(&DataKey::TotalDeposited, &(total + amount));
    }

    // ── Admin: Release funds to business ──

    /// Release all escrowed XLM for a business to its wallet.
    /// Called by admin after funding goal is reached.
    pub fn release_to_business(e: Env, business_hash: BytesN<32>, business_wallet: Address) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let biz_key = DataKey::BusinessBalance(business_hash);
        let amount: i128 = e.storage().persistent().get(&biz_key).unwrap_or(0);
        if amount <= 0 {
            panic!("No funds to release");
        }

        // Reset business balance
        e.storage().persistent().set(&biz_key, &0i128);

        // Transfer XLM to business wallet
        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&e, &xlm_token).transfer(
            &e.current_contract_address(),
            &business_wallet,
            &amount,
        );
    }

    // ── Admin: Refund an investor ──

    /// Refund a specific investor for a specific business.
    /// Called by admin when a campaign expires without reaching goal.
    pub fn refund_investor(e: Env, business_hash: BytesN<32>, investor: Address) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let dep_key = DataKey::Deposit(DepositKey {
            business_hash: business_hash.clone(),
            investor: investor.clone(),
        });

        let amount: i128 = e.storage().persistent().get(&dep_key).unwrap_or(0);
        if amount <= 0 {
            panic!("Nothing to refund");
        }

        // Reset investor deposit
        e.storage().persistent().set(&dep_key, &0i128);

        // Decrease business balance
        let biz_key = DataKey::BusinessBalance(business_hash);
        let biz_bal: i128 = e.storage().persistent().get(&biz_key).unwrap_or(0);
        e.storage().persistent().set(&biz_key, &(biz_bal - amount));

        // Transfer XLM back to investor
        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&e, &xlm_token).transfer(
            &e.current_contract_address(),
            &investor,
            &amount,
        );
    }

    // ── Admin: Emergency withdraw ──

    /// Emergency: withdraw all XLM in the contract. Admin only.
    pub fn emergency_withdraw(e: Env, to: Address) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();
        let xlm_client = token::Client::new(&e, &xlm_token);
        let balance = xlm_client.balance(&e.current_contract_address());

        if balance <= 0 {
            panic!("No balance");
        }

        xlm_client.transfer(&e.current_contract_address(), &to, &balance);
    }

    // ── View helpers ──

    /// Get investor's deposit for a specific business
    pub fn get_deposit(e: Env, business_hash: BytesN<32>, investor: Address) -> i128 {
        let dep_key = DataKey::Deposit(DepositKey {
            business_hash,
            investor,
        });
        e.storage().persistent().get(&dep_key).unwrap_or(0)
    }

    /// Get total escrowed XLM for a business
    pub fn get_business_balance(e: Env, business_hash: BytesN<32>) -> i128 {
        e.storage()
            .persistent()
            .get(&DataKey::BusinessBalance(business_hash))
            .unwrap_or(0)
    }

    /// Get total deposited across all campaigns
    pub fn get_total_deposited(e: Env) -> i128 {
        e.storage()
            .instance()
            .get(&DataKey::TotalDeposited)
            .unwrap_or(0)
    }

    /// Get contract's XLM balance
    pub fn get_contract_balance(e: Env) -> i128 {
        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&e, &xlm_token).balance(&e.current_contract_address())
    }
}
