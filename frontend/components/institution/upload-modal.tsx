"use client"

/**
 * UploadModal - 6-step batch upload wizard.
 * Steps: TEMPLATE -> UPLOAD -> VALIDATE -> CONFIRM -> PROCESSING -> COMPLETE
 *
 * Flow:
 *  1. Download the Excel template
 *  2. Upload the filled .xlsx file
 *  3. Backend validates rows and runs gas simulation
 *  4. User confirms by typing institution name (safety gate)
 *  5. File is submitted to BullMQ; we poll the batch until terminal state
 *  6. Show result with on-chain tx link
 */

import { api } from "@/lib/api"
import { toast } from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2, Upload, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"

interface UploadModalProps {
  onDismiss: () => void
  onSuccess: () => void
}

type Step = "TEMPLATE" | "UPLOAD" | "VALIDATE" | "CONFIRM" | "PROCESSING" | "COMPLETE"

interface SimulationData {
  maxCostXlm: string
  needsInit: boolean
  isSponsored: boolean
  availableFundsXlm: string
  entryPointDepositXlm: string
  fundingShortfallXlm: string
  hasEnoughFunds: boolean
  hasEnoughEntryPointDeposit: boolean
}

interface ValidationResult {
  valid: boolean
  totalRecords: number
  gasSponsored: boolean
  simulation: SimulationData | null
  simulationError: string | null
  errors?: { row: number; error: string }[]
}

interface ErrorReportEntry {
  row: number
  error?: string
  txRef?: string
  userOpHash?: string
  fundingShortfallXlm?: string
  hasEnoughFunds?: boolean
  callGasLimit?: string
  verificationGasLimit?: string
  preVerificationGas?: string
  bundlerResponse?: string
}

interface BatchPollData {
  id?: string
  status?: string
  txHash?: string | null
  errorReport?: ErrorReportEntry[]
}

const STEPS: Step[] = ["TEMPLATE", "UPLOAD", "VALIDATE", "CONFIRM", "PROCESSING", "COMPLETE"]
const MAX_FILE_BYTES = 10 * 1024 * 1024

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>
    const resp = e["response"] as Record<string, unknown> | undefined
    const data = resp?.["data"] as Record<string, unknown> | undefined
    if (typeof data?.["error"] === "string") return data["error"]
    if (typeof e["message"] === "string") return e["message"]
  }
  return "An unexpected error occurred."
}

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  const labels: Record<Step, string> = {
    TEMPLATE: "Template",
    UPLOAD: "Upload",
    VALIDATE: "Validate",
    CONFIRM: "Confirm",
    PROCESSING: "Processing",
    COMPLETE: "Complete",
  }
  return (
    <div className="mb-8 flex items-center gap-0">
      {STEPS.map((s, i) => {
        const done = i < idx
        const active = i === idx
        return (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={[
                    "h-px flex-1 transition-colors",
                    done ? "bg-accent" : "bg-surface-border",
                  ].join(" ")}
                />
              )}
              <div
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                  done
                    ? "border-accent bg-accent text-foreground"
                    : active
                      ? "border-accent text-accent"
                      : "border-surface-border text-muted",
                ].join(" ")}
              >
                {done ? <CheckCircle2 size={10} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    "h-px flex-1 transition-colors",
                    done ? "bg-accent" : "bg-surface-border",
                  ].join(" ")}
                />
              )}
            </div>
            <span
              className={[
                "hidden text-[9px] font-medium uppercase tracking-wider sm:block",
                active ? "text-foreground" : "text-muted",
              ].join(" ")}
            >
              {labels[s]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Loader2 size={28} className="text-accent animate-spin" />
      {label && <p className="text-muted font-mono text-xs uppercase tracking-widest">{label}</p>}
    </div>
  )
}

