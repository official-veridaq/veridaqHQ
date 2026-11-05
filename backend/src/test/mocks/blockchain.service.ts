/**
 * Mock BlockchainService for unit tests.
 *
 * Every method returns a safe default so tests never attempt real RPC calls.
 * Individual tests can override methods with vi.spyOn() or by subclassing.
 */

export class BlockchainService {
  async registerInstitution(
    _institutionId: string,
    _name: string,
    _adminWallet: string
  ): Promise<string> {
    return "mock-tx-hash"
  }

  async isInstitutionRegistered(_institutionId: string): Promise<boolean> {
    return false
  }

  async registerBatch(
    _institutionId: string,
    _commitments: string[],
    _nullifiers: string[],
    _graduationYear: number,
    _degreeTypeCode: number,
    _txRef?: string
  ): Promise<{ txHash: string }> {
    return { txHash: "mock-tx-hash" }
  }

  async commitmentExists(_commitment: string): Promise<boolean> {
    return false
  }

  async nullifierExists(_nullifier: string): Promise<boolean> {
    return false
  }

  async revokeCredential(_nullifier: string, _reasonCode: number): Promise<string> {
    return "mock-tx-hash"
  }

  async isRevoked(_nullifier: string): Promise<boolean> {
    return false
  }

  async verifyProof(
    _a: [bigint, bigint],
    _b: [[bigint, bigint], [bigint, bigint]],
    _c: [bigint, bigint],
    _publicInputs: [bigint, bigint, bigint, bigint]
  ): Promise<boolean> {
    return true
  }

  async initialiseEmployer(_employerAddress: string): Promise<string> {
    return "mock-tx-hash"
  }

  async getEmployer(
    _employerAddress: string
  ): Promise<{ free_remaining: number; total: number } | null> {
    return { free_remaining: 3, total: 0 }
  }

  async isEmployerInitialised(_employerAddress: string): Promise<boolean> {
    return false
  }

  async getRemainingFreeVerifications(_employerAddress: string): Promise<number> {
    return 3
  }

  async getBalance(_address: string): Promise<bigint> {
    return 100_000_000_000n // 10000 XLM in stroops
  }

  async requestVerification(
    _institutionId: string,
    _nullifier: string,
    _claimType: number,
    _threshold: number,
    _proofA: string,
    _proofB: string,
    _proofC: string,
    _sigCommitment: string,
    _sigNullifier: string,
    _sigClaimType: string,
    _sigThreshold: string
  ): Promise<{ txHash: string; verified: boolean }> {
    return { txHash: "mock-tx-hash", verified: true }
  }

  static uuidToBytes32(uuid: string): string {
    return "0x" + uuid.replace(/-/g, "").padStart(64, "0")
  }
}
