#![no_std]

//! FinoGovernance Contract for Stellar/Soroban
//!
//! Soroban smart contract for Stellar blockchain
//!
//! Community governance contract:
//! - Open voting: 1 wallet = 1 vote (no token requirement)
//! - 3 minimum voters (quorum)
//! - >60% approval threshold
//! - Equal voting power for all participants
//! - 15-minute voting periods (testing; 2 days for production)

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

const DAY_IN_LEDGERS: u32 = 17280;
const INSTANCE_BUMP_AMOUNT: u32 = 7 * DAY_IN_LEDGERS;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;
const PERSIST_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const PERSIST_LIFETIME_THRESHOLD: u32 = PERSIST_BUMP_AMOUNT - DAY_IN_LEDGERS;

// ── Configuration Constants ──
const MIN_VOTERS: u32 = 3;
const APPROVAL_PERCENT: u32 = 60;
const EMERGENCY_APPROVAL: u32 = 80;
const EMERGENCY_MIN_VOTERS: u32 = 5;
const VOTING_DURATION_SECS: u64 = 15 * 60; // 15 minutes for testing

// ── Enums ──

#[contracttype]
#[derive(Clone, PartialEq)]
#[repr(u32)]
pub enum ProposalType {
    BusinessApproval = 0,
    RevenueVerification = 1,
    ParameterChange = 2,
    EmergencyDelist = 3,
}

#[contracttype]
#[derive(Clone, PartialEq)]
#[repr(u32)]
pub enum ProposalStatus {
    Active = 0,
    Passed = 1,
    Rejected = 2,
    Executed = 3,
}

// ── Structs ──

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub proposal_type: ProposalType,
    pub business_hash: BytesN<32>,
    pub metadata_ipfs: String,
    pub proposer: Address,
    pub start_time: u64,
    pub end_time: u64,
    pub upvote_weight: i128,
    pub downvote_weight: i128,
    pub voter_count: u32,
    pub status: ProposalStatus,
    pub executed: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct VoteRecord {
    pub has_voted: bool,
    pub support: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct VoteResult {
    pub upvotes: i128,
    pub downvotes: i128,
    pub voters: u32,
    pub status: ProposalStatus,
}

// ── Storage ──

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    ProposalCount,
    Proposal(u32),            // proposal_id → Proposal
    Vote(u32, Address),       // (proposal_id, voter) → VoteRecord
    Voters(u32),              // proposal_id → Vec<Address>
    ProposalCreator(Address), // authorized proposal creators
}

// ── Contract ──

#[contract]
pub struct FinoGovernance;