function Alert({
  variant,
  children,
}: {
  variant: "error" | "warn" | "ok"
  children: React.ReactNode
}) {
  const styles = {
    error: "border-error/20 bg-error/5 text-red-400",
    warn: "border-warning/20 bg-warning/5 text-yellow-400",
    ok: "border-success/20 bg-success/5 text-green-400",
  }
  const icons = {
    error: <AlertCircle size={14} className="mt-0.5 shrink-0" />,
    warn: <AlertCircle size={14} className="mt-0.5 shrink-0" />,
    ok: <CheckCircle2 size={14} className="mt-0.5 shrink-0" />,
  }
  return (
    <div
      className={["flex items-start gap-2 rounded-lg border p-3 text-sm", styles[variant]].join(
        " "
      )}
    >
      {icons[variant]}
      <div>{children}</div>
    </div>
  )
}

export function UploadModal({ onDismiss, onSuccess }: UploadModalProps) {
  const [step, setStep] = useState<Step>("TEMPLATE")
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState("")
  const [busy, setBusy] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [confirmName, setConfirmName] = useState("")
  const [institutionName, setInstitutionName] = useState("")
  const [pollData, setPollData] = useState<BatchPollData | null>(null)
  const [predeploying, setPredeploying] = useState(false)
  const [predeployMsg, setPredeployMsg] = useState("")
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setInstitutionName(r.data?.user?.name ?? ""))
      .catch(() => {})
  }, [])

  const needsTopUp = Boolean(
    validation?.simulation &&
    (!validation.simulation.hasEnoughFunds || !validation.simulation.hasEnoughEntryPointDeposit)
  )

  const onDrop = useCallback((accepted: File[]) => {
    setFileError("")
    const f = accepted[0]
    if (!f) return
    if (f.size > MAX_FILE_BYTES) {
      setFileError("File exceeds 10 MB limit.")
      return
    }
    setFile(f)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_BYTES,
    onDropRejected: (rejections) => {
      const msg = rejections[0]?.errors[0]?.message ?? "Invalid file."
      setFileError(msg)
    },
  })

  function cleanupPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  async function downloadTemplate() {
    try {
      const res = await api.get("/institution/batch/template", { responseType: "blob" })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = "veridaq_template.xlsx"
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast.error("Template download failed.")
    }
  }

  async function validateFile() {
    if (!file) return
    setBusy(true)
    setStep("VALIDATE")
    setValidation(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await api.post("/institution/batch/validate", fd)
      setValidation(res.data)
    } catch (err: unknown) {
      const extracted = extractError(err)
      setValidation({
        valid: false,
        totalRecords: 0,
        gasSponsored: false,
        simulation: null,
        simulationError: null,
        errors: [{ row: 0, error: extracted }],
      })
    } finally {
      setBusy(false)
    }
  }

  async function predeployAccount() {
    setPredeploying(true)
    setPredeployMsg("")
    try {
      const { data } = await api.post("/institution/aa/predeploy")
      setPredeployMsg(
        data?.deployed ? "Account deployed. You can proceed." : "Account already deployed."
      )
    } catch (err) {
      setPredeployMsg(extractError(err))
    } finally {
      setPredeploying(false)
    }
  }

  async function confirmUpload() {
    if (!file || !validation?.valid) return
    setBusy(true)
    setStep("PROCESSING")
    setPollData(null)

    try {
      if (validation.simulation?.needsInit) {
        await predeployAccount()
      }

      const fd = new FormData()
      fd.append("file", file)
      const res = await api.post("/institution/batch/upload", fd)

      if (res.data?.jobId) {
        pollForBatch(res.data.jobId)
      } else {
        setStep("COMPLETE")
        setBusy(false)
      }
    } catch (err) {
      setPollData({
        status: "FAILED",
        errorReport: [{ row: 0, error: extractError(err) }],
      })
      setStep("COMPLETE")
      setBusy(false)
    }
  }

  function pollForBatch(_jobId: string) {
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      if (attempts > 40) {
        cleanupPoll()
        setStep("COMPLETE")
        setBusy(false)
        toast.info("Polling timed out. Check your batches list.")
        return
      }
      try {
        const { data } = await api.get("/institution/batch?page=1&limit=1")
        const latest = data?.items?.[0]
        if (latest?.id && latest?.status) {
          if (latest.status === "CONFIRMED" || latest.status === "FAILED") {
            cleanupPoll()
            setPollData(latest)
            setStep("COMPLETE")
            setBusy(false)
            if (latest.status === "CONFIRMED") {
              onSuccess()
              toast.success("Batch confirmed on-chain.")
            } else {
              toast.error("Batch failed. See error details.")
            }
          }
        }
      } catch {
        cleanupPoll()
        setStep("COMPLETE")
        setBusy(false)
        toast.error("Lost connection while polling batch status.")
      }
    }, 5000)
  }

  function handleDismiss() {
    if (busy) return
    cleanupPoll()
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="border-surface-border bg-surface-card flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="border-surface-border flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-foreground text-base font-semibold">Batch Upload</h2>
            <p className="text-muted mt-0.5 text-xs">Commit student credentials to Stellar</p>
          </div>
          <button
            onClick={handleDismiss}
            disabled={busy}
            className="text-muted hover:text-foreground transition-colors disabled:opacity-30"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <StepIndicator current={step} />

          {/* ── TEMPLATE ── */}
          {step === "TEMPLATE" && (
            <div className="flex flex-col items-center gap-6 py-6 text-center">
              <div className="border-surface-border flex h-14 w-14 items-center justify-center rounded-full border">
                <FileUp size={24} className="text-muted" />
              </div>
              <div>
                <h3 className="text-foreground font-medium">Download the required template</h3>
                <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
                  Use the official Excel template. Do not modify column headers or sheet names.
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="border-surface-border text-foreground flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:border-white/30"
              >
                <Download size={16} /> Download Template
              </button>
              <button
                onClick={() => setStep("UPLOAD")}
                className="bg-accent text-void w-full max-w-xs rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                I have the template — Continue
              </button>
            </div>
          )}

          {/* ── UPLOAD ── */}
          {step === "UPLOAD" && (
            <div className="flex flex-col gap-5">
              <div
                {...getRootProps()}
                className={[
                  "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-10 transition-colors",
                  isDragActive
                    ? "border-accent bg-accent/5"
                    : "border-surface-border hover:border-white/20",
                ].join(" ")}
              >
                <input {...getInputProps()} />
                <Upload size={32} className={isDragActive ? "text-accent" : "text-muted"} />
                <div className="text-center">
                  <p className="text-foreground text-sm font-medium">
                    {isDragActive
                      ? "Drop the file here"
                      : "Drag & drop an .xlsx file, or click to select"}
                  </p>
                  <p className="text-muted mt-1 text-xs">Max 10 MB · .xlsx only</p>
                </div>
              </div>

              {fileError && <Alert variant="error">{fileError}</Alert>}

              {file && (
                <div className="border-surface-border flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileUp size={18} className="text-accent shrink-0" />
                    <div>
                      <p className="text-foreground text-sm font-medium">{file.name}</p>
                      <p className="text-muted text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null)
                      setFileError("")
                    }}
                    className="text-muted transition-colors hover:text-red-400"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setStep("TEMPLATE")}
                  className="border-surface-border text-foreground hover:bg-surface rounded-lg border px-4 py-2 text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={validateFile}
                  disabled={!file || !!fileError}
                  className="bg-accent text-void rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Validate File
                </button>
              </div>
            </div>
          )}

          {/* ── VALIDATE ── */}
          {step === "VALIDATE" && (
            <div className="flex flex-col gap-5">
              {busy ? (
                <Spinner label="Validating rows" />
              ) : validation?.valid ? (
                <div className="flex flex-col gap-4">
                  <Alert variant="ok">
                    <span className="font-medium">Validation passed</span>
                    <span className="text-muted ml-2 text-xs">
                      {validation.totalRecords} valid records
                    </span>
                  </Alert>

                  <div className="border-surface-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border">
                    {[
                      ["Records", String(validation.totalRecords)],
                      ["Gas", validation.gasSponsored ? "Sponsored" : "Institution funded"],
                      ...(validation.simulation
                        ? [
                            [
                              "Max cost",
                              Number(validation.simulation.maxCostXlm).toFixed(6) + " XLM",
                            ],
                            [
                              "AA account",
                              validation.simulation.needsInit ? "Needs deploy" : "Ready",
                            ],
                            [
                              "Available",
                              Number(validation.simulation.availableFundsXlm).toFixed(6) + " XLM",
                            ],
                            [
                              "EntryPoint",
                              Number(validation.simulation.entryPointDepositXlm).toFixed(6) +
                                " XLM",
                            ],
                          ]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label} className="bg-surface-card px-4 py-3">
                        <p className="text-muted text-xs">{label}</p>
                        <p className="text-foreground mt-0.5 text-sm font-medium">{value}</p>
                      </div>
                    ))}
                  </div>

                  {needsTopUp && validation.simulation && (
                    <Alert variant="error">
                      <p className="font-medium">Insufficient funds for this batch</p>
                      <p className="mt-1 text-xs">
                        Shortfall: {Number(validation.simulation.fundingShortfallXlm).toFixed(6)}{" "}
                        XLM.
                        {!validation.simulation.hasEnoughFunds
                          ? " Top up the sponsored pool or institution balance."
                          : " Top up the EntryPoint deposit."}
                      </p>
                    </Alert>
                  )}

                  {validation.simulation?.needsInit && (
                    <div className="border-surface-border rounded-lg border p-4">
                      <p className="text-muted text-xs">
                        First batch requires AA account deployment. Predeploying reduces gas cost.
                      </p>
                      <button
                        onClick={predeployAccount}
                        disabled={predeploying}
                        className="border-warning/30 hover:bg-warning/10 mt-3 rounded-lg border px-3 py-1.5 text-xs text-yellow-400 transition-colors disabled:opacity-50"
                      >
                        {predeploying && <Loader2 size={12} className="mr-1 inline animate-spin" />}
                        {predeploying ? "Deploying..." : "Predeploy Account"}
                      </button>
                      {predeployMsg && (
                        <p className="mt-2 text-xs text-yellow-400">{predeployMsg}</p>
                      )}
                    </div>
                  )}

                  {validation.simulationError && (
                    <p className="text-muted text-xs">
                      Simulation note: {validation.simulationError}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setStep("UPLOAD")}
                      className="border-surface-border text-foreground hover:bg-surface rounded-lg border px-4 py-2 text-sm transition-colors"
                    >
                      Re-upload
                    </button>
                    <button
                      onClick={() => setStep("CONFIRM")}
                      disabled={needsTopUp}
                      className="bg-accent text-void rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Proceed
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Alert variant="error">
                    <span className="font-medium">Validation failed</span> — fix the errors below
                    and re-upload.
                  </Alert>
                  <div className="border-surface-border max-h-56 overflow-y-auto rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-surface-border bg-surface-card sticky top-0 border-b">
                        <tr>
                          <th className="text-muted px-3 py-2 font-medium">Row</th>
                          <th className="text-muted px-3 py-2 font-medium">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validation?.errors?.map((e, i) => (
                          <tr key={i} className="border-surface-border/40 border-b">
                            <td className="text-muted px-3 py-2">{e.row || "—"}</td>
                            <td className="px-3 py-2 text-red-400">{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep("UPLOAD")}
                      className="border-surface-border text-foreground hover:bg-surface rounded-lg border px-4 py-2 text-sm transition-colors"
                    >
                      Return to Upload
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "CONFIRM" && (
            <div className="flex flex-col gap-5">
              <Alert variant="warn">
                <p className="font-medium">This action is irreversible</p>
                <p className="mt-1 text-xs">
                  You are about to commit {validation?.totalRecords} student records to Stellar
                  blockchain. Commitments cannot be altered once mined.
                </p>
              </Alert>

              <div className="border-surface-border rounded-lg border p-4">
                <label className="text-muted mb-2 block text-xs font-medium uppercase tracking-wider">
                  Type your institution name to confirm
                </label>
                <p className="text-muted mb-3 font-mono text-xs">{institutionName}</p>
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="border-surface-border bg-void focus:border-accent text-foreground w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
                  placeholder={institutionName}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setStep("VALIDATE")}
                  className="border-surface-border text-foreground hover:bg-surface rounded-lg border px-4 py-2 text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={confirmUpload}
                  disabled={confirmName !== institutionName || busy}
                  className="text-foreground rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold transition-opacity hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Confirm & Publish On-Chain
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === "PROCESSING" && (
            <div className="flex flex-col items-center gap-6 py-10 text-center">
              <Spinner label="Processing" />
              <div>
                <h3 className="text-foreground font-medium">Submitting to blockchain</h3>
                <p className="text-muted mt-1 text-sm">
                  Status: {pollData?.status ?? "SUBMITTING"}
                </p>
                <p className="text-muted mt-1 text-xs">Do not close this window.</p>
                {pollData?.txHash && (
                  <p className="text-muted mt-2 font-mono text-xs">
                    Tx: {pollData.txHash.slice(0, 18)}…
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── COMPLETE ── */}
          {step === "COMPLETE" && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              {pollData?.status === "FAILED" ? (
                <div className="border-error/30 bg-error/10 flex h-16 w-16 items-center justify-center rounded-full border">
                  <AlertCircle size={32} className="text-red-400" />
                </div>
              ) : (
                <div className="border-success/30 bg-success/10 flex h-16 w-16 items-center justify-center rounded-full border">
                  <CheckCircle2 size={32} className="text-green-400" />
                </div>
              )}

              <div>
                <h3 className="text-foreground text-xl font-semibold">
                  {pollData?.status === "FAILED" ? "Batch Failed" : "Batch Confirmed"}
                </h3>
                <p className="text-muted mt-1 text-sm">
                  {pollData?.status === "FAILED"
                    ? "The transaction did not complete. Review the details below."
                    : "Credentials are sealed on-chain."}
                </p>
                {pollData?.txHash && pollData.status !== "FAILED" && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${pollData.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent mt-2 inline-block font-mono text-xs hover:underline"
                  >
                    View on Stellar Expert
                  </a>
                )}
              </div>

              {pollData?.status === "FAILED" && pollData.errorReport?.length ? (
                <div className="border-surface-border w-full max-w-lg rounded-lg border p-4 text-left">
                  <p className="text-muted mb-3 text-xs font-medium uppercase tracking-wider">
                    Error Details
                  </p>
                  <div className="space-y-2">
                    {pollData.errorReport.map((e, i) => (
                      <div
                        key={i}
                        className="border-surface-border/40 border-b pb-2 text-xs last:border-0"
                      >
                        <p className="text-red-400">{e.error ?? "Unknown error"}</p>
                        {e.txRef && <p className="text-muted mt-0.5">Ref: {e.txRef}</p>}
                        {e.userOpHash && (
                          <p className="text-muted mt-0.5">UserOp: {e.userOpHash.slice(0, 18)}…</p>
                        )}
                        {e.fundingShortfallXlm && e.fundingShortfallXlm !== "0" && (
                          <p className="mt-0.5 text-red-400">
                            Shortfall: {e.fundingShortfallXlm} XLM
                          </p>
                        )}
                        {typeof e.hasEnoughFunds === "boolean" && (
                          <p className="text-muted mt-0.5">
                            Funds: {e.hasEnoughFunds ? "OK" : "Insufficient"}
                          </p>
                        )}
                        {e.callGasLimit && (
                          <p className="text-muted mt-0.5">CallGas: {e.callGasLimit}</p>
                        )}
                        {e.verificationGasLimit && (
                          <p className="text-muted mt-0.5">VerifGas: {e.verificationGasLimit}</p>
                        )}
                        {e.preVerificationGas && (
                          <p className="text-muted mt-0.5">PreVerifGas: {e.preVerificationGas}</p>
                        )}
                        {e.bundlerResponse && (
                          <details className="mt-1">
                            <summary className="text-muted hover:text-foreground cursor-pointer">
                              Bundler response
                            </summary>
                            <pre className="text-muted border-surface-border/30 bg-void/50 mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded border p-2 font-mono text-[10px]">
                              {e.bundlerResponse}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                onClick={handleDismiss}
                className="bg-accent text-void mt-2 rounded-lg px-8 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
