import { useState, useCallback } from 'react'
import i18next from 'i18next'
import { toast } from 'sonner'
import {
  calculateAmount,
  calculateStripeAmount,
  calculateWaffoPancakeAmount,
  calculateSepayAmount,
  requestPayment,
  requestSepayPayment,
  requestStripePayment,
  isApiSuccess,
} from '../api'
import {
  isStripePayment,
  isSepayPayment,
  isWaffoPancakePayment,
} from '../lib'

// ============================================================================
// Payment Hook
// ============================================================================

export type PaymentResult =
  | {
      type: 'qr'
      qrUrl: string
      paymentUrl?: string
      tradeNo?: string
      amount?: number
      transferContent?: string
    }
  | {
      type: 'embedded-form'
      url: string
      params: Record<string, unknown>
    }
  | {
      type: 'external'
      url: string
    }

export function usePayment() {
  const [amount, setAmount] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Calculate payment amount
  const calculatePaymentAmount = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setCalculating(true)

        const isStripe = isStripePayment(paymentType)
        const isPancake = isWaffoPancakePayment(paymentType)
        const isSepay = isSepayPayment(paymentType)
        const response = isStripe
          ? await calculateStripeAmount({ amount: topupAmount })
          : isPancake
            ? await calculateWaffoPancakeAmount({ amount: topupAmount })
            : isSepay
              ? await calculateSepayAmount({ amount: topupAmount })
              : await calculateAmount({ amount: topupAmount })

        if (isApiSuccess(response) && response.data) {
          const calculatedAmount = parseFloat(response.data)
          setAmount(calculatedAmount)
          return calculatedAmount
        }

        // Don't show error for calculation, just set to 0
        setAmount(0)
        return 0
      } catch (_error) {
        setAmount(0)
        return 0
      } finally {
        setCalculating(false)
      }
    },
    []
  )

  // Process payment
  const processPayment = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setProcessing(true)

        const isStripe = isStripePayment(paymentType)
        const isSepay = isSepayPayment(paymentType)
        const amount = Math.floor(topupAmount)

        const response = isStripe
          ? await requestStripePayment({
              amount,
              payment_method: 'stripe',
            })
          : isSepay
            ? await requestSepayPayment({
                amount,
                payment_method: 'sepay',
              })
            : await requestPayment({
                amount,
                payment_method: paymentType,
              })

        if (!isApiSuccess(response)) {
          toast.error(response.message || i18next.t('Payment request failed'))
          return false
        }

        // Handle Stripe payment
        const stripeData = response.data as { pay_link?: string } | undefined
        if (isStripe && stripeData?.pay_link) {
          return {
            type: 'external',
            url: stripeData.pay_link,
          } satisfies PaymentResult
        }

        const sepayData = response.data as
          | {
              qr_url?: string
              payment_url?: string
              trade_no?: string
              amount?: number
              transfer_content?: string
            }
          | undefined
        if (isSepay && sepayData?.qr_url) {
          return {
            type: 'qr',
            qrUrl: sepayData.qr_url,
            paymentUrl: sepayData.payment_url,
            tradeNo: sepayData.trade_no,
            amount: sepayData.amount,
            transferContent: sepayData.transfer_content,
          } satisfies PaymentResult
        }

        // Handle non-Stripe payment
        if (!isStripe && !isSepay && response.data) {
          const url = (response as unknown as { url?: string }).url
          if (url) {
            return {
              type: 'embedded-form',
              url,
              params: response.data,
            } satisfies PaymentResult
          }
        }

        return false
      } catch (_error) {
        toast.error(i18next.t('Payment request failed'))
        return false
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  return {
    amount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
    setAmount,
  }
}
