"use client"
import { CreditPurchaseModal } from "./credit-purchase-modal"

type TopupModalProps = {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function TopupModal({ open, onClose, onSuccess }: TopupModalProps) {
  return (
    <CreditPurchaseModal
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
