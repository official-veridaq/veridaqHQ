pragma circom 2.0.8;

// circomlib provides Poseidon (prime-field native hash) and comparators.
// Install with: pnpm install (circomlibjs is in root package.json).
// The Circom templates are referenced here from the npm package path.

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

/// @title CredentialVerifier
/// @notice Proves a specific academic claim about a committed credential
///         without disclosing any private student attributes.
///
/// Private inputs (the institution holds these; they never go on-chain):
///   nameHash       — Keccak256(studentName) mod p
///   matricHash     — Keccak256(matricNumber) mod p
///   cgpa           — CGPA * 100 as integer (100 to 500)
///   classification — 1=Third, 2=LowerSecond, 3=UpperSecond, 4=FirstClass
///   courseHash     — Keccak256(courseName) mod p
///   graduationYear — four-digit integer (1960 to 2030)
///   blindingFactor — 128-bit random value generated at issuance
///   institutionKey — institution's private field element (Keccak256(privKey) mod p)
///
/// Public inputs (visible on-chain and to the employer):
///   commitment     — Poseidon(name,matric,cgpa,class,course,year,beta) stored on-chain
///   nullifier      — Poseidon(matric, institutionKey) stored on-chain
///   claimType      — integer 1-6 selecting which claim predicate to evaluate
///   threshold      — claim threshold (used for claimType 5 only; 0 otherwise)
template CredentialVerifier() {
    // Private inputs
    signal input nameHash;
    signal input matricHash;
    signal input cgpa;
    signal input classification;
    signal input courseHash;
    signal input graduationYear;
    signal input blindingFactor;
    signal input institutionKey;

    // Public inputs
    signal input commitment;
    signal input nullifier;
    signal input claimType;
    signal input threshold;

    // ── Constraint 1: Commitment consistency ─────────────────────────────────
    // Verify that the private inputs hash to the on-chain commitment.
    // Any deviation in a single private input causes this constraint to fail
    // and the proof cannot be generated.
    component commitHasher = Poseidon(7);
    commitHasher.inputs[0] <== nameHash;
    commitHasher.inputs[1] <== matricHash;
    commitHasher.inputs[2] <== cgpa;
    commitHasher.inputs[3] <== classification;
    commitHasher.inputs[4] <== courseHash;
    commitHasher.inputs[5] <== graduationYear;
    commitHasher.inputs[6] <== blindingFactor;

    commitment === commitHasher.out;

    // ── Constraint 2: Nullifier consistency ──────────────────────────────────
    // Verify that the on-chain nullifier is correctly derived from the
    // matriculation hash and the institution's private key.
    component nullHasher = Poseidon(2);
    nullHasher.inputs[0] <== matricHash;
    nullHasher.inputs[1] <== institutionKey;

    nullifier === nullHasher.out;

    // ── Constraint 3: Claim predicates ───────────────────────────────────────
    // All six claim sub-circuits evaluate on every proof generation, but only
    // the one matching claimType is connected to the final output signal.
    // This is required because Circom compiles to a static circuit; the
    // structure cannot change based on runtime values.

    // claimType 1: Programme completion — graduation year must be in valid range
    component yearGe = GreaterEqThan(12); // 12-bit comparator (up to 4095)
    component yearLe = LessEqThan(12);
    yearGe.in[0] <== graduationYear;
    yearGe.in[1] <== 1960;
    yearLe.in[0] <== graduationYear;
    yearLe.in[1] <== 2030;
    signal yearValid <== yearGe.out * yearLe.out;

    // claimType 2: Minimum Lower Second Class (classification >= 2)
    component classGe2 = GreaterEqThan(4);
    classGe2.in[0] <== classification;
    classGe2.in[1] <== 2;

    // claimType 3: Minimum Upper Second Class (classification >= 3)
    component classGe3 = GreaterEqThan(4);
    classGe3.in[0] <== classification;
    classGe3.in[1] <== 3;

    // claimType 4: First Class (classification == 4)
    component classEq4 = IsEqual();
    classEq4.in[0] <== classification;
    classEq4.in[1] <== 4;

    // claimType 5: CGPA above threshold (cgpa >= threshold * 100 passed as threshold directly)
    component cgpaGe = GreaterEqThan(10); // 10-bit comparator (up to 1023)
    cgpaGe.in[0] <== cgpa;
    cgpaGe.in[1] <== threshold;

    // claimType 6: Programme-specific completion (courseHash is non-zero and year valid)
    component courseNonZero = IsZero();
    courseNonZero.in <== courseHash;
    signal courseValid <== (1 - courseNonZero.out) * yearValid;

    // Multiplexer: select the result of the active claim.
    // Each claim selector produces 1 only when claimType equals its code.
    component isClaim1 = IsEqual(); isClaim1.in[0] <== claimType; isClaim1.in[1] <== 1;
    component isClaim2 = IsEqual(); isClaim2.in[0] <== claimType; isClaim2.in[1] <== 2;
    component isClaim3 = IsEqual(); isClaim3.in[0] <== claimType; isClaim3.in[1] <== 3;
    component isClaim4 = IsEqual(); isClaim4.in[0] <== claimType; isClaim4.in[1] <== 4;
    component isClaim5 = IsEqual(); isClaim5.in[0] <== claimType; isClaim5.in[1] <== 5;
    component isClaim6 = IsEqual(); isClaim6.in[0] <== claimType; isClaim6.in[1] <== 6;

    // The claim result must be 1 (true) for the proof to succeed.
    // If the selected claim predicate is false, this constraint fails and no
    // valid proof can be generated.
    signal r1 <== isClaim1.out * yearValid;
    signal r2 <== isClaim2.out * classGe2.out;
    signal r3 <== isClaim3.out * classGe3.out;
    signal r4 <== isClaim4.out * classEq4.out;
    signal r5 <== isClaim5.out * cgpaGe.out;
    signal r6 <== isClaim6.out * courseValid;

    signal claimResult <== r1 + r2 + r3 + r4 + r5 + r6;

    claimResult === 1;
}

// claimType and threshold are public; the rest are private.
component main {public [commitment, nullifier, claimType, threshold]} = CredentialVerifier();
