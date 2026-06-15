/**
 * Utility functions used across the frontend.
 * cn() merges Tailwind class names safely, preventing duplicates.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date string to a readable local date. */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-NG", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
  })
}

/** Format a date string to include time. */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-NG", {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  })
}

/** Shorten a blockchain address or tx hash for display. */
export function truncateHash(hash: string, chars = 6): string {
  if (!hash) return ""
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`
}

/** Check if a string looks like a valid Stellar public key (starts with G). */
export function isStellarAddress(addr: string): boolean {
  return /^G[A-Z0-9]{55}$/i.test(addr)
}

/** Format a stroop-denominated balance (7-decimal Stellar precision) to a display string. */
export function formatStellarBalance(stroops: string | bigint | number, decimals = 4): string {
  const val = typeof stroops === "string" ? Number(stroops) : Number(stroops)
  return (val / 1e7).toFixed(decimals)
}

/** Open StellarExpert for a transaction hash (stub — replace with real explorer). */
export function explorerUrl(txHash: string): string {
  return `https://stellar.expert/explorer/public/tx/${txHash}`
}

/** Sleep for a given number of milliseconds. Useful for polling loops. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
