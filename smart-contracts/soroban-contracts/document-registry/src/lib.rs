#![no_std]

//! DocumentRegistry Contract for Stellar/Soroban
//!
//! Soroban smart contract for Stellar blockchain
//!
//! Stores document hashes, verification attestations, and ZK range proofs on-chain.
//! - Documents are never stored, only their SHA-256 hashes
//! - Trusted verifiers (backend oracle) register attestations
//! - Anyone can verify document integrity against stored hashes
//! - Immutable records — once stored, cannot be deleted

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;
const PERSIST_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const PERSIST_LIFETIME_THRESHOLD: u32 = PERSIST_BUMP_AMOUNT - DAY_IN_LEDGERS;

// ── Enums ──

#[contracttype]
#[derive(Clone, PartialEq)]
#[repr(u32)]
pub enum VerificationStatus {
    Pending = 0,
    Verified = 1,
    Failed = 2,
}

// ── Structs ──

#[contracttype]
#[derive(Clone)]
pub struct DocumentRecord {
    pub document_hash: BytesN<32>,
    pub encrypted_cid: String,
    pub registered_at: u64,
    pub exists: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Attestation {
    pub claim: String,
    pub status: VerificationStatus,
    pub proof_hash: BytesN<32>,
    pub timestamp: u64,
    pub method: String,
}

#[contracttype]
#[derive(Clone)]
pub struct RangeProof {
    pub claim: String,
    pub threshold: i128,
    pub is_above: bool,
    pub zk_proof_hash: BytesN<32>,
    pub verified_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct VerificationSummary {
    pub total: u32,
    pub verified: u32,
    pub range_proof_count: u32,
}

// ── Storage ──

#[derive(Clone)]
#[contracttype]
pub struct DocKey {
    pub business_hash: BytesN<32>,
    pub doc_type: String,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    TrustedVerifier(Address),
    Document(DocKey),
    Attestations(BytesN<32>),    // business_hash → Vec<Attestation>
    RangeProofs(BytesN<32>),     // business_hash → Vec<RangeProof>
    VerifiedCount(BytesN<32>),   // business_hash → u32
    TotalClaimCount(BytesN<32>), // business_hash → u32
}

// ── Contract ──

#[contract]
pub struct DocumentRegistry;

#[contractimpl]
impl DocumentRegistry {
    /// Initialize document registry
    /// - admin: initial owner and verifier
    pub fn __constructor(e: Env, admin: Address) {
        e.storage().instance().set(&DataKey::Admin, &admin);
        // Owner is also initial verifier
        e.storage()
            .instance()
            .set(&DataKey::TrustedVerifier(admin), &true);
    }

    // ── Document Registration ──

    /// Register a document hash on-chain
    pub fn register_document(
        e: Env,
        business_hash: BytesN<32>,
        doc_type: String,
        doc_hash: BytesN<32>,
        encrypted_cid: String,
    ) {
        Self::require_verifier(&e);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let key = DataKey::Document(DocKey {
            business_hash: business_hash.clone(),
            doc_type,
        });

        // Check if already registered
        if let Some(existing) = e.storage().persistent().get::<_, DocumentRecord>(&key) {
            if existing.exists {
                panic!("Document already registered");
            }
        }

        let record = DocumentRecord {
            document_hash: doc_hash,
            encrypted_cid,
            registered_at: e.ledger().timestamp(),
            exists: true,
        };

        e.storage().persistent().set(&key, &record);
        e.storage()
            .persistent()
            .extend_ttl(&key, PERSIST_LIFETIME_THRESHOLD, PERSIST_BUMP_AMOUNT);
    }

    // ── Attestations ──

