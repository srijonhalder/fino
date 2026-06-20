//! BusinessToken Contract for Stellar/Soroban
//!
//! Soroban smart contract for Stellar blockchain - SEP-41 Token Standard
//!
//! Each approved business gets its own token representing fractional ownership.
//! - Zero decimals (1 token = 1 share)
//! - Stores businessId, tokenPriceINR, fundingGoalINR on-chain
//! - Owner-only mint/burn
//! - SEP-41 compliant token interface

use crate::storage::*;
use soroban_sdk::{contract, contractimpl, token::TokenInterface, Address, Env, String};
use soroban_token_sdk::metadata::TokenMetadata;
use soroban_token_sdk::TokenUtils;

fn check_nonnegative_amount(amount: i128) {
    if amount < 0 {
        panic!("negative amount is not allowed: {}", amount)
    }
}

fn read_admin(e: &Env) -> Address {
    e.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_balance(e: &Env, addr: Address) -> i128 {
    let key = DataKey::Balance(addr);
    if let Some(balance) = e.storage().persistent().get::<DataKey, i128>(&key) {
        e.storage()
            .persistent()
            .extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
        balance
    } else {
        0
    }
}

fn write_balance(e: &Env, addr: Address, amount: i128) {
    let key = DataKey::Balance(addr);
    e.storage().persistent().set(&key, &amount);
    e.storage()
        .persistent()
        .extend_ttl(&key, BALANCE_LIFETIME_THRESHOLD, BALANCE_BUMP_AMOUNT);
}

fn read_total_supply(e: &Env) -> i128 {
    e.storage()
        .instance()
        .get(&DataKey::TotalSupply)
        .unwrap_or(0)
}

fn write_total_supply(e: &Env, amount: i128) {
    e.storage().instance().set(&DataKey::TotalSupply, &amount);
}

fn read_allowance(e: &Env, from: Address, spender: Address) -> AllowanceValue {
    let key = DataKey::Allowance(AllowanceDataKey { from, spender });
    if let Some(allowance) = e.storage().temporary().get::<_, AllowanceValue>(&key) {
        if allowance.expiration_ledger < e.ledger().sequence() {
            AllowanceValue {
                amount: 0,
                expiration_ledger: allowance.expiration_ledger,
            }
        } else {
            allowance
        }
    } else {
        AllowanceValue {
            amount: 0,
            expiration_ledger: 0,
        }
    }
}

fn write_allowance(e: &Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
    if amount > 0 && expiration_ledger < e.ledger().sequence() {
        panic!("expiration_ledger is less than ledger seq when amount > 0");
    }
    let key = DataKey::Allowance(AllowanceDataKey { from, spender });
    let allowance = AllowanceValue {
        amount,
        expiration_ledger,
    };
    e.storage().temporary().set(&key.clone(), &allowance);
    if amount > 0 {
        let live_for = expiration_ledger
            .checked_sub(e.ledger().sequence())
            .unwrap();
        e.storage().temporary().extend_ttl(&key, live_for, live_for);
    }
}

fn spend_allowance(e: &Env, from: Address, spender: Address, amount: i128) {
    let allowance = read_allowance(e, from.clone(), spender.clone());
    if allowance.amount < amount {
        panic!("insufficient allowance");
    }
    if amount > 0 {
        write_allowance(
            e,
            from,
            spender,
            allowance.amount - amount,
            allowance.expiration_ledger,
        );
    }
}

#[contract]
pub struct BusinessToken;

#[contractimpl]
impl BusinessToken {
    /// Deploy a new business token
    /// - admin: Fino admin wallet
    /// - name: e.g. "Chai Corner Token"
    /// - symbol: e.g. "CCT"
    /// - total_supply: number of tokens (shares) to mint to admin
    /// - business_id: MongoDB ObjectId of the business
    /// - token_price_inr: price per token in INR
    /// - funding_goal_inr: total funding goal in INR
    pub fn __constructor(
        e: Env,
        admin: Address,
        name: String,
        symbol: String,
        total_supply: i128,
        business_id: String,
        token_price_inr: i128,
        funding_goal_inr: i128,
    ) {
        if total_supply <= 0 {
            panic!("Total supply must be > 0");
        }

        e.storage().instance().set(&DataKey::Admin, &admin);

        // 0 decimals — 1 token = 1 share
        TokenUtils::new(&e).metadata().set_metadata(&TokenMetadata {
            decimal: 0,
            name,
            symbol,
        });

        // Store business metadata on-chain
        let info = BusinessInfo {
            business_id,
            token_price_inr,
            funding_goal_inr,
        };
        e.storage().instance().set(&DataKey::BusinessInfo, &info);

        // Mint total supply to admin (escrow)
        write_balance(&e, admin.clone(), total_supply);
        write_total_supply(&e, total_supply);
        TokenUtils::new(&e)
            .events()
            .mint(admin.clone(), admin, total_supply);
    }

    /// Admin-only: mint additional tokens
    pub fn mint(e: Env, to: Address, amount: i128) {
        check_nonnegative_amount(amount);
        let admin = read_admin(&e);
        admin.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let supply = read_total_supply(&e);
        write_total_supply(&e, supply + amount);
        let bal = read_balance(&e, to.clone());
        write_balance(&e, to.clone(), bal + amount);
        TokenUtils::new(&e).events().mint(admin, to, amount);
    }

    /// Admin-only: burn tokens from a given address
    pub fn admin_burn(e: Env, from: Address, amount: i128) {
        check_nonnegative_amount(amount);
        let admin = read_admin(&e);
        admin.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let bal = read_balance(&e, from.clone());
        if bal < amount {
            panic!("insufficient balance to burn");
        }
        write_balance(&e, from.clone(), bal - amount);
        let supply = read_total_supply(&e);
        write_total_supply(&e, supply - amount);
        TokenUtils::new(&e).events().burn(from, amount);
    }

    /// Returns on-chain business metadata
    pub fn get_business_info(e: Env) -> BusinessInfo {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage().instance().get(&DataKey::BusinessInfo).unwrap()
    }

    /// Returns total supply
    pub fn total_supply(e: Env) -> i128 {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        read_total_supply(&e)
    }

    /// Returns circulating supply (total - admin balance)
    pub fn circulating_supply(e: Env) -> i128 {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        let admin = read_admin(&e);
        let total = read_total_supply(&e);
        let admin_bal = read_balance(&e, admin);
        total - admin_bal
    }
}

#[contractimpl]
impl TokenInterface for BusinessToken {
    fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        read_allowance(&e, from, spender).amount
    }

    fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        check_nonnegative_amount(amount);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        write_allowance(&e, from.clone(), spender.clone(), amount, expiration_ledger);
        TokenUtils::new(&e)
            .events()
            .approve(from, spender, amount, expiration_ledger);
    }

    fn balance(e: Env, id: Address) -> i128 {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        read_balance(&e, id)
    }

    fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        check_nonnegative_amount(amount);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let from_bal = read_balance(&e, from.clone());
        if from_bal < amount {
            panic!("insufficient balance");
        }
        write_balance(&e, from.clone(), from_bal - amount);
        let to_bal = read_balance(&e, to.clone());
        write_balance(&e, to.clone(), to_bal + amount);
        TokenUtils::new(&e).events().transfer(from, to, amount);
    }

    fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative_amount(amount);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_allowance(&e, from.clone(), spender, amount);
        let from_bal = read_balance(&e, from.clone());
        if from_bal < amount {
            panic!("insufficient balance");
        }
        write_balance(&e, from.clone(), from_bal - amount);
        let to_bal = read_balance(&e, to.clone());
        write_balance(&e, to.clone(), to_bal + amount);
        TokenUtils::new(&e).events().transfer(from, to, amount);
    }

    fn burn(e: Env, from: Address, amount: i128) {
        from.require_auth();
        check_nonnegative_amount(amount);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let bal = read_balance(&e, from.clone());
        if bal < amount {
            panic!("insufficient balance");
        }
        write_balance(&e, from.clone(), bal - amount);
        let supply = read_total_supply(&e);
        write_total_supply(&e, supply - amount);
        TokenUtils::new(&e).events().burn(from, amount);
    }

    fn burn_from(e: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        check_nonnegative_amount(amount);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        spend_allowance(&e, from.clone(), spender, amount);
        let bal = read_balance(&e, from.clone());
        if bal < amount {
            panic!("insufficient balance");
        }
        write_balance(&e, from.clone(), bal - amount);
        let supply = read_total_supply(&e);
        write_total_supply(&e, supply - amount);
        TokenUtils::new(&e).events().burn(from, amount);
    }

    fn decimals(_e: Env) -> u32 {
        0 // 1 token = 1 share
    }

    fn name(e: Env) -> String {
        TokenUtils::new(&e).metadata().get_metadata().name
    }

    fn symbol(e: Env) -> String {
        TokenUtils::new(&e).metadata().get_metadata().symbol
    }
}
