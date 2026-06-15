#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, BytesN, Env, String};

#[test]
fn test_initialize_and_register() {
    let env = Env::default();
    let contract_id = env.register(InstitutionRegistry, ());
    let client = InstitutionRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let inst_id = BytesN::from_array(&env, &[1u8; 32]);
    let inst_name = String::from_str(&env, "Test University");
    let inst_wallet = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.register(&admin, &inst_id, &inst_name, &inst_wallet);

    assert!(client.is_active(&inst_id));
    assert_eq!(client.count(), 1);

    let stored = client.get_institution(&inst_id);
    assert_eq!(stored.name, inst_name);
    assert_eq!(stored.admin, inst_wallet);
    assert!(stored.active);
}

#[test]
fn test_register_reverts_duplicate() {
    let env = Env::default();
    let contract_id = env.register(InstitutionRegistry, ());
    let client = InstitutionRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let inst_id = BytesN::from_array(&env, &[1u8; 32]);
    let inst_wallet = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.register(&admin, &inst_id, &String::from_str(&env, "Test U"), &inst_wallet);

    let result = client.try_register(&admin, &inst_id, &String::from_str(&env, "Again"), &inst_wallet);
    assert_eq!(result.err().unwrap().unwrap(), InstitutionError::AlreadyRegistered);
}

#[test]
fn test_deactivate_and_reactivate() {
    let env = Env::default();
    let contract_id = env.register(InstitutionRegistry, ());
    let client = InstitutionRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let inst_id = BytesN::from_array(&env, &[1u8; 32]);
    let inst_wallet = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.register(&admin, &inst_id, &String::from_str(&env, "Test U"), &inst_wallet);
    client.deactivate(&admin, &inst_id);
    assert!(!client.is_active(&inst_id));
    client.reactivate(&admin, &inst_id);
    assert!(client.is_active(&inst_id));
}

#[test]
fn test_earnings() {
    let env = Env::default();
    let contract_id = env.register(InstitutionRegistry, ());
    let client = InstitutionRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let inst_id = BytesN::from_array(&env, &[1u8; 32]);
    let inst_wallet = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);
    client.register(&admin, &inst_id, &String::from_str(&env, "Test U"), &inst_wallet);
    client.add_earnings(&inst_id, &1000i128);
    let inst = client.get_institution(&inst_id);
    assert_eq!(inst.total_earned, 1000);
}

#[test]
fn test_non_admin_cannot_register() {
    let env = Env::default();
    let contract_id = env.register(InstitutionRegistry, ());
    let client = InstitutionRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let imposter = Address::generate(&env);
    let inst_id = BytesN::from_array(&env, &[1u8; 32]);

    env.mock_all_auths();
    client.initialize(&admin);
    let result = client.try_register(&imposter, &inst_id, &String::from_str(&env, "Evil U"), &Address::generate(&env));
    assert_eq!(result.err().unwrap().unwrap(), InstitutionError::Unauthorized);
}
