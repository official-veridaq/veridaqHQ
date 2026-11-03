#![cfg(test)]
use crate::{Groth16Verifier, Groth16VerifierClient, Proof, VerificationKey, VerifierError};
use soroban_sdk::{
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    testutils::Address as _,
    vec, Address, BytesN, Env, U256,
};

fn make_test_vk(env: &Env, num_public: u32) -> VerificationKey {
    let zero = Bn254G1Affine::from_bytes(BytesN::from_array(env, &[0u8; 64]));
    let zero_g2 = Bn254G2Affine::from_bytes(BytesN::from_array(env, &[0u8; 128]));

    let mut ic = vec![env];
    for _ in 0..num_public + 1 {
        ic.push_back(zero.clone());
    }

    VerificationKey {
        alpha: zero.clone(),
        beta: zero_g2.clone(),
        gamma: zero_g2.clone(),
        delta: zero_g2.clone(),
        ic,
    }
}

fn zero_fr(env: &Env) -> Bn254Fr {
    Bn254Fr::from_u256(U256::from_u32(env, 0))
}

#[test]
fn test_initialize_and_register_vk() {
    let env = Env::default();
    let contract_id = env.register(Groth16Verifier, ());
    let client = Groth16VerifierClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin);

    let vk_hash = BytesN::from_array(&env, &[1u8; 32]);
    let vk = make_test_vk(&env, 2);
    client.register_vk(&admin, &vk_hash, &vk);

    assert!(client.is_vk_registered(&vk_hash));
}

#[test]
fn test_register_vk_reverts_non_admin() {
    let env = Env::default();
    let contract_id = env.register(Groth16Verifier, ());
    let client = Groth16VerifierClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin);

    let vk_hash = BytesN::from_array(&env, &[1u8; 32]);
    let vk = make_test_vk(&env, 2);
    let result = client.try_register_vk(&non_admin, &vk_hash, &vk);
    assert_eq!(
        result.err().unwrap().unwrap(),
        VerifierError::MalformedVerifyingKey
    );
}

#[test]
fn test_verify_rejects_wrong_signal_count() {
    let env = Env::default();
    let contract_id = env.register(Groth16Verifier, ());
    let client = Groth16VerifierClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin);

    let vk_hash = BytesN::from_array(&env, &[1u8; 32]);
    let vk = make_test_vk(&env, 4);
    client.register_vk(&admin, &vk_hash, &vk);

    let zero = Bn254G1Affine::from_bytes(BytesN::from_array(&env, &[0u8; 64]));
    let zero_g2 = Bn254G2Affine::from_bytes(BytesN::from_array(&env, &[0u8; 128]));
    let proof = Proof {
        a: zero.clone(),
        b: zero_g2,
        c: zero,
    };
    let signals = vec![&env, zero_fr(&env), zero_fr(&env), zero_fr(&env)];

    let result = client.try_verify(&vk_hash, &proof, &signals);
    assert_eq!(
        result.err().unwrap().unwrap(),
        VerifierError::PublicSignalCountMismatch
    );
}

#[test]
fn test_verify_rejects_unregistered_vk() {
    let env = Env::default();
    let contract_id = env.register(Groth16Verifier, ());
    let client = Groth16VerifierClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin);

    let vk_hash = BytesN::from_array(&env, &[99u8; 32]);
    let zero = Bn254G1Affine::from_bytes(BytesN::from_array(&env, &[0u8; 64]));
    let zero_g2 = Bn254G2Affine::from_bytes(BytesN::from_array(&env, &[0u8; 128]));
    let proof = Proof {
        a: zero.clone(),
        b: zero_g2,
        c: zero,
    };
    let signals = vec![&env, zero_fr(&env)];

    let result = client.try_verify(&vk_hash, &proof, &signals);
    assert_eq!(
        result.err().unwrap().unwrap(),
        VerifierError::MalformedVerifyingKey
    );
}
