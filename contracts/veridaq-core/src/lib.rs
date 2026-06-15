#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, vec,
    token, Address, BytesN, Env, IntoVal, Vec, Symbol,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CoreError {
    Unauthorized = 1,
    InstitutionNotActive = 2,
    CredentialNotFound = 3,
    CredentialRevoked = 4,
    AlreadyRevoked = 5,
    AlreadyRegistered = 6,
    EmptyBatch = 7,
    ArrayLengthMismatch = 8,
    InsufficientFee = 9,
    ProofVerificationFailed = 10,
    NotFound = 11,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct CredentialRecord {
    pub commitment: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub institution_id: BytesN<32>,
    pub graduation_year: u32,
    pub degree_type_code: u32,
    pub registered_at: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Revocation {
    pub nullifier: BytesN<32>,
    pub institution_id: BytesN<32>,
    pub reason_code: u32,
    pub revoked_at: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct VerificationRequest {
    pub id: BytesN<32>,
    pub employer: Address,
    pub institution_id: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub claim_type: u32,
    pub threshold: u64,
    pub verified: bool,
    pub timestamp: u64,
    pub fee_paid: i128,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct FeeConfig {
    pub verification_fee: i128,
    pub institution_share_bps: u32,
    pub admin_share_bps: u32,
    pub pool_share_bps: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct EmployerState {
    pub free_remaining: u32,
    pub total: u32,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    InstReg,
    Groth16Verifier,
    VkHash,
    XlmAsset,
    FeeCfg,
    Record(BytesN<32>),
    Revoked(BytesN<32>),
    Employer(Address),
    Verification(BytesN<32>),
    InstBal(BytesN<32>),
    AdminBal,
    PoolBal,
    TotalCreds,
    TotalRevokes,
    TotalVerifs,
}

const FEE: i128 = 1_000_000;
const INST_BPS: u32 = 2000;
const ADMIN_BPS: u32 = 7000;
const POOL_BPS: u32 = 1000;
const BPS_DEN: u32 = 10000;
const FREE_COUNT: u32 = 3;

fn make_id(env: &Env, n: u32) -> BytesN<32> {
    let mut b = [0u8; 32];
    b[..4].copy_from_slice(&n.to_be_bytes());
    BytesN::from_array(env, &b)
}

#[contract]
pub struct VeridaqCore;

#[contractimpl]
impl VeridaqCore {
    pub fn initialize(
        env: Env, admin: Address,
        institution_registry: Address,
        groth16_verifier: Address,
        verifier_vk_hash: BytesN<32>,
        xlm_asset: Address,
    ) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("init"); }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::InstReg, &institution_registry);
        env.storage().instance().set(&DataKey::Groth16Verifier, &groth16_verifier);
        env.storage().instance().set(&DataKey::VkHash, &verifier_vk_hash);
        env.storage().instance().set(&DataKey::XlmAsset, &xlm_asset);
        env.storage().instance().set(&DataKey::AdminBal, &0i128);
        env.storage().instance().set(&DataKey::PoolBal, &0i128);
        env.storage().instance().set(&DataKey::TotalCreds, &0u32);
        env.storage().instance().set(&DataKey::TotalRevokes, &0u32);
        env.storage().instance().set(&DataKey::TotalVerifs, &0u32);
        env.storage().instance().set(&DataKey::FeeCfg, &FeeConfig {
            verification_fee: FEE, institution_share_bps: INST_BPS,
            admin_share_bps: ADMIN_BPS, pool_share_bps: POOL_BPS,
        });
    }

    // ── Credentials ──────────────────────────────────────────────────

    pub fn register_batch(
        env: Env, caller: Address, institution_id: BytesN<32>,
        commitments: Vec<BytesN<32>>, nullifiers: Vec<BytesN<32>>,
        graduation_year: u32, degree_type_code: u32,
    ) -> Result<u32, CoreError> {
        if commitments.len() == 0 { return Err(CoreError::EmptyBatch); }
        if commitments.len() != nullifiers.len() { return Err(CoreError::ArrayLengthMismatch); }
        caller.require_auth();

        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(CoreError::Unauthorized)?;
        if caller != admin { return Err(CoreError::Unauthorized); }

        let reg: Address = env.storage().instance().get(&DataKey::InstReg).ok_or(CoreError::NotFound)?;
        let active: bool = env.invoke_contract(
            &reg,
            &Symbol::new(&env, "is_active"),
            (institution_id.clone(),).into_val(&env),
        );
        if !active { return Err(CoreError::InstitutionNotActive); }

        let count = commitments.len();
        for i in 0..count {
            let n = nullifiers.get(i).unwrap();
            let c = commitments.get(i).unwrap();
            if env.storage().persistent().has(&DataKey::Record(n.clone())) {
                return Err(CoreError::AlreadyRegistered);
            }
            env.storage().persistent().set(&DataKey::Record(n.clone()), &CredentialRecord {
                commitment: c, nullifier: n, institution_id: institution_id.clone(),
                graduation_year, degree_type_code, registered_at: env.ledger().timestamp(),
            });
        }

        let t: u32 = env.storage().instance().get(&DataKey::TotalCreds).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalCreds, &(t + count));
        Ok(count)
    }

    pub fn get_record(env: Env, nullifier: BytesN<32>) -> Result<CredentialRecord, CoreError> {
        env.storage().persistent().get(&DataKey::Record(nullifier)).ok_or(CoreError::CredentialNotFound)
    }

    pub fn exists(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Record(nullifier))
    }

    pub fn total_credentials(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalCreds).unwrap_or(0)
    }

    // ── Revocation ───────────────────────────────────────────────────

    pub fn revoke(env: Env, caller: Address, nullifier: BytesN<32>, rsn: u32) -> Result<(), CoreError> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(CoreError::Unauthorized)?;
        if caller != admin { return Err(CoreError::Unauthorized); }
        if env.storage().persistent().has(&DataKey::Revoked(nullifier.clone())) {
            return Err(CoreError::AlreadyRevoked);
        }
        let cred: CredentialRecord = env.storage().persistent()
            .get(&DataKey::Record(nullifier.clone())).ok_or(CoreError::CredentialNotFound)?;

        env.storage().persistent().set(&DataKey::Revoked(nullifier.clone()), &Revocation {
            nullifier, institution_id: cred.institution_id, reason_code: rsn,
            revoked_at: env.ledger().timestamp(),
        });
        let t: u32 = env.storage().instance().get(&DataKey::TotalRevokes).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalRevokes, &(t + 1));
        Ok(())
    }

    pub fn is_revoked(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Revoked(nullifier))
    }

    pub fn total_revoked(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalRevokes).unwrap_or(0)
    }

    // ── Fees ─────────────────────────────────────────────────────────

    pub fn get_fee_config(env: Env) -> FeeConfig {
        env.storage().instance().get(&DataKey::FeeCfg).unwrap_or(FeeConfig {
            verification_fee: FEE, institution_share_bps: INST_BPS,
            admin_share_bps: ADMIN_BPS, pool_share_bps: POOL_BPS,
        })
    }

    pub fn set_fee(env: Env, caller: Address, fee: i128) -> Result<(), CoreError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(CoreError::Unauthorized)?;
        caller.require_auth();
        if caller != admin { return Err(CoreError::Unauthorized); }
        let mut c: FeeConfig = env.storage().instance().get(&DataKey::FeeCfg).ok_or(CoreError::NotFound)?;
        c.verification_fee = fee;
        env.storage().instance().set(&DataKey::FeeCfg, &c);
        Ok(())
    }

    pub fn get_inst_balance(env: Env, id: BytesN<32>) -> i128 {
        env.storage().persistent().get(&DataKey::InstBal(id)).unwrap_or(0)
    }

    pub fn get_admin_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::AdminBal).unwrap_or(0)
    }

    pub fn get_pool_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::PoolBal).unwrap_or(0)
    }

    pub fn withdraw_inst(env: Env, caller: Address, id: BytesN<32>, amt: i128) -> Result<(), CoreError> {
        caller.require_auth();
        let reg: Address = env.storage().instance().get(&DataKey::InstReg).ok_or(CoreError::NotFound)?;
        let xlm: Address = env.storage().instance().get(&DataKey::XlmAsset).ok_or(CoreError::NotFound)?;
        let u: bool = env.invoke_contract(&reg, &Symbol::new(&env, "is_active"), (id.clone(),).into_val(&env));
        if !u { return Err(CoreError::InstitutionNotActive); }

        let bal: i128 = env.storage().persistent().get(&DataKey::InstBal(id.clone())).unwrap_or(0);
        if amt > bal { return Err(CoreError::InsufficientFee); }
        let rem = bal - amt;
        if rem > 0 { env.storage().persistent().set(&DataKey::InstBal(id), &rem); }
        else { env.storage().persistent().remove(&DataKey::InstBal(id)); }

        token::TokenClient::new(&env, &xlm).transfer(&caller, &env.current_contract_address(), &amt);
        Ok(())
    }

    pub fn withdraw_admin(env: Env, caller: Address, amt: i128) -> Result<(), CoreError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(CoreError::Unauthorized)?;
        caller.require_auth();
        if caller != admin { return Err(CoreError::Unauthorized); }
        let bal: i128 = env.storage().instance().get(&DataKey::AdminBal).unwrap_or(0);
        if amt > bal { return Err(CoreError::InsufficientFee); }
        let xlm: Address = env.storage().instance().get(&DataKey::XlmAsset).ok_or(CoreError::NotFound)?;
        env.storage().instance().set(&DataKey::AdminBal, &(bal - amt));

        token::TokenClient::new(&env, &xlm).transfer(&caller, &env.current_contract_address(), &amt);
        Ok(())
    }

    // ── Employer ─────────────────────────────────────────────────────

    pub fn init_employer(env: Env, caller: Address, emp: Address) -> Result<(), CoreError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(CoreError::Unauthorized)?;
        caller.require_auth();
        if caller != admin { return Err(CoreError::Unauthorized); }
        if !env.storage().persistent().has(&DataKey::Employer(emp.clone())) {
            env.storage().persistent().set(&DataKey::Employer(emp), &EmployerState { free_remaining: FREE_COUNT, total: 0 });
        }
        Ok(())
    }

    pub fn get_employer(env: Env, emp: Address) -> Option<EmployerState> {
        env.storage().persistent().get(&DataKey::Employer(emp))
    }

    // ── Verification ─────────────────────────────────────────────────

    pub fn request_verification(
        env: Env, caller: Address, institution_id: BytesN<32>, nullifier: BytesN<32>,
        claim_type: u32, threshold: u64,
        proof_a: BytesN<64>, proof_b: BytesN<128>, proof_c: BytesN<64>,
        sig_commitment: BytesN<32>, sig_nullifier: BytesN<32>,
        sig_claim_type: BytesN<32>, sig_threshold: BytesN<32>,
    ) -> Result<bool, CoreError> {
        caller.require_auth();

        let reg: Address = env.storage().instance().get(&DataKey::InstReg).ok_or(CoreError::NotFound)?;
        let active: bool = env.invoke_contract(&reg, &Symbol::new(&env, "is_active"), (institution_id.clone(),).into_val(&env));
        if !active { return Err(CoreError::InstitutionNotActive); }

        if !env.storage().persistent().has(&DataKey::Record(nullifier.clone())) {
            return Err(CoreError::CredentialNotFound);
        }
        if env.storage().persistent().has(&DataKey::Revoked(nullifier.clone())) {
            return Err(CoreError::CredentialRevoked);
        }

        let xlm: Address = env.storage().instance().get(&DataKey::XlmAsset).ok_or(CoreError::NotFound)?;
        let fee_paid: i128;
        let emp: Option<EmployerState> = env.storage().persistent().get(&DataKey::Employer(caller.clone()));
        if let Some(mut s) = emp {
            if s.free_remaining > 0 {
                s.free_remaining -= 1;
                s.total += 1;
                env.storage().persistent().set(&DataKey::Employer(caller.clone()), &s);
                fee_paid = 0;
            } else {
                let cfg: FeeConfig = env.storage().instance().get(&DataKey::FeeCfg).ok_or(CoreError::NotFound)?;
                fee_paid = cfg.verification_fee;
                token::TokenClient::new(&env, &xlm).transfer(&caller, &env.current_contract_address(), &fee_paid);
                Self::distribute(&env, &institution_id, fee_paid)?;
            }
        } else {
            let cfg: FeeConfig = env.storage().instance().get(&DataKey::FeeCfg).ok_or(CoreError::NotFound)?;
            fee_paid = cfg.verification_fee;
            token::TokenClient::new(&env, &xlm).transfer(&caller, &env.current_contract_address(), &fee_paid);
            Self::distribute(&env, &institution_id, fee_paid)?;
        }

        let verifier: Address = env.storage().instance().get(&DataKey::Groth16Verifier).ok_or(CoreError::NotFound)?;
        let vk_hash: BytesN<32> = env.storage().instance().get(&DataKey::VkHash).ok_or(CoreError::NotFound)?;

        let mut pv = vec![&env];
        pv.push_back(sig_commitment);
        pv.push_back(sig_nullifier);
        pv.push_back(sig_claim_type);
        pv.push_back(sig_threshold);

        let is_valid = env.invoke_contract::<bool>(
            &verifier,
            &Symbol::new(&env, "verify_raw"),
            (vk_hash, proof_a, proof_b, proof_c, pv).into_val(&env),
        );

        let t: u32 = env.storage().instance().get(&DataKey::TotalVerifs).unwrap_or(0);
        let rid = make_id(&env, t + 1);
        env.storage().persistent().set(&DataKey::Verification(rid.clone()), &VerificationRequest {
            id: rid, employer: caller, institution_id, nullifier,
            claim_type, threshold, verified: is_valid,
            timestamp: env.ledger().timestamp(), fee_paid,
        });
        env.storage().instance().set(&DataKey::TotalVerifs, &(t + 1));

        Ok(is_valid)
    }

    pub fn get_verification(env: Env, id: BytesN<32>) -> Result<VerificationRequest, CoreError> {
        env.storage().persistent().get(&DataKey::Verification(id)).ok_or(CoreError::NotFound)
    }

    pub fn total_verifications(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TotalVerifs).unwrap_or(0)
    }

    fn distribute(env: &Env, inst_id: &BytesN<32>, amount: i128) -> Result<(), CoreError> {
        let cfg: FeeConfig = env.storage().instance().get(&DataKey::FeeCfg).ok_or(CoreError::NotFound)?;
        let is = amount * (cfg.institution_share_bps as i128) / (BPS_DEN as i128);
        let as_ = amount * (cfg.admin_share_bps as i128) / (BPS_DEN as i128);
        let ps = amount * (cfg.pool_share_bps as i128) / (BPS_DEN as i128);

        let ib: i128 = env.storage().persistent().get(&DataKey::InstBal(inst_id.clone())).unwrap_or(0);
        env.storage().persistent().set(&DataKey::InstBal(inst_id.clone()), &(ib + is));

        let ab: i128 = env.storage().instance().get(&DataKey::AdminBal).unwrap_or(0);
        env.storage().instance().set(&DataKey::AdminBal, &(ab + as_));

        let pb: i128 = env.storage().instance().get(&DataKey::PoolBal).unwrap_or(0);
        env.storage().instance().set(&DataKey::PoolBal, &(pb + ps));

        Ok(())
    }
}

mod test;
