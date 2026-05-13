import { useState, useEffect, useMemo } from 'react'
import { Gift, ExternalLink, Loader2, Receipt, WalletCards, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatPaymentLocalCurrencyAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  formatCurrency,
  getAmountDiscount,
  getDiscountLabel,
  getPaymentIcon,
  getMinTopupAmount,
  calculatePresetPricing,
} from '../lib'
import type {
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  CreemProduct,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  customAmountMode?: boolean
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  onOpenBilling?: () => void
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
}

export function RechargeFormCard({
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  customAmountMode,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  paymentLoading,
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
  topupLink,
  loading,
  priceRatio = 1,
  usdExchangeRate = 1,
  creemProducts,
  enableCreemTopup,
  onCreemProductSelect,
  enableWaffoTopup,
  waffoPayMethods,
  waffoMinTopup,
  onWaffoMethodSelect,
  enableWaffoPancakeTopup,
}: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(topupAmount.toString())

  useEffect(() => {
    setLocalAmount(topupAmount.toString())
  }, [topupAmount])

  const handleAmountChange = (value: string) => {
    setLocalAmount(value)
    const numValue = Math.max(0, parseInt(value) || 0)
    if (numValue >= 0) {
      onTopupAmountChange(numValue)
    }
  }

  const extendedPresets = useMemo(() => {
    if (presetAmounts.length === 0) return []
    return [
      ...presetAmounts,
      { value: -1, label: t('Custom'), discount: 1.0 } as PresetAmount,
    ]
  }, [presetAmounts, t])

  const showCustomInput =
    customAmountMode || selectedPreset === -1 || presetAmounts.length === 0

  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup ||
    topupInfo?.enable_sepay_topup
  const hasAnyTopup = hasConfigurableTopup || enableCreemTopup
  const hasStandardPaymentMethods =
    Array.isArray(topupInfo?.pay_methods) && topupInfo.pay_methods.length > 0
  const hasWaffoPaymentMethods =
    Array.isArray(waffoPayMethods) && waffoPayMethods.length > 0
  const minTopup = getMinTopupAmount(topupInfo)

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-24 rounded-2xl' />
          ))}
        </div>
        <Skeleton className='h-40 rounded-2xl' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 pb-8'>
      {/* Online Topup Section */}
      {hasAnyTopup ? (
        <div className='flex flex-col gap-8'>
          {hasConfigurableTopup && (
            <>
              {extendedPresets.length > 0 && (
                <div className='flex flex-col gap-4'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                      1. {t('Select Amount')}
                    </Label>
                  </div>
                  <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                    {extendedPresets.map((preset, index) => {
                      if (preset.value === -1) {
                        return (
                          <button
                            key='custom-preset'
                            type='button'
                            className={cn(
                              'group relative flex min-h-[90px] flex-col items-center justify-center rounded-2xl border-2 px-4 py-3 transition-all duration-200',
                              selectedPreset === -1
                                ? 'border-primary bg-primary/5'
                                : 'border-muted bg-background hover:border-primary/30 hover:bg-muted/30'
                            )}
                            onClick={() => onSelectPreset(preset)}
                          >
                            <div className='text-lg font-bold sm:text-xl'>
                              {t('Custom')}
                            </div>
                            <div className='text-muted-foreground mt-1 text-[10px] font-medium uppercase tracking-tight'>
                              {t('Flexible')}
                            </div>
                          </button>
                        )
                      }

                      const discount = getAmountDiscount(
                        preset.value,
                        topupInfo?.discount
                      )
                      const {
                        originalPrice,
                        actualPrice,
                        hasDiscount,
                      } = calculatePresetPricing(
                        preset.value,
                        priceRatio,
                        discount,
                        usdExchangeRate
                      )

                      return (
                        <button
                          key={index}
                          type='button'
                          className={cn(
                            'group relative flex min-h-[90px] flex-col items-start justify-between rounded-2xl border-2 px-4 py-4 text-left transition-all duration-200',
                            selectedPreset === preset.value
                              ? 'border-primary bg-primary/5'
                              : 'border-muted bg-background hover:border-primary/30 hover:bg-muted/30'
                          )}
                          onClick={() => onSelectPreset(preset)}
                        >
                          {hasDiscount && (
                            <div className='bg-green-500 absolute -top-2.5 -right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ring-2 ring-white'>
                              {getDiscountLabel(discount)}
                            </div>
                          )}

                          <div className='text-2xl font-black tracking-tight'>
                            {formatCurrency(preset.value, '$')}
                          </div>

                          <div className='mt-2 flex w-full flex-col'>
                            <span className='text-foreground text-xs font-bold'>
                              {formatPaymentLocalCurrencyAmount(actualPrice, {
                                digitsLarge: 2,
                                digitsSmall: 2,
                                abbreviate: false,
                              })}
                            </span>
                            {hasDiscount && (
                              <span className='text-muted-foreground/60 text-[10px] line-through decoration-1 underline-offset-2'>
                                {formatPaymentLocalCurrencyAmount(
                                  originalPrice,
                                  {
                                    digitsLarge: 2,
                                    digitsSmall: 2,
                                    abbreviate: false,
                                  }
                                )}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {showCustomInput && (
                <div className='bg-muted/30 flex flex-col gap-4 rounded-3xl border-2 border-dashed p-6 transition-all sm:p-8'>
                  <Label
                    htmlFor='topup-amount'
                    className='text-muted-foreground text-xs font-bold tracking-wider uppercase'
                  >
                    {t('Custom Amount')}
                  </Label>
                  <div className='flex flex-col gap-4 sm:flex-row sm:items-center'>
                    <div className='relative flex-1'>
                      <div className='text-muted-foreground absolute top-1/2 left-4 -translate-y-1/2 font-bold'>
                        $
                      </div>
                      <Input
                        id='topup-amount'
                        type='number'
                        value={localAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        min={minTopup}
                        step={1}
                        placeholder={`Min ${minTopup}`}
                        className='h-12 border-2 border-muted-foreground/20 bg-background pl-8 text-xl font-bold focus-visible:border-primary focus-visible:ring-0'
                      />
                    </div>
                    <div className='hidden text-muted-foreground sm:block'>
                      <ChevronRight className='size-6' />
                    </div>
                    <div className='bg-background flex flex-1 items-center justify-between rounded-xl border-2 border-muted-foreground/10 px-6 py-3'>
                      <span className='text-muted-foreground text-sm font-medium'>
                        {t('Total to pay')}
                      </span>
                      {calculating ? (
                        <Skeleton className='h-7 w-20' />
                      ) : (
                        <span className='text-primary text-xl font-black'>
                          {formatPaymentLocalCurrencyAmount(
                            paymentAmount *
                              getAmountDiscount(
                                topupAmount,
                                topupInfo?.discount
                              ),
                            {
                              digitsLarge: 2,
                              digitsSmall: 2,
                              abbreviate: false,
                            }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className='flex flex-col gap-4'>
                <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                  2. {t('Choose Payment Method')}
                </Label>
                {hasStandardPaymentMethods || hasWaffoPaymentMethods ? (
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                    {topupInfo?.pay_methods?.map((method) => {
                      const minTopup = method.min_topup || 0
                      const disabled = minTopup > topupAmount

                      const button = (
                        <Button
                          key={method.type}
                          variant='outline'
                          onClick={() => onPaymentMethodSelect(method)}
                          disabled={disabled || !!paymentLoading}
                          className={cn(
                            'group hover:border-primary hover:bg-primary/5 h-14 justify-between gap-3 rounded-2xl border-2 px-5 transition-all',
                            paymentLoading === method.type && 'border-primary'
                          )}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='bg-muted group-hover:bg-primary/10 flex size-8 items-center justify-center rounded-lg transition-colors'>
                              {paymentLoading === method.type ? (
                                <Loader2 className='size-4 animate-spin' />
                              ) : (
                                getPaymentIcon(
                                  method.type,
                                  'size-4',
                                  method.icon,
                                  method.name
                                )
                              )}
                            </div>
                            <span className='font-bold'>{method.name}</span>
                          </div>
                          <ChevronRight className='text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5' />
                        </Button>
                      )

                      return disabled ? (
                        <TooltipProvider key={method.type}>
                          <Tooltip>
                            <TooltipTrigger render={button}></TooltipTrigger>
                            <TooltipContent>
                              {t('Minimum topup amount: {{amount}}', {
                                amount: minTopup,
                              })}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        button
                      )
                    })}

                    {enableWaffoTopup &&
                      waffoPayMethods?.map((method, index) => {
                        const loadingKey = `waffo-${index}`
                        const waffoMin = waffoMinTopup || 0
                        const belowMin = waffoMin > topupAmount

                        const button = (
                          <Button
                            key={`${method.name}-${index}`}
                            variant='outline'
                            onClick={() => onWaffoMethodSelect?.(method, index)}
                            disabled={belowMin || !!paymentLoading}
                            className={cn(
                              'group hover:border-primary hover:bg-primary/5 h-14 justify-between gap-3 rounded-2xl border-2 px-5 transition-all',
                              paymentLoading === loadingKey && 'border-primary'
                            )}
                          >
                            <div className='flex items-center gap-3'>
                              <div className='bg-muted group-hover:bg-primary/10 flex size-8 items-center justify-center rounded-lg transition-colors'>
                                {paymentLoading === loadingKey ? (
                                  <Loader2 className='size-4 animate-spin' />
                                ) : method.icon ? (
                                  <img
                                    src={method.icon}
                                    alt={method.name}
                                    className='size-4 object-contain'
                                  />
                                ) : (
                                  getPaymentIcon('waffo')
                                )}
                              </div>
                              <span className='font-bold'>{method.name}</span>
                            </div>
                            <ChevronRight className='text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5' />
                          </Button>
                        )

                        return belowMin ? (
                          <TooltipProvider key={`${method.name}-${index}`}>
                            <Tooltip>
                              <TooltipTrigger render={button}></TooltipTrigger>
                              <TooltipContent>
                                {t('Minimum topup amount: {{amount}}', {
                                  amount: waffoMin,
                                })}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          button
                        )
                      })}
                  </div>
                ) : (
                  <Alert className='rounded-2xl'>
                    <AlertDescription>
                      {t(
                        'No payment methods available. Please contact administrator.'
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <Alert className='rounded-2xl'>
          <AlertDescription>
            {t(
              'Online topup is not enabled. Please use redemption code or contact administrator.'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Creem Products Section */}
      {enableCreemTopup &&
        Array.isArray(creemProducts) &&
        creemProducts.length > 0 &&
        onCreemProductSelect && (
          <div className='flex flex-col gap-4'>
            <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
              {t('Creem Products')}
            </Label>
            <CreemProductsSection
              products={creemProducts}
              onProductSelect={onCreemProductSelect}
            />
          </div>
        )}
    </div>
  )
}
