#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, U256,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    vec, Address, BytesN, Env, Vec,
};

fn neg_g1(env: &Env, p: &Bn254G1Affine) -> Bn254G1Affine {
    let bn254 = env.crypto().bn254();
    let s = Bn254Fr::from_u256(U256::from_parts(
        env,
        0x30644e72e131a029,
        0xb85045b68181585d,
        0x2833e84879b97091,
        0x43e1f593f0000000,
    ));
    bn254.g1_mul(p, &s)
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerifierError {
    MalformedVerifyingKey = 1,
    InvalidProof = 2,
    PublicSignalCountMismatch = 3,
}

#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[derive(Clone)]
#[contracttype]
pub enum VkKey {
    Admin,
    Vk(BytesN<32>),
}

#[contract]
pub struct Groth16Verifier;

#[contractimpl]
impl Groth16Verifier {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&VkKey::Admin) { panic!("init"); }
        admin.require_auth();
        env.storage().instance().set(&VkKey::Admin, &admin);
    }

    pub fn register_vk(
        env: Env, caller: Address, vk_hash: BytesN<32>, vk: VerificationKey,
    ) -> Result<(), VerifierError> {
        let admin: Address = env.storage().instance().get(&VkKey::Admin)
            .ok_or(VerifierError::MalformedVerifyingKey)?;
        caller.require_auth();
        if caller != admin { return Err(VerifierError::MalformedVerifyingKey); }
        env.storage().persistent().set(&VkKey::Vk(vk_hash), &vk);
        Ok(())
    }

    pub fn is_vk_registered(env: Env, vk_hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&VkKey::Vk(vk_hash))
    }

    pub fn get_vk(env: Env, vk_hash: BytesN<32>) -> Result<VerificationKey, VerifierError> {
        env.storage().persistent().get(&VkKey::Vk(vk_hash)).ok_or(VerifierError::MalformedVerifyingKey)
    }

    pub fn verify(
        env: Env, vk_hash: BytesN<32>, proof: Proof, public_signals: Vec<Bn254Fr>,
    ) -> Result<bool, VerifierError> {
        let vk: VerificationKey = env.storage().persistent().get(&VkKey::Vk(vk_hash))
            .ok_or(VerifierError::MalformedVerifyingKey)?;
        if public_signals.len() + 1 != vk.ic.len() {
            return Err(VerifierError::PublicSignalCountMismatch);
        }

        let bn254 = env.crypto().bn254();

        let mut vk_x = vk.ic.get(0).unwrap();
        for i in 0..public_signals.len() {
            let prod = bn254.g1_mul(&vk.ic.get(i + 1).unwrap(), &public_signals.get(i).unwrap());
            vk_x = bn254.g1_add(&vk_x, &prod);
        }

        let neg_a = neg_g1(&env, &proof.a);
        let neg_alpha = neg_g1(&env, &vk.alpha);
        let neg_vk_x = neg_g1(&env, &vk_x);
        let neg_c = neg_g1(&env, &proof.c);

        let vp1 = vec![&env, neg_a, neg_alpha, neg_vk_x, neg_c];
        let vp2 = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];
        Ok(bn254.pairing_check(vp1, vp2))
    }

    pub fn verify_raw(
        env: Env, vk_hash: BytesN<32>,
        a_bytes: BytesN<64>, b_bytes: BytesN<128>, c_bytes: BytesN<64>,
        public_signal_bytes: Vec<BytesN<32>>,
    ) -> Result<bool, VerifierError> {
        let vk: VerificationKey = env.storage().persistent().get(&VkKey::Vk(vk_hash))
            .ok_or(VerifierError::MalformedVerifyingKey)?;
        if public_signal_bytes.len() + 1 != vk.ic.len() {
            return Err(VerifierError::PublicSignalCountMismatch);
        }

        let bn254 = env.crypto().bn254();
        let a = Bn254G1Affine::from_bytes(a_bytes);
        let b = Bn254G2Affine::from_bytes(b_bytes);
        let c = Bn254G1Affine::from_bytes(c_bytes);

        let mut vk_x = vk.ic.get(0).unwrap();
        for i in 0..public_signal_bytes.len() {
            let s = Bn254Fr::from_bytes(public_signal_bytes.get(i).unwrap());
            let prod = bn254.g1_mul(&vk.ic.get(i + 1).unwrap(), &s);
            vk_x = bn254.g1_add(&vk_x, &prod);
        }

        let neg_a = neg_g1(&env, &a);
        let neg_alpha = neg_g1(&env, &vk.alpha);
        let neg_vk_x = neg_g1(&env, &vk_x);
        let neg_c = neg_g1(&env, &c);

        let vp1 = vec![&env, neg_a, neg_alpha, neg_vk_x, neg_c];
        let vp2 = vec![&env, b, vk.beta, vk.gamma, vk.delta];
        Ok(bn254.pairing_check(vp1, vp2))
    }
}

mod test;
