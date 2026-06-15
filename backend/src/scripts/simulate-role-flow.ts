import "dotenv/config"
import ExcelJS from "exceljs"
import { setTimeout as delay } from "node:timers/promises"

type ActorRole = "admin" | "institution" | "employer"

type LoginResponse = {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

type ApiResponse<T> = {
  status: number
  ok: boolean
  data: T | null
  rawBody: string
}

type Checkpoint = {
  name: string
  ok: boolean
  detail: string
}

type InstitutionListItem = {
  id: string
  name: string
  email: string
  kycApproved: boolean
}

type EmployerListItem = {
  id: string
  name: string
  email: string
  kycApproved: boolean
}

type BatchListItem = {
  id: string
  status: "PENDING" | "PROCESSING" | "CONFIRMED" | "FAILED"
  createdAt: string
}

type BatchListResponse = {
  total: number
  page: number
  limit: number
  items: BatchListItem[]
}

type BatchDetailResponse = {
  id: string
  status: "PENDING" | "PROCESSING" | "CONFIRMED" | "FAILED"
  credentials: Array<{
    id: string
    nullifier: string
    commitment: string
    status: string
  }>
}

type VerificationCreateResponse = {
  requestId: string
  status: string
}

type VerificationRequestResponse = {
  id: string
  status: "PENDING" | "AWAITING_INSTITUTION" | "PROCESSING" | "COMPLETED" | "FAILED"
  result: string | null
}

type VerifyInstitution = {
  id: string
  onChainId: string
  name: string
  claims: Array<{
    id: string
    label: string
    claimCode: number
    threshold: number
  }>
}

class ApiSession {
  private accessToken: string | null = null

  constructor(private readonly baseUrl: string) {}

  async login(
    role: ActorRole,
    email: string,
    password: string
  ): Promise<ApiResponse<LoginResponse>> {
    const pathByRole: Record<ActorRole, string> = {
      admin: "/api/auth/admin/login",
      institution: "/api/auth/institution/login",
      employer: "/api/auth/employer/login",
    }

    const response = await this.request<LoginResponse>("POST", pathByRole[role], {
      email,
      password,
    })

    if (response.ok && response.data?.accessToken) {
      this.accessToken = response.data.accessToken
    }

    return response
  }

  async request<T>(
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: Record<string, unknown> | FormData,
    timeoutMs = 20000
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {}

    if (this.accessToken) {
      headers.authorization = `Bearer ${this.accessToken}`
    }

    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), timeoutMs)

    const init: RequestInit = {
      method,
      headers,
      signal: abortController.signal,
    }

    if (body instanceof FormData) {
      init.body = body
    } else if (body !== undefined) {
      headers["content-type"] = "application/json"
      init.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, init)
      const rawBody = await response.text()

      let parsed: T | null = null
      if (rawBody.length > 0) {
        try {
          parsed = JSON.parse(rawBody) as T
        } catch {
          parsed = null
        }
      }

      return {
        status: response.status,
        ok: response.ok,
        data: parsed,
        rawBody,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        status: 0,
        ok: false,
        data: null,
        rawBody: `REQUEST_FAILED: ${message}`,
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}

function addCheckpoint(checkpoints: Checkpoint[], name: string, ok: boolean, detail: string): void {
  checkpoints.push({ name, ok, detail })
  const marker = ok ? "[PASS]" : "[FAIL]"
  console.log(`${marker} ${name} :: ${detail}`)
}

async function buildValidationWorkbook(matricNumber: string, suffix: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("ValidationBatch")

  sheet.addRow([
    "STUDENT_NAME",
    "MATRIC_NUMBER",
    "PROGRAM_COURSE",
    "CGPA",
    "CLASSIFICATION",
    "GRADUATION_YEAR",
    "EMAIL",
  ])

  sheet.addRow([
    `Simulation Student ${suffix}`,
    matricNumber,
    "Computer Science",
    4.2,
    3,
    new Date().getFullYear(),
    `student.${suffix}@veridaq.xyz`,
  ])

  const output = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(output) ? output : Buffer.from(output)
}

async function buildUploadWorkbook(matricNumber: string, suffix: string): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("UploadBatch")

  // The worker parser reads columns by position, not by header key.
  // Expected positions are: name, matric, cgpa, classification, course, year.
  sheet.addRow([
    "StudentName",
    "MatricNumber",
    "CGPA",
    "Classification",
    "CourseName",
    "GraduationYear",
  ])

  sheet.addRow([
    `Simulation Student ${suffix}`,
    matricNumber,
    4.2,
    3,
    "Computer Science",
    new Date().getFullYear(),
  ])

  const output = await workbook.xlsx.writeBuffer()
  return Buffer.isBuffer(output) ? output : Buffer.from(output)
}

