/**
 * Tests for CGPA range utilities used in batch validation.
 *
 * The Nigerian university grading system maps CGPA (×100 integer) to
 * classification codes 0–4. These tests verify the boundary conditions
 * that the batch processor and route validator both rely on.
 */

import { describe, expect, it } from "vitest"
import { formatCgpaRange, getCgpaRange, isCgpaInRange } from "../utils/cgpa.js"

// ── getCgpaRange ──────────────────────────────────────────────────────────────

describe("getCgpaRange", () => {
  it("returns Pass range for classification 0", () => {
    const range = getCgpaRange(0)
    expect(range).not.toBeNull()
    expect(range?.label).toBe("Pass")
    expect(range?.min).toBe(100)
    expect(range?.max).toBe(149)
  })

  it("returns Third Class range for classification 1", () => {
    const range = getCgpaRange(1)
    expect(range?.label).toBe("Third Class")
    expect(range?.min).toBe(150)
    expect(range?.max).toBe(249)
  })

  it("returns Second Class Lower range for classification 2", () => {
    const range = getCgpaRange(2)
    expect(range?.label).toBe("Second Class Lower")
    expect(range?.min).toBe(250)
    expect(range?.max).toBe(349)
  })

  it("returns Second Class Upper range for classification 3", () => {
    const range = getCgpaRange(3)
    expect(range?.label).toBe("Second Class Upper")
    expect(range?.min).toBe(350)
    expect(range?.max).toBe(449)
  })

  it("returns First Class range for classification 4", () => {
    const range = getCgpaRange(4)
    expect(range?.label).toBe("First Class")
    expect(range?.min).toBe(450)
    expect(range?.max).toBe(500)
  })

  it("returns null for an unknown classification code", () => {
    expect(getCgpaRange(5)).toBeNull()
    expect(getCgpaRange(-1)).toBeNull()
    expect(getCgpaRange(99)).toBeNull()
  })
})

// ── formatCgpaRange ───────────────────────────────────────────────────────────

describe("formatCgpaRange", () => {
  it("formats a range as 'min to max' with two decimal places", () => {
    const range = getCgpaRange(3)!
    expect(formatCgpaRange(range)).toBe("3.50 to 4.49")
  })

  it("formats First Class range correctly", () => {
    const range = getCgpaRange(4)!
    expect(formatCgpaRange(range)).toBe("4.50 to 5.00")
  })

  it("formats Pass range correctly", () => {
    const range = getCgpaRange(0)!
    expect(formatCgpaRange(range)).toBe("1.00 to 1.49")
  })
})

// ── isCgpaInRange ─────────────────────────────────────────────────────────────

describe("isCgpaInRange", () => {
  // ── Pass (0) ────────────────────────────────────────────────────────────────
  it("accepts CGPA 1.00 (100) for Pass", () => expect(isCgpaInRange(100, 0)).toBe(true))
  it("accepts CGPA 1.49 (149) for Pass", () => expect(isCgpaInRange(149, 0)).toBe(true))
  it("rejects CGPA 1.50 (150) for Pass", () => expect(isCgpaInRange(150, 0)).toBe(false))

  // ── Third Class (1) ─────────────────────────────────────────────────────────
  it("accepts CGPA 1.50 (150) for Third Class", () => expect(isCgpaInRange(150, 1)).toBe(true))
  it("accepts CGPA 2.49 (249) for Third Class", () => expect(isCgpaInRange(249, 1)).toBe(true))
  it("rejects CGPA 2.50 (250) for Third Class", () => expect(isCgpaInRange(250, 1)).toBe(false))
  it("rejects CGPA 1.49 (149) for Third Class", () => expect(isCgpaInRange(149, 1)).toBe(false))

  // ── Second Class Lower (2) ──────────────────────────────────────────────────
  it("accepts CGPA 2.50 (250) for Second Class Lower", () => expect(isCgpaInRange(250, 2)).toBe(true))
  it("accepts CGPA 3.49 (349) for Second Class Lower", () => expect(isCgpaInRange(349, 2)).toBe(true))
  it("rejects CGPA 3.50 (350) for Second Class Lower", () => expect(isCgpaInRange(350, 2)).toBe(false))

  // ── Second Class Upper (3) ──────────────────────────────────────────────────
  it("accepts CGPA 3.50 (350) for Second Class Upper", () => expect(isCgpaInRange(350, 3)).toBe(true))
  it("accepts CGPA 4.49 (449) for Second Class Upper", () => expect(isCgpaInRange(449, 3)).toBe(true))
  it("rejects CGPA 4.50 (450) for Second Class Upper", () => expect(isCgpaInRange(450, 3)).toBe(false))
  it("rejects CGPA 3.49 (349) for Second Class Upper", () => expect(isCgpaInRange(349, 3)).toBe(false))

  // ── First Class (4) ─────────────────────────────────────────────────────────
  it("accepts CGPA 4.50 (450) for First Class", () => expect(isCgpaInRange(450, 4)).toBe(true))
  it("accepts CGPA 5.00 (500) for First Class", () => expect(isCgpaInRange(500, 4)).toBe(true))
  it("rejects CGPA 4.49 (449) for First Class", () => expect(isCgpaInRange(449, 4)).toBe(false))
  it("rejects CGPA 5.01 (501) for First Class", () => expect(isCgpaInRange(501, 4)).toBe(false))

  // ── Unknown classification ───────────────────────────────────────────────────
  it("returns false for unknown classification code", () => {
    expect(isCgpaInRange(350, 5)).toBe(false)
    expect(isCgpaInRange(350, -1)).toBe(false)
  })

  // ── Boundary exhaustion across all classes ───────────────────────────────────
  it("every boundary value maps to exactly one classification", () => {
    const boundaries = [
      { cgpa: 100, expected: 0 },
      { cgpa: 149, expected: 0 },
      { cgpa: 150, expected: 1 },
      { cgpa: 249, expected: 1 },
      { cgpa: 250, expected: 2 },
      { cgpa: 349, expected: 2 },
      { cgpa: 350, expected: 3 },
      { cgpa: 449, expected: 3 },
      { cgpa: 450, expected: 4 },
      { cgpa: 500, expected: 4 },
    ]

    for (const { cgpa, expected } of boundaries) {
      for (let cls = 0; cls <= 4; cls++) {
        const result = isCgpaInRange(cgpa, cls)
        expect(result).toBe(cls === expected)
      }
    }
  })
})
