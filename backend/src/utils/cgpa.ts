type CgpaRange = {
  min: number
  max: number
  label: string
}

const CGPA_RANGES: Record<number, CgpaRange> = {
  0: { min: 100, max: 149, label: "Pass" },
  1: { min: 150, max: 249, label: "Third Class" },
  2: { min: 250, max: 349, label: "Second Class Lower" },
  3: { min: 350, max: 449, label: "Second Class Upper" },
  4: { min: 450, max: 500, label: "First Class" },
}

export function getCgpaRange(classification: number): CgpaRange | null {
  return CGPA_RANGES[classification] ?? null
}

export function formatCgpaRange(range: CgpaRange): string {
  const min = (range.min / 100).toFixed(2)
  const max = (range.max / 100).toFixed(2)
  return `${min} to ${max}`
}

export function isCgpaInRange(cgpaInt: number, classification: number): boolean {
  const range = getCgpaRange(classification)
  if (!range) return false
  return cgpaInt >= range.min && cgpaInt <= range.max
}