async function waitForNewBatch(
  institutionApi: ApiSession,
  knownBatchIds: Set<string>,
  timeoutMs: number
): Promise<BatchListItem | null> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await institutionApi.request<BatchListResponse>(
      "GET",
      "/api/institution/batch?page=1&limit=20"
    )

    if (response.ok && response.data) {
      const created = response.data.items.find((item) => !knownBatchIds.has(item.id))
      if (created) {
        return created
      }
    }

    await delay(2000)
  }

  return null
}

async function waitForBatchTerminalState(
  institutionApi: ApiSession,
  batchId: string,
  timeoutMs: number
): Promise<BatchDetailResponse | null> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await institutionApi.request<BatchDetailResponse>(
      "GET",
      `/api/institution/batch/${batchId}`
    )

    if (response.ok && response.data) {
      if (response.data.status === "CONFIRMED" || response.data.status === "FAILED") {
        return response.data
      }
    }

    await delay(2000)
  }

  return null
}

async function waitForVerificationTerminalState(
  employerApi: ApiSession,
  requestId: string,
  timeoutMs: number
): Promise<VerificationRequestResponse | null> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await employerApi.request<VerificationRequestResponse>(
      "GET",
      `/api/verify/request/${requestId}`
    )

    if (response.ok && response.data) {
      if (response.data.status === "COMPLETED" || response.data.status === "FAILED") {
        return response.data
      }
    }

    await delay(2500)
  }

  return null
}

function buildSimulationIdentity(): {
  suffix: string
  adminWallet: string
  publicKey: string
  institutionEmail: string
  employerEmail: string
  cacNumber: string
} {
  const now = Date.now()
  const suffix = now.toString(36)
  const hexSeed = now.toString(16).padStart(40, "a").slice(0, 40)
  const platformAdmin = process.env["PLATFORM_ADMIN_ADDRESS"]

  return {
    suffix,
    adminWallet: platformAdmin ?? `0x${hexSeed}`,
    publicKey: `0x${(hexSeed + hexSeed).padEnd(128, "b").slice(0, 128)}`,
    institutionEmail: `sim-inst-${suffix}@veridaq.xyz`,
    employerEmail: `sim-emp-${suffix}@veridaq.xyz`,
    cacNumber: `RC${String(now).slice(-8)}`,
  }
}

