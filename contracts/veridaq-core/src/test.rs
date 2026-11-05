#![cfg(test)]
use crate::{CoreError, VeridaqCore, VeridaqCoreClient};
use soroban_sdk::{
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine},
    testutils::Address as _,
    vec, Address, BytesN, Env, String,
};

fn setup() -> (
    Env,
    VeridaqCoreClient<'static>,
    Address,
    BytesN<32>,
    Address,
) {
    let env = Env::default();

    let admin = Address::generate(&env);
    let inst_wallet = Address::generate(&env);
    let inst_id_bytes = BytesN::from_array(&env, &[1u8; 32]);

    env.mock_all_auths();

    // Register native XLM asset
    let xlm_asset = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();

    // Deploy institution registry
    let inst_id = env.register(institution_registry::InstitutionRegistry, ());
    let inst_client = institution_registry::InstitutionRegistryClient::new(&env, &inst_id);
    inst_client.initialize(&admin);
    inst_client.register(
        &admin,
        &inst_id_bytes,
        &String::from_str(&env, "Test Uni"),
        &inst_wallet,
    );

    // Deploy groth16 verifier
    let v_id = env.register(groth16_verifier::Groth16Verifier, ());
    let v_client = groth16_verifier::Groth16VerifierClient::new(&env, &v_id);
    v_client.initialize(&admin);

    let vk_hash = BytesN::from_array(&env, &[2u8; 32]);
    let zero_g1 = Bn254G1Affine::from_bytes(BytesN::from_array(&env, &[0u8; 64]));
    let zero_g2 = Bn254G2Affine::from_bytes(BytesN::from_array(&env, &[0u8; 128]));
    let mut ic = vec![&env];
    ic.push_back(zero_g1.clone());
    ic.push_back(zero_g1.clone());
    ic.push_back(zero_g1.clone());
    ic.push_back(zero_g1.clone());
    ic.push_back(zero_g1.clone());
    let vk = groth16_verifier::VerificationKey {
        alpha: zero_g1.clone(),
        beta: zero_g2.clone(),
        gamma: zero_g2.clone(),
        delta: zero_g2.clone(),
        ic,
    };
    v_client.register_vk(&admin, &vk_hash, &vk);

    // Deploy veridaq core
    let core_id = env.register(VeridaqCore, ());
    let core = VeridaqCoreClient::new(&env, &core_id);
    core.initialize(&admin, &inst_id, &v_id, &vk_hash, &xlm_asset);

    (env, core, admin, inst_id_bytes, xlm_asset)
}

#[test]
fn test_initialize() {
    let (_env, core, _admin, _inst_id, _xlm) = setup();
    let fee = core.get_fee_config();
    assert_eq!(fee.verification_fee, 1_000_000);
    assert_eq!(core.total_credentials(), 0);
    assert_eq!(core.total_verifications(), 0);
}

#[test]
fn test_register_batch() {
    let (env, core, admin, inst_id, _xlm) = setup();
    let c = BytesN::from_array(&env, &[10u8; 32]);
    let n = BytesN::from_array(&env, &[20u8; 32]);

    let count = core.register_batch(
        &admin,
        &inst_id,
        &vec![&env, c],
        &vec![&env, n],
        &2025u32,
        &1u32,
    );
    assert_eq!(count, 1);
    assert!(core.exists(&BytesN::from_array(&env, &[20u8; 32])));
    assert_eq!(core.total_credentials(), 1);
}

#[test]
fn test_register_and_revoke() {
    let (env, core, admin, inst_id, _xlm) = setup();
    let c = BytesN::from_array(&env, &[10u8; 32]);
    let n = BytesN::from_array(&env, &[20u8; 32]);

    core.register_batch(
        &admin,
        &inst_id,
        &vec![&env, c],
        &vec![&env, n.clone()],
        &2025u32,
        &1u32,
    );
    assert!(!core.is_revoked(&n));
    core.revoke(&admin, &n, &3u32);
    assert!(core.is_revoked(&n));
}

#[test]
fn test_employer_initialization() {
    let (env, core, admin, _inst_id, _xlm) = setup();
    let employer = Address::generate(&env);

    core.init_employer(&admin, &employer);

    let state = core.get_employer(&employer).unwrap();
    assert_eq!(state.free_remaining, 3);
}

#[test]
fn test_fee_config() {
    let (_env, core, _admin, _inst_id, _xlm) = setup();
    let fee = core.get_fee_config();
    assert_eq!(fee.institution_share_bps, 2000);
    assert_eq!(fee.admin_share_bps, 7000);
    assert_eq!(fee.pool_share_bps, 1000);
}

#[test]
fn test_balances() {
    let (_env, core, _admin, inst_id, _xlm) = setup();
    assert_eq!(core.get_inst_balance(&inst_id), 0);
    assert_eq!(core.get_admin_balance(), 0);
    assert_eq!(core.get_pool_balance(), 0);
}

#[test]
fn test_revoke_reverts_not_found() {
    let (env, core, admin, _inst_id, _xlm) = setup();
    let n = BytesN::from_array(&env, &[99u8; 32]);
    let result = core.try_revoke(&admin, &n, &1u32);
    assert_eq!(
        result.err().unwrap().unwrap(),
        CoreError::CredentialNotFound
    );
}

#[test]
fn test_register_batch_reverts_empty() {
    let (env, core, admin, inst_id, _xlm) = setup();
    let empty = vec![&env];
    let result = core.try_register_batch(&admin, &inst_id, &empty, &empty, &2025u32, &1u32);
    assert_eq!(result.err().unwrap().unwrap(), CoreError::EmptyBatch);
}

#[test]
fn test_get_record() {
    let (env, core, admin, inst_id, _xlm) = setup();
    let c = BytesN::from_array(&env, &[42u8; 32]);
    let n = BytesN::from_array(&env, &[24u8; 32]);

    core.register_batch(
        &admin,
        &inst_id,
        &vec![&env, c.clone()],
        &vec![&env, n.clone()],
        &2024u32,
        &2u32,
    );

    let record = core.get_record(&n);
    assert_eq!(record.commitment, c);
    assert_eq!(record.graduation_year, 2024);
    assert_eq!(record.degree_type_code, 2);
}