    /// Add a verification attestation for a business
    pub fn add_attestation(
        e: Env,
        business_hash: BytesN<32>,
        claim: String,
        status: VerificationStatus,
        proof_hash: BytesN<32>,
        method: String,
    ) {
        Self::require_verifier(&e);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let att_key = DataKey::Attestations(business_hash.clone());

        let mut attestations: Vec<Attestation> = e
            .storage()
            .persistent()
            .get(&att_key)
            .unwrap_or(Vec::new(&e));

        attestations.push_back(Attestation {
            claim,
            status: status.clone(),
            proof_hash,
            timestamp: e.ledger().timestamp(),
            method,
        });

        e.storage().persistent().set(&att_key, &attestations);
        e.storage().persistent().extend_ttl(
            &att_key,
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );

        // Update counts
        let tc_key = DataKey::TotalClaimCount(business_hash.clone());
        let total: u32 = e.storage().persistent().get(&tc_key).unwrap_or(0);
        e.storage().persistent().set(&tc_key, &(total + 1));

        if status == VerificationStatus::Verified {
            let vc_key = DataKey::VerifiedCount(business_hash);
            let verified: u32 = e.storage().persistent().get(&vc_key).unwrap_or(0);
            e.storage().persistent().set(&vc_key, &(verified + 1));
        }
    }

    // ── Range Proofs ──

    /// Add a ZK range proof result for a business
    pub fn add_range_proof(
        e: Env,
        business_hash: BytesN<32>,
        claim: String,
        threshold: i128,
        is_above: bool,
        zk_proof_hash: BytesN<32>,
    ) {
        Self::require_verifier(&e);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let rp_key = DataKey::RangeProofs(business_hash);

        let mut range_proofs: Vec<RangeProof> = e
            .storage()
            .persistent()
            .get(&rp_key)
            .unwrap_or(Vec::new(&e));

        range_proofs.push_back(RangeProof {
            claim,
            threshold,
            is_above,
            zk_proof_hash,
            verified_at: e.ledger().timestamp(),
        });

        e.storage().persistent().set(&rp_key, &range_proofs);
        e.storage().persistent().extend_ttl(
            &rp_key,
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );
    }

    // ── View Functions ──

    /// Verify if a document hash matches what's stored on-chain
    pub fn verify_document_integrity(
        e: Env,
        business_hash: BytesN<32>,
        doc_type: String,
        provided_hash: BytesN<32>,
    ) -> bool {
        let key = DataKey::Document(DocKey {
            business_hash,
            doc_type,
        });

        if let Some(record) = e.storage().persistent().get::<_, DocumentRecord>(&key) {
            if !record.exists {
                return false;
            }
            record.document_hash == provided_hash
        } else {
            false
        }
    }

    /// Get all attestations for a business
    pub fn get_attestations(e: Env, business_hash: BytesN<32>) -> Vec<Attestation> {
        e.storage()
            .persistent()
            .get(&DataKey::Attestations(business_hash))
            .unwrap_or(Vec::new(&e))
    }

    /// Get all range proofs for a business
    pub fn get_range_proofs(e: Env, business_hash: BytesN<32>) -> Vec<RangeProof> {
        e.storage()
            .persistent()
            .get(&DataKey::RangeProofs(business_hash))
            .unwrap_or(Vec::new(&e))
    }

    /// Get verification summary for a business
    pub fn get_verification_summary(e: Env, business_hash: BytesN<32>) -> VerificationSummary {
        let total: u32 = e
            .storage()
            .persistent()
            .get(&DataKey::TotalClaimCount(business_hash.clone()))
            .unwrap_or(0);
        let verified: u32 = e
            .storage()
            .persistent()
            .get(&DataKey::VerifiedCount(business_hash.clone()))
            .unwrap_or(0);
        let range_proofs: Vec<RangeProof> = e
            .storage()
            .persistent()
            .get(&DataKey::RangeProofs(business_hash))
            .unwrap_or(Vec::new(&e));

        VerificationSummary {
            total,
            verified,
            range_proof_count: range_proofs.len(),
        }
    }

    /// Get document record details
    pub fn get_document(e: Env, business_hash: BytesN<32>, doc_type: String) -> DocumentRecord {
        let key = DataKey::Document(DocKey {
            business_hash,
            doc_type,
        });
        e.storage().persistent().get(&key).unwrap()
    }

    // ── Admin Functions ──

    /// Add a trusted verifier
    pub fn add_verifier(e: Env, verifier: Address) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage()
            .instance()
            .set(&DataKey::TrustedVerifier(verifier), &true);
    }

    /// Remove a trusted verifier
    pub fn remove_verifier(e: Env, verifier: Address) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage()
            .instance()
            .set(&DataKey::TrustedVerifier(verifier), &false);
    }

    // ── Internal ──

    fn require_verifier(e: &Env) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
    }
}
