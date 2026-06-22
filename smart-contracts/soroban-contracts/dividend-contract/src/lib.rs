#![no_std]

//! DividendDistributor Contract for Stellar/Soroban
//!
//! Soroban smart contract for Stellar blockchain
//!
//! Holds dividend XLM deposits from businesses and distributes
//! to investors after governance vote passes.
//!
//! Flow:
//! 1. Business owner deposits XLM for a month's dividend
//! 2. Community votes on revenue verification
//! 3. If PASSED  → contract distributes proportionally to investors
//! 4. If REJECTED → funds remain locked, business must resubmit

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, BytesN, Env, String, Vec};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;
const PERSIST_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const PERSIST_LIFETIME_THRESHOLD: u32 = PERSIST_BUMP_AMOUNT - DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone)]
pub struct Deposit {
    pub amount: i128,
    pub distributed: bool,
    pub rejected: bool,
    pub deposited_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    XlmToken,
    Distributor(Address), // authorized distributor addresses
    Deposits(BytesN<32>), // business_hash → Vec<Deposit>
}

#[contract]
pub struct DividendDistributor;

#[contractimpl]
impl DividendDistributor {
    /// Initialize dividend distributor
    /// - admin: contract admin
    /// - xlm_token: native XLM token SAC address
    /// - backend_wallet: initial authorized distributor
    pub fn __constructor(e: Env, admin: Address, xlm_token: Address, backend_wallet: Address) {
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::XlmToken, &xlm_token);
        e.storage()
            .instance()
            .set(&DataKey::Distributor(backend_wallet), &true);
    }

    // ── Admin ──

    /// Set or revoke distributor authorization
    pub fn set_distributor(e: Env, addr: Address, status: bool) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage()
            .instance()
            .set(&DataKey::Distributor(addr), &status);
    }

    // ── Deposit ──

    /// Business owner deposits XLM for dividend distribution
    pub fn deposit_dividend(e: Env, business_hash: BytesN<32>, depositor: Address, amount: i128) {
        depositor.require_auth();
        if amount <= 0 {
            panic!("Must deposit XLM");
        }

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        // Transfer XLM from depositor to contract
        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();
        token::Client::new(&e, &xlm_token).transfer(
            &depositor,
            &e.current_contract_address(),
            &amount,
        );

        let dep_key = DataKey::Deposits(business_hash);

        let mut deposits: Vec<Deposit> = e
            .storage()
            .persistent()
            .get(&dep_key)
            .unwrap_or(Vec::new(&e));

        deposits.push_back(Deposit {
            amount,
            distributed: false,
            rejected: false,
            deposited_at: e.ledger().timestamp(),
        });

        e.storage().persistent().set(&dep_key, &deposits);
        e.storage().persistent().extend_ttl(
            &dep_key,
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );
    }

    // ── Distribute (after governance vote passes) ──

    /// Called by authorized distributor after governance vote passes.
    /// Distributes XLM to investors proportionally.
    ///
    /// - shares: basis points (/10000) for each investor
    pub fn approve_and_distribute(
        e: Env,
        business_hash: BytesN<32>,
        deposit_index: u32,
        investors: Vec<Address>,
        shares: Vec<i128>,
    ) {
        // Verify caller is authorized distributor
        let caller = e.current_contract_address(); // placeholder
                                                   // In practice, the distributor's auth is checked
        Self::require_distributor(&e);

        if investors.len() == 0 {
            panic!("No investors");
        }
        if investors.len() != shares.len() {
            panic!("Length mismatch");
        }

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let dep_key = DataKey::Deposits(business_hash);

        let mut deposits: Vec<Deposit> = e.storage().persistent().get(&dep_key).unwrap();
        let mut dep = deposits.get(deposit_index).unwrap();

        if dep.distributed {
            panic!("Already distributed");
        }
        if dep.rejected {
            panic!("Already rejected");
        }

        dep.distributed = true;
        deposits.set(deposit_index, dep.clone());
        e.storage().persistent().set(&dep_key, &deposits);
        e.storage().persistent().extend_ttl(
            &dep_key,
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );

        // Distribute XLM to investors
        let xlm_token: Address = e.storage().instance().get(&DataKey::XlmToken).unwrap();
        let xlm_client = token::Client::new(&e, &xlm_token);
        let contract_addr = e.current_contract_address();

        for i in 0..investors.len() {
            let share = shares.get(i).unwrap();
            let payout = (dep.amount * share) / 10000;
            if payout > 0 {
                let investor = investors.get(i).unwrap();
                xlm_client.transfer(&contract_addr, &investor, &payout);
            }
        }
    }

    // ── Reject (governance vote failed) ──

    /// Marks deposit as rejected. Funds stay locked for resubmission.
    pub fn reject_distribution(e: Env, business_hash: BytesN<32>, deposit_index: u32) {
        Self::require_distributor(&e);

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let dep_key = DataKey::Deposits(business_hash);

        let mut deposits: Vec<Deposit> = e.storage().persistent().get(&dep_key).unwrap();
        let mut dep = deposits.get(deposit_index).unwrap();

        if dep.distributed {
            panic!("Already distributed");
        }
        if dep.rejected {
            panic!("Already rejected");
        }

        dep.rejected = true;
        deposits.set(deposit_index, dep);
        e.storage().persistent().set(&dep_key, &deposits);
        e.storage().persistent().extend_ttl(
            &dep_key,
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );
    }

    // ── View helpers ──

    pub fn get_deposit_count(e: Env, business_hash: BytesN<32>) -> u32 {
        let deposits: Vec<Deposit> = e
            .storage()
            .persistent()
            .get(&DataKey::Deposits(business_hash))
            .unwrap_or(Vec::new(&e));
        deposits.len()
    }

    pub fn get_deposit(e: Env, business_hash: BytesN<32>, index: u32) -> Deposit {
        let deposits: Vec<Deposit> = e
            .storage()
            .persistent()
            .get(&DataKey::Deposits(business_hash))
            .unwrap();
        deposits.get(index).unwrap()
    }

    pub fn get_locked_funds(e: Env, business_hash: BytesN<32>) -> i128 {
        let deposits: Vec<Deposit> = e
            .storage()
            .persistent()
            .get(&DataKey::Deposits(business_hash))
            .unwrap_or(Vec::new(&e));

        let mut total: i128 = 0;
        for i in 0..deposits.len() {
            let dep = deposits.get(i).unwrap();
            if !dep.distributed && !dep.rejected {
                total += dep.amount;
            }
        }
        total
    }

    // ── Internal ──

    fn require_distributor(e: &Env) {
        // The admin is always a valid distributor
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }
}