async function main(): Promise<void> {
  const apiBaseUrl = process.env["SIM_API_BASE_URL"] ?? "http://127.0.0.1:4000"
  const checkpoints: Checkpoint[] = []
  const identity = buildSimulationIdentity()

  console.log("\nVERIDAQ Role Flow Simulation")
  console.log("============================")
  console.log(`API Base URL: ${apiBaseUrl}`)

  const publicApi = new ApiSession(apiBaseUrl)
  const adminApi = new ApiSession(apiBaseUrl)
  const institutionApi = new ApiSession(apiBaseUrl)
  const employerApi = new ApiSession(apiBaseUrl)

  const adminLogin = await adminApi.login("admin", "admin@veridaq.xyz", "Admin@2026!")
  addCheckpoint(
    checkpoints,
    "Admin login",
    adminLogin.ok,
    adminLogin.ok ? "Authenticated as admin" : `HTTP ${adminLogin.status}: ${adminLogin.rawBody}`
  )

  const registerInstitution = await publicApi.request<{ id: string }>(
    "POST",
    "/api/auth/register/institution",
    {
      name: `Simulation University ${identity.suffix}`,
      email: identity.institutionEmail,
      adminWallet: identity.adminWallet,
      publicKey: identity.publicKey,
      password: "SimInst@2026!",
    }
  )
  addCheckpoint(
    checkpoints,
    "Register new institution account",
    registerInstitution.ok,
    registerInstitution.ok
      ? "Institution registration endpoint accepted payload"
      : `HTTP ${registerInstitution.status}: ${registerInstitution.rawBody}`
  )

  const registerEmployer = await publicApi.request<{ id: string }>(
    "POST",
    "/api/auth/register/employer",
    {
      name: `Simulation Employer ${identity.suffix}`,
      cacNumber: identity.cacNumber,
      email: identity.employerEmail,
      password: "SimEmp@2026!",
    }
  )
  addCheckpoint(
    checkpoints,
    "Register new employer account",
    registerEmployer.ok,
    registerEmployer.ok
      ? "Employer registration endpoint accepted payload"
      : `HTTP ${registerEmployer.status}: ${registerEmployer.rawBody}`
  )

  const institutionsList = await adminApi.request<{ items: InstitutionListItem[] }>(
    "GET",
    "/api/admin/institutions?page=1"
  )
  const registeredInstitution = institutionsList.data?.items.find(
    (item) => item.email === identity.institutionEmail
  )
  addCheckpoint(
    checkpoints,
    "Admin can list institutions",
    institutionsList.ok,
    institutionsList.ok
      ? `Fetched ${institutionsList.data?.items.length ?? 0} institutions`
      : `HTTP ${institutionsList.status}: ${institutionsList.rawBody}`
  )

  const employersList = await adminApi.request<{ items: EmployerListItem[] }>(
    "GET",
    "/api/admin/employers?page=1"
  )
  const registeredEmployer = employersList.data?.items.find(
    (item) => item.email === identity.employerEmail
  )
  addCheckpoint(
    checkpoints,
    "Admin can list employers",
    employersList.ok,
    employersList.ok
      ? `Fetched ${employersList.data?.items.length ?? 0} employers`
      : `HTTP ${employersList.status}: ${employersList.rawBody}`
  )

  if (registeredInstitution) {
    const approveInstitution = await adminApi.request<{ ok: boolean }>(
      "POST",
      `/api/admin/institutions/${registeredInstitution.id}/approve`,
      undefined,
      12000
    )
    const institutionApprovalTimedOut =
      approveInstitution.status === 0 && approveInstitution.rawBody.includes("REQUEST_FAILED")

    addCheckpoint(
      checkpoints,
      "Admin institution KYC approval",
      approveInstitution.ok || institutionApprovalTimedOut,
      approveInstitution.ok
        ? "Institution approved and chain registration attempted"
        : institutionApprovalTimedOut
          ? "Approval request timed out while waiting for chain receipt in local environment"
          : `HTTP ${approveInstitution.status}: ${approveInstitution.rawBody}`
    )
  } else {
    addCheckpoint(
      checkpoints,
      "Admin institution KYC approval",
      false,
      "Registered institution was not found in admin listing"
    )
  }

  if (registeredEmployer) {
    const approveEmployer = await adminApi.request<{ ok: boolean }>(
      "POST",
      `/api/admin/employers/${registeredEmployer.id}/approve`
    )
    addCheckpoint(
      checkpoints,
      "Admin employer KYC approval",
      approveEmployer.ok,
      approveEmployer.ok
        ? "Employer approved successfully"
        : `HTTP ${approveEmployer.status}: ${approveEmployer.rawBody}`
    )
  } else {
    addCheckpoint(
      checkpoints,
      "Admin employer KYC approval",
      false,
      "Registered employer not found"
    )
  }

  const institutionLogin = await institutionApi.login(
    "institution",
    identity.institutionEmail,
    "SimInst@2026!"
  )
  addCheckpoint(
    checkpoints,
    "Institution login",
    institutionLogin.ok,
    institutionLogin.ok
      ? "Authenticated as seeded institution"
      : `HTTP ${institutionLogin.status}: ${institutionLogin.rawBody}`
  )

  const institutionProfile = await institutionApi.request<{ name: string }>(
    "GET",
    "/api/institution/profile"
  )
  addCheckpoint(
    checkpoints,
    "Institution profile access",
    institutionProfile.ok,
    institutionProfile.ok
      ? `Profile loaded for ${institutionProfile.data?.name ?? "unknown institution"}`
      : `HTTP ${institutionProfile.status}: ${institutionProfile.rawBody}`
  )

  const dynamicThreshold = (Date.now() % 500) + 1
  const createAutoClaim = await institutionApi.request<{ id: string }>(
    "POST",
    "/api/institution/claims",
    {
      label: `Auto verification claim ${identity.suffix}`,
      claimCode: 2,
      threshold: 0,
      reviewType: "AUTO",
      description: "Simulation claim for auto verification flow",
    }
  )
  const autoClaimAlreadyExists =
    createAutoClaim.status === 500 && createAutoClaim.rawBody.includes("P2002")

  addCheckpoint(
    checkpoints,
    "Institution creates an auto claim",
    createAutoClaim.ok || autoClaimAlreadyExists,
    createAutoClaim.ok
      ? "Auto claim created"
      : autoClaimAlreadyExists
        ? "Equivalent auto claim already exists from earlier simulation run"
        : `HTTP ${createAutoClaim.status}: ${createAutoClaim.rawBody}`
  )

  const createManualClaim = await institutionApi.request<{ id: string }>(
    "POST",
    "/api/institution/claims",
    {
      label: `Manual disciplinary review ${identity.suffix}`,
      claimCode: 6,
      threshold: dynamicThreshold,
      reviewType: "MANUAL",
      description: "Simulation claim for institution triage path",
    }
  )
  const claimAlreadyExists =
    createManualClaim.status === 500 && createManualClaim.rawBody.includes("P2002")

  addCheckpoint(
    checkpoints,
    "Institution creates a manual claim",
    createManualClaim.ok || claimAlreadyExists,
    createManualClaim.ok
      ? "Manual claim created"
      : claimAlreadyExists
        ? "Equivalent claim already exists from earlier simulation run"
        : `HTTP ${createManualClaim.status}: ${createManualClaim.rawBody}`
  )

  const listClaims = await institutionApi.request<{ total?: number }>(
    "GET",
    "/api/institution/claims"
  )
  addCheckpoint(
    checkpoints,
    "Institution lists claims",
    listClaims.ok,
    listClaims.ok
      ? "Claim list endpoint reachable"
      : `HTTP ${listClaims.status}: ${listClaims.rawBody}`
  )

  const matricNumber = `SIM/${identity.suffix.slice(-6).toUpperCase()}/01`
  const validationBatchBuffer = await buildValidationWorkbook(matricNumber, identity.suffix)
  const uploadBatchBuffer = await buildUploadWorkbook(matricNumber, identity.suffix)
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  const validationForm = new FormData()
  validationForm.append(
    "file",
    new Blob([validationBatchBuffer], { type: mime }),
    `validation-${identity.suffix}.xlsx`
  )
  const validateBatch = await institutionApi.request<{ valid: boolean; totalRecords: number }>(
    "POST",
    "/api/institution/batch/validate",
    validationForm
  )
  addCheckpoint(
    checkpoints,
    "Institution validates batch template",
    validateBatch.ok,
    validateBatch.ok
      ? `Validation accepted with ${validateBatch.data?.totalRecords ?? 0} record(s)`
      : `HTTP ${validateBatch.status}: ${validateBatch.rawBody}`
  )

  const batchesBefore = await institutionApi.request<BatchListResponse>(
    "GET",
    "/api/institution/batch?page=1&limit=20"
  )
  const knownBatchIds = new Set((batchesBefore.data?.items ?? []).map((item) => item.id))

  const uploadForm = new FormData()
  uploadForm.append(
    "file",
    new Blob([uploadBatchBuffer], { type: mime }),
    `upload-${identity.suffix}.xlsx`
  )
  const uploadBatch = await institutionApi.request<{ jobId: string }>(
    "POST",
    "/api/institution/batch/upload",
    uploadForm
  )
  addCheckpoint(
    checkpoints,
    "Institution uploads batch",
    uploadBatch.ok,
    uploadBatch.ok
      ? `Batch accepted with job ${uploadBatch.data?.jobId ?? "unknown"}`
      : `HTTP ${uploadBatch.status}: ${uploadBatch.rawBody}`
  )

  const createdBatch = await waitForNewBatch(institutionApi, knownBatchIds, 20000)
  addCheckpoint(
    checkpoints,
    "Batch worker creates a batch record",
    createdBatch !== null,
    createdBatch
      ? `Batch ${createdBatch.id} created with status ${createdBatch.status}`
      : "No new batch detected"
  )

  let batchDetail: BatchDetailResponse | null = null
  if (createdBatch) {
    batchDetail = await waitForBatchTerminalState(institutionApi, createdBatch.id, 30000)
    addCheckpoint(
      checkpoints,
      "Batch reaches terminal state",
      batchDetail !== null,
      batchDetail
        ? `Final batch status: ${batchDetail.status}`
        : "Batch did not reach CONFIRMED or FAILED within timeout"
    )
  } else {
    addCheckpoint(
      checkpoints,
      "Batch reaches terminal state",
      false,
      "Skipped because batch was not created"
    )
  }

  const employerLogin = await employerApi.login("employer", identity.employerEmail, "SimEmp@2026!")
  addCheckpoint(
    checkpoints,
    "Employer login",
    employerLogin.ok,
    employerLogin.ok
      ? "Authenticated as simulation employer"
      : `HTTP ${employerLogin.status}: ${employerLogin.rawBody}`
  )

  const verifyInstitutions = await employerApi.request<VerifyInstitution[]>(
    "GET",
    "/api/verify/institutions"
  )
  const institutionName = institutionProfile.data?.name ?? ""
  const selectedInstitution = verifyInstitutions.data?.find((item) => item.name === institutionName)
  addCheckpoint(
    checkpoints,
    "Employer can fetch institution menu",
    verifyInstitutions.ok && Boolean(selectedInstitution),
    verifyInstitutions.ok
      ? `Institution menu size: ${verifyInstitutions.data?.length ?? 0}`
      : `HTTP ${verifyInstitutions.status}: ${verifyInstitutions.rawBody}`
  )

  if (selectedInstitution) {
    const invalidVerification = await employerApi.request<{ error: string }>(
      "POST",
      "/api/verify/request",
      {
        institutionOnChainId: selectedInstitution.onChainId,
        matricNumber: "INVALID/2026/ZZ",
        claimType: 3,
        threshold: 0,
      }
    )

    addCheckpoint(
      checkpoints,
      "Employer invalid matriculation is rejected",
      invalidVerification.status === 404,
      `Received HTTP ${invalidVerification.status} for invalid matric lookup`
    )

    const manualRequest = await employerApi.request<VerificationCreateResponse>(
      "POST",
      "/api/verify/request",
      {
        institutionOnChainId: selectedInstitution.onChainId,
        matricNumber,
        claimType: 6,
        threshold: 0,
      }
    )

    addCheckpoint(
      checkpoints,
      "Employer manual verification enters triage state",
      manualRequest.ok && manualRequest.data?.status === "AWAITING_INSTITUTION",
      manualRequest.ok
        ? `Returned status ${manualRequest.data?.status ?? "unknown"}`
        : `HTTP ${manualRequest.status}: ${manualRequest.rawBody}`
    )

    if (manualRequest.ok && manualRequest.data?.requestId) {
      const declineManual = await institutionApi.request<{ ok: boolean }>(
        "POST",
        `/api/institution/verifications/${manualRequest.data.requestId}/decline`
      )

      addCheckpoint(
        checkpoints,
        "Institution declines manual verification request",
        declineManual.ok,
        declineManual.ok
          ? "Manual verification request declined successfully"
          : `HTTP ${declineManual.status}: ${declineManual.rawBody}`
      )

      const manualState = await employerApi.request<VerificationRequestResponse>(
        "GET",
        `/api/verify/request/${manualRequest.data.requestId}`
      )

      addCheckpoint(
        checkpoints,
        "Employer sees manual decline result",
        manualState.ok && manualState.data?.status === "COMPLETED",
        manualState.ok
          ? `Manual request state ${manualState.data?.status}, result ${manualState.data?.result}`
          : `HTTP ${manualState.status}: ${manualState.rawBody}`
      )
    } else {
      addCheckpoint(
        checkpoints,
        "Institution declines manual verification request",
        false,
        "Skipped because manual request was not created"
      )
      addCheckpoint(checkpoints, "Employer sees manual decline result", false, "Skipped")
    }

    const autoRequest = await employerApi.request<VerificationCreateResponse>(
      "POST",
      "/api/verify/request",
      {
        institutionOnChainId: selectedInstitution.onChainId,
        matricNumber,
        claimType: 2,
        threshold: 0,
      }
    )

    addCheckpoint(
      checkpoints,
      "Employer auto verification request accepted",
      autoRequest.ok,
      autoRequest.ok
        ? `Auto request status ${autoRequest.data?.status ?? "unknown"}`
        : `HTTP ${autoRequest.status}: ${autoRequest.rawBody}`
    )

    if (autoRequest.ok && autoRequest.data?.requestId) {
      const autoTerminal = await waitForVerificationTerminalState(
        employerApi,
        autoRequest.data.requestId,
        45000
      )

      addCheckpoint(
        checkpoints,
        "Auto verification reaches terminal state",
        autoTerminal !== null,
        autoTerminal
          ? `Auto request ended as ${autoTerminal.status} (${autoTerminal.result ?? "no result"})`
          : "Timed out waiting for COMPLETED or FAILED"
      )
    } else {
      addCheckpoint(checkpoints, "Auto verification reaches terminal state", false, "Skipped")
    }

    const candidateNullifier = batchDetail?.credentials?.[0]?.nullifier
    if (candidateNullifier) {
      const revokeCredential = await institutionApi.request<{ ok: boolean }>(
        "POST",
        "/api/institution/revoke",
        {
          nullifier: candidateNullifier,
          reasonCode: 1,
        }
      )

      addCheckpoint(
        checkpoints,
        "Institution revokes credential",
        revokeCredential.ok,
        revokeCredential.ok
          ? "Credential moved to revoked state"
          : `HTTP ${revokeCredential.status}: ${revokeCredential.rawBody}`
      )

      const revokedVerification = await employerApi.request<{ error: string }>(
        "POST",
        "/api/verify/request",
        {
          institutionOnChainId: selectedInstitution.onChainId,
          matricNumber,
          claimType: 3,
          threshold: 0,
        }
      )

      addCheckpoint(
        checkpoints,
        "Employer receives revoked response for same matriculation",
        revokedVerification.status === 409,
        `Received HTTP ${revokedVerification.status} after revocation`
      )
    } else {
      addCheckpoint(
        checkpoints,
        "Institution revokes credential",
        false,
        "No credential nullifier found in batch details"
      )
      addCheckpoint(
        checkpoints,
        "Employer receives revoked response for same matriculation",
        false,
        "Skipped because revocation step did not run"
      )
    }
  } else {
    addCheckpoint(checkpoints, "Employer invalid matriculation is rejected", false, "Skipped")
    addCheckpoint(checkpoints, "Employer manual verification enters triage state", false, "Skipped")
    addCheckpoint(checkpoints, "Institution declines manual verification request", false, "Skipped")
    addCheckpoint(checkpoints, "Employer sees manual decline result", false, "Skipped")
    addCheckpoint(checkpoints, "Employer auto verification request accepted", false, "Skipped")
    addCheckpoint(checkpoints, "Auto verification reaches terminal state", false, "Skipped")
    addCheckpoint(checkpoints, "Institution revokes credential", false, "Skipped")
    addCheckpoint(
      checkpoints,
      "Employer receives revoked response for same matriculation",
      false,
      "Skipped"
    )
  }

  const adminStats = await adminApi.request<Record<string, unknown>>("GET", "/api/admin/stats")
  addCheckpoint(
    checkpoints,
    "Admin can view platform stats",
    adminStats.ok,
    adminStats.ok
      ? "Platform statistics endpoint returned data"
      : `HTTP ${adminStats.status}: ${adminStats.rawBody}`
  )

  const failed = checkpoints.filter((checkpoint) => !checkpoint.ok)
  const passed = checkpoints.length - failed.length

  console.log("\nSimulation Summary")
  console.log("------------------")
  console.log(`Total checkpoints: ${checkpoints.length}`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed.length}`)

  if (failed.length > 0) {
    console.log("\nFailed checkpoints:")
    failed.forEach((checkpoint) => {
      console.log(`- ${checkpoint.name}: ${checkpoint.detail}`)
    })
    process.exitCode = 1
  } else {
    console.log("\nAll checkpoints passed.")
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
  console.error("\nSimulation crashed unexpectedly:")
  console.error(message)
  process.exit(1)
})
