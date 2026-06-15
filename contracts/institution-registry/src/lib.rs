#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, vec, Address, BytesN, Env, String, Vec,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum InstitutionError {
    AlreadyRegistered = 1,
    NotFound = 2,
    NotActive = 3,
    Unauthorized = 4,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Institution {
    pub id: BytesN<32>,
    pub name: String,
    pub admin: Address,
    pub active: bool,
    pub registered_at: u64,
    pub total_earned: i128,
    pub wallet: Address,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Institution(BytesN<32>),
    InstitutionIds,
    InstitutionCount,
}

#[contract]
pub struct InstitutionRegistry;

#[contractimpl]
impl InstitutionRegistry {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn register(
        env: Env,
        caller: Address,
        id: BytesN<32>,
        name: String,
        admin_wallet: Address,
    ) -> Result<(), InstitutionError> {
        let platform_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(InstitutionError::Unauthorized)?;

        caller.require_auth();
        if caller != platform_admin {
            return Err(InstitutionError::Unauthorized);
        }

        if env.storage().persistent().has(&DataKey::Institution(id.clone())) {
            return Err(InstitutionError::AlreadyRegistered);
        }

        let inst = Institution {
            id: id.clone(),
            name,
            admin: admin_wallet.clone(),
            active: true,
            registered_at: env.ledger().timestamp(),
            total_earned: 0,
            wallet: admin_wallet,
        };

        env.storage().persistent().set(&DataKey::Institution(id.clone()), &inst);

        let mut ids: Vec<BytesN<32>> = env
            .storage()
            .instance()
            .get(&DataKey::InstitutionIds)
            .unwrap_or(vec![&env]);

        ids.push_back(id.clone());
        env.storage().instance().set(&DataKey::InstitutionIds, &ids);

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::InstitutionCount)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::InstitutionCount, &(count + 1));

        Ok(())
    }

    pub fn deactivate(env: Env, caller: Address, id: BytesN<32>) -> Result<(), InstitutionError> {
        let platform_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(InstitutionError::Unauthorized)?;

        caller.require_auth();
        if caller != platform_admin {
            return Err(InstitutionError::Unauthorized);
        }

        let mut inst: Institution = env
            .storage()
            .persistent()
            .get(&DataKey::Institution(id.clone()))
            .ok_or(InstitutionError::NotFound)?;

        inst.active = false;
        env.storage().persistent().set(&DataKey::Institution(id), &inst);
        Ok(())
    }

    pub fn reactivate(env: Env, caller: Address, id: BytesN<32>) -> Result<(), InstitutionError> {
        let platform_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(InstitutionError::Unauthorized)?;

        caller.require_auth();
        if caller != platform_admin {
            return Err(InstitutionError::Unauthorized);
        }

        let mut inst: Institution = env
            .storage()
            .persistent()
            .get(&DataKey::Institution(id.clone()))
            .ok_or(InstitutionError::NotFound)?;

        inst.active = true;
        env.storage().persistent().set(&DataKey::Institution(id), &inst);
        Ok(())
    }

    pub fn update_wallet(
        env: Env, caller: Address, id: BytesN<32>, new_wallet: Address,
    ) -> Result<(), InstitutionError> {
        let mut inst: Institution = env
            .storage().persistent().get(&DataKey::Institution(id.clone()))
            .ok_or(InstitutionError::NotFound)?;
        caller.require_auth();
        if caller != inst.admin { return Err(InstitutionError::Unauthorized); }
        inst.admin = new_wallet.clone();
        inst.wallet = new_wallet;
        env.storage().persistent().set(&DataKey::Institution(id), &inst);
        Ok(())
    }

    pub fn add_earnings(env: Env, id: BytesN<32>, amount: i128) -> Result<(), InstitutionError> {
        let mut inst: Institution = env
            .storage().persistent().get(&DataKey::Institution(id.clone()))
            .ok_or(InstitutionError::NotFound)?;
        inst.total_earned += amount;
        env.storage().persistent().set(&DataKey::Institution(id), &inst);
        Ok(())
    }

    pub fn is_active(env: Env, id: BytesN<32>) -> bool {
        env.storage().persistent().get::<_, Institution>(&DataKey::Institution(id))
            .map(|i| i.active).unwrap_or(false)
    }

    pub fn get_institution(env: Env, id: BytesN<32>) -> Result<Institution, InstitutionError> {
        env.storage().persistent().get(&DataKey::Institution(id)).ok_or(InstitutionError::NotFound)
    }

    pub fn get_admin(env: Env) -> Result<Address, InstitutionError> {
        env.storage().instance().get(&DataKey::Admin).ok_or(InstitutionError::NotFound)
    }

    pub fn get_all_ids(env: Env) -> Vec<BytesN<32>> {
        env.storage().instance().get(&DataKey::InstitutionIds).unwrap_or(vec![&env])
    }

    pub fn count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::InstitutionCount).unwrap_or(0)
    }
}

mod test;
