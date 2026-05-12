import { DEFAULT_DISCOUNT_RATE } from '../constants'

// ============================================================================
// Wallet-specific Formatting Functions
// ============================================================================

/**
 * Format Creem price with currency symbol (USD/EUR)
 */
export function formatCreemPrice(
  price: number,
  currency: 'USD' | 'EUR'
): string {
  const symbol = currency === 'EUR' ? '€' : '$'
  return `${symbol}${price.toFixed(2)}`
}

/**
 * Format large quota numbers with K/M suffix
 */
export function formatQuotaShort(quota: number): string {
  if (quota >= 1000000) {
    return `${(quota / 1000000).toFixed(1)}M`
  }
  if (quota >= 1000) {
    return `${(quota / 1000).toFixed(1)}K`
  }
  return quota.toString()
}

/**
 * Format currency amount with an optional symbol prefix.
 * This is used for payment amounts that have been calculated via priceRatio.
 */
export function formatCurrency(
  amount: number | string,
  symbol: string = ''
): string {
  const numeric =
    typeof amount === 'number' ? amount : Number.parseFloat(String(amount))
  if (!Number.isFinite(numeric)) return '-'

  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(numeric) >= 1 ? 2 : 4,
  }).format(numeric)

  return symbol ? `${symbol}${formatted}` : formatted
}

/**
 * Get discount label for display (e.g., "20% OFF")
 */
export function getDiscountLabel(discount: number): string {
  if (discount >= DEFAULT_DISCOUNT_RATE) {
    return ''
  }
  const off = Math.round((1 - discount) * 100)
  return `${off}% OFF`
}

export function getAmountDiscount(
  amount: number,
  discounts?: Record<number, number>
): number {
  if (!discounts) return DEFAULT_DISCOUNT_RATE

  let bestThreshold = -1
  let bestDiscount = DEFAULT_DISCOUNT_RATE

  Object.entries(discounts).forEach(([threshold, discount]) => {
    const thresholdValue = Number(threshold)
    if (
      Number.isFinite(thresholdValue) &&
      thresholdValue <= amount &&
      thresholdValue > bestThreshold
    ) {
      bestThreshold = thresholdValue
      const discountValue = Number(discount)
      bestDiscount =
        Number.isFinite(discountValue) && discountValue > 0
          ? discountValue
          : DEFAULT_DISCOUNT_RATE
    }
  })

  return bestDiscount
}

/**
 * Calculate pricing details for a preset amount
 */
export function calculatePresetPricing(
  presetValue: number,
  priceRatio: number,
  discount: number,
  usdExchangeRate: number = 1
) {
  const originalPrice = presetValue * priceRatio
  const actualPrice = originalPrice * discount
  const savedAmount = originalPrice - actualPrice
  const hasDiscount = discount < 1.0
  const displayValue = presetValue * usdExchangeRate

  return {
    displayValue,
    originalPrice,
    actualPrice,
    savedAmount,
    hasDiscount,
  }
}
