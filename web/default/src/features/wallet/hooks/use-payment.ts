import { useState, useCallback } from 'react'
import i18next from 'i18next'
import { toast } from 'sonner'
import {
  calculateAmount,
  calculateStripeAmount,
  calculateWaffoPancakeAmount,
  requestPayment,
  requestSepayPayment,
  requestStripePayment,
  isApiSuccess,
} from '../api'
import {
  isSepayPayment,
  isStripePayment,
  isWaffoPancakePayment,
  submitPaymentForm,
} from '../lib'
import type { SepayPaymentData } from '../types'

// ============================================================================
// Payment Hook
// ============================================================================

export function usePayment() {
  const [amount, setAmount] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sepayPayment, setSepayPayment] = useState<SepayPaymentData | null>(
    null
  )

  // Calculate payment amount
  const calculatePaymentAmount = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setCalculating(true)

        const isStripe = isStripePayment(paymentType)
        const isPancake = isWaffoPancakePayment(paymentType)
        const response = isStripe
          ? await calculateStripeAmount({ amount: topupAmount })
          : isPancake
            ? await calculateWaffoPancakeAmount({ amount: topupAmount })
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
        const responseData = response.data as Record<string, unknown> | undefined

        if (isStripe && typeof responseData?.pay_link === 'string') {
          window.open(responseData.pay_link, '_blank')
          toast.success(i18next.t('Redirecting to payment page...'))
          return true
        }

        // Handle SEPAY VietQR payment
        if (isSepay && typeof responseData?.qr_url === 'string') {
          setSepayPayment(response.data as SepayPaymentData)
          toast.success(i18next.t('Scan QR code to complete payment'))
          return true
        }

        // Handle non-Stripe payment
        if (!isStripe && !isSepay && response.data) {
          const url = (response as unknown as { url?: string }).url
          if (url) {
            submitPaymentForm(url, response.data)
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
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
    sepayPayment,
    calculatePaymentAmount,
    processPayment,
    setAmount,
    setSepayPayment,
  }
}