#[contractimpl]
impl FinoGovernance {
    /// Initialize governance contract
    /// - admin: initial owner and proposal creator
    pub fn __constructor(e: Env, admin: Address) {
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::ProposalCount, &0u32);
        // Owner is also initial proposal creator
        e.storage()
            .instance()
            .set(&DataKey::ProposalCreator(admin), &true);
    }

    // ── Core Functions ──

    /// Create a new governance proposal
    pub fn create_proposal(
        e: Env,
        proposer: Address,
        proposal_type: ProposalType,
        business_hash: BytesN<32>,
        metadata_ipfs: String,
    ) -> u32 {
        proposer.require_auth();

        // Check proposer is authorized
        let is_creator: bool = e
            .storage()
            .instance()
            .get(&DataKey::ProposalCreator(proposer.clone()))
            .unwrap_or(false);
        if !is_creator {
            panic!("Not a proposal creator");
        }

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let count: u32 = e.storage().instance().get(&DataKey::ProposalCount).unwrap();
        let new_id = count + 1;

        let now = e.ledger().timestamp();
        let proposal = Proposal {
            id: new_id,
            proposal_type,
            business_hash,
            metadata_ipfs,
            proposer,
            start_time: now,
            end_time: now + VOTING_DURATION_SECS,
            upvote_weight: 0,
            downvote_weight: 0,
            voter_count: 0,
            status: ProposalStatus::Active,
            executed: false,
        };

        e.storage().instance().set(&DataKey::ProposalCount, &new_id);
        e.storage()
            .persistent()
            .set(&DataKey::Proposal(new_id), &proposal);
        e.storage().persistent().extend_ttl(
            &DataKey::Proposal(new_id),
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );

        // Initialize voters list
        let voters: Vec<Address> = Vec::new(&e);
        e.storage()
            .persistent()
            .set(&DataKey::Voters(new_id), &voters);

        new_id
    }

    /// Cast a vote on a proposal
    pub fn vote(e: Env, voter: Address, proposal_id: u32, support: bool) {
        voter.require_auth();

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let mut proposal: Proposal = e
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .unwrap();

        if proposal.id == 0 {
            panic!("Proposal does not exist");
        }
        if proposal.status != ProposalStatus::Active {
            panic!("Not active");
        }

        let now = e.ledger().timestamp();
        if now > proposal.end_time {
            panic!("Voting ended");
        }

        // Check not already voted
        let vote_key = DataKey::Vote(proposal_id, voter.clone());
        if let Some(record) = e.storage().persistent().get::<_, VoteRecord>(&vote_key) {
            if record.has_voted {
                panic!("Already voted");
            }
        }

        // Each voter gets equal weight of 1
        let effective_weight: i128 = 1;

        // Record vote
        e.storage().persistent().set(
            &vote_key,
            &VoteRecord {
                has_voted: true,
                support,
            },
        );

        // Update voters list
        let mut voters: Vec<Address> = e
            .storage()
            .persistent()
            .get(&DataKey::Voters(proposal_id))
            .unwrap_or(Vec::new(&e));
        voters.push_back(voter);
        e.storage()
            .persistent()
            .set(&DataKey::Voters(proposal_id), &voters);

        // Update proposal
        if support {
            proposal.upvote_weight += effective_weight;
        } else {
            proposal.downvote_weight += effective_weight;
        }
        proposal.voter_count += 1;

        e.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        e.storage().persistent().extend_ttl(
            &DataKey::Proposal(proposal_id),
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );
    }

    /// Finalize a proposal after voting period ends (callable by anyone)
    pub fn finalize_proposal(e: Env, proposal_id: u32) {
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let mut proposal: Proposal = e
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .unwrap();

        if proposal.id == 0 {
            panic!("Proposal does not exist");
        }
        if proposal.status != ProposalStatus::Active {
            panic!("Already finalized");
        }

        let now = e.ledger().timestamp();
        if now <= proposal.end_time {
            panic!("Voting not ended");
        }

        // Determine required quorum and threshold
        let (required_voters, required_percent) =
            if proposal.proposal_type == ProposalType::EmergencyDelist {
                (EMERGENCY_MIN_VOTERS, EMERGENCY_APPROVAL)
            } else {
                (MIN_VOTERS, APPROVAL_PERCENT)
            };

        // Check quorum
        if proposal.voter_count < required_voters {
            proposal.status = ProposalStatus::Rejected;
        } else {
            // Check approval threshold
            let total_weight = proposal.upvote_weight + proposal.downvote_weight;
            let approval_pct = if total_weight > 0 {
                ((proposal.upvote_weight * 100) / total_weight) as u32
            } else {
                0
            };

            if approval_pct >= required_percent {
                proposal.status = ProposalStatus::Passed;
            } else {
                proposal.status = ProposalStatus::Rejected;
            }
        }

        e.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        e.storage().persistent().extend_ttl(
            &DataKey::Proposal(proposal_id),
            PERSIST_LIFETIME_THRESHOLD,
            PERSIST_BUMP_AMOUNT,
        );
    }

    /// Mark a proposal as executed (called by backend after off-chain actions complete)
    pub fn mark_executed(e: Env, caller: Address, proposal_id: u32) {
        caller.require_auth();

        let is_creator: bool = e
            .storage()
            .instance()
            .get(&DataKey::ProposalCreator(caller))
            .unwrap_or(false);
        if !is_creator {
            panic!("Not authorized");
        }

        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);

        let mut proposal: Proposal = e
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .unwrap();

        if proposal.status != ProposalStatus::Passed {
            panic!("Not passed");
        }
        if proposal.executed {
            panic!("Already executed");
        }

        proposal.executed = true;
        proposal.status = ProposalStatus::Executed;

        e.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
    }

    // ── View Functions ──

    /// Get effective voting power for a wallet (always 1 for equal voting)
    pub fn get_voting_power(_e: Env, _voter: Address) -> i128 {
        1 // Everyone has equal voting power
    }

    /// Get vote result for a proposal
    pub fn get_vote_result(e: Env, proposal_id: u32) -> VoteResult {
        let proposal: Proposal = e
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .unwrap();
        VoteResult {
            upvotes: proposal.upvote_weight,
            downvotes: proposal.downvote_weight,
            voters: proposal.voter_count,
            status: proposal.status,
        }
    }

    /// Get full proposal details
    pub fn get_proposal(e: Env, proposal_id: u32) -> Proposal {
        e.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .unwrap()
    }

    /// Get proposal count
    pub fn get_proposal_count(e: Env) -> u32 {
        e.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    /// Check if a voter has voted on a proposal
    pub fn has_voted(e: Env, proposal_id: u32, voter: Address) -> VoteRecord {
        let vote_key = DataKey::Vote(proposal_id, voter);
        e.storage()
            .persistent()
            .get::<_, VoteRecord>(&vote_key)
            .unwrap_or(VoteRecord {
                has_voted: false,
                support: false,
            })
    }

    /// Get voters list for a proposal
    pub fn get_voters(e: Env, proposal_id: u32) -> Vec<Address> {
        e.storage()
            .persistent()
            .get(&DataKey::Voters(proposal_id))
            .unwrap_or(Vec::new(&e))
    }

    // ── Admin Functions ──

    /// Add or remove a proposal creator
    pub fn set_proposal_creator(e: Env, creator: Address, allowed: bool) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
        e.storage()
            .instance()
            .set(&DataKey::ProposalCreator(creator), &allowed);
    }
}
