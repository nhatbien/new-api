import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronRight, Loader2, Check, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatPaymentLocalCurrencyAmount } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
  redemptionCode?: string
  onRedemptionCodeChange?: (code: string) => void
  onRedeem?: () => void
  redeeming?: boolean
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
  redemptionCode: _redemptionCode,
  onRedemptionCodeChange: _onRedemptionCodeChange,
  onRedeem: _onRedeem,
  redeeming: _redeeming,
  topupLink: _topupLink,
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
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-40 rounded-[20px]' />
          ))}
        </div>
        <Skeleton className='h-32 rounded-[20px]' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-9 pb-8'>
      {/* Online Topup Section */}
      {hasAnyTopup ? (
        <div className='flex flex-col gap-10'>
          {hasConfigurableTopup && (
            <>
              {extendedPresets.length > 0 && (
                <div className='flex flex-col gap-5'>
                  <Label className='text-lg font-bold tracking-tight text-foreground'>
                    1. {t('Select Amount')}
                  </Label>
                  <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4'>
                    {extendedPresets.map((preset, index) => {
                      const isSelected = selectedPreset === preset.value
                      const isCustom = preset.value === -1

                      if (isCustom) {
                        return (
                          <button
                            key='custom-preset'
                            type='button'
                            className={cn(
                              'relative flex min-h-36 flex-col items-center justify-center rounded-[20px] border bg-background px-7 py-6 text-left shadow-sm transition-all duration-200',
                              isSelected
                                ? 'border-primary ring-1 ring-primary'
                                : 'border-border hover:border-primary/50'
                            )}
                            onClick={() => onSelectPreset(preset)}
                          >
                            <div className='flex items-center gap-3 text-3xl font-bold'>
                              <SlidersHorizontal className='size-7 text-muted-foreground' />
                              {t('Custom')}
                            </div>
                            <div className='mt-3 text-sm font-bold tracking-widest text-muted-foreground uppercase'>
                              {t('Flexible')}
                            </div>
                            {isSelected && (
                              <div className='absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-primary text-white'>
                                <Check className='size-3 stroke-[3]' />
                              </div>
                            )}
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
                            'relative flex min-h-36 flex-col items-start justify-center rounded-[20px] border bg-background px-7 py-6 text-left shadow-sm transition-all duration-200',
                            isSelected
                              ? 'border-primary ring-1 ring-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                          onClick={() => onSelectPreset(preset)}
                        >
                          {hasDiscount && (
                            <div className='absolute top-3 right-4 rounded-full bg-green-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm'>
                              {getDiscountLabel(discount)}
                            </div>
                          )}

                          <div className='text-3xl font-bold tracking-tight'>
                            {formatCurrency(preset.value, '$')}
                          </div>

                          <div className='mt-4 flex flex-col gap-1'>
                            <span className='text-base font-bold text-foreground'>
                              {formatPaymentLocalCurrencyAmount(actualPrice, {
                                digitsLarge: 2,
                                digitsSmall: 2,
                                abbreviate: false,
                              })}
                            </span>
                            {hasDiscount && (
                              <span className='text-sm text-muted-foreground line-through'>
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

                          {isSelected && (
                            <div className='absolute right-4 bottom-4 flex size-6 items-center justify-center rounded-full bg-primary text-white'>
                              <Check className='size-3 stroke-[3]' />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <AnimatePresence mode='wait'>
                {showCustomInput && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className='flex flex-col gap-6 rounded-[20px] border bg-background p-6 shadow-sm sm:p-8'
                  >
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
                          className='h-14 rounded-xl border bg-background pl-8 text-xl font-bold focus-visible:ring-1 focus-visible:ring-primary'
                        />
                      </div>
                      <div className='hidden text-muted-foreground/20 sm:block'>
                        <ChevronRight className='size-6' />
                      </div>
                      <div className='flex flex-1 items-center justify-between rounded-xl border bg-background px-6 py-4'>
                        <div className='flex flex-col'>
                          <span className='text-muted-foreground text-[10px] font-bold uppercase tracking-wider'>
                            {t('Total to pay')}
                          </span>
                          {calculating ? (
                            <Skeleton className='mt-1 h-6 w-20' />
                          ) : (
                            <span className='text-xl font-bold'>
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
                        {!calculating && (
                          <div className='bg-primary/10 flex size-10 items-center justify-center rounded-full'>
                            <Check className='text-primary size-5 stroke-[3]' />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className='flex flex-col gap-4'>
                <Label className='text-lg font-bold tracking-tight text-foreground'>
                  {t('Choose Payment Method')}
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
                            'h-14 justify-between gap-4 rounded-xl border-muted-foreground/10 px-5 transition-all hover:bg-muted/50',
                            paymentLoading === method.type && 'border-primary ring-1 ring-primary'
                          )}
                        >
                          <div className='flex items-center gap-3'>
                            <div className='flex size-8 items-center justify-center rounded-lg bg-muted/50'>
                              {paymentLoading === method.type ? (
                                <Loader2 className='size-4 animate-spin' />
                              ) : (
                                getPaymentIcon(
                                  method.type,
                                  'size-4 opacity-80',
                                  method.icon,
                                  method.name
                                )
                              )}
                            </div>
                            <span className='font-bold'>{method.name}</span>
                          </div>
                          <ChevronRight className='text-muted-foreground/30 size-4 transition-transform group-hover:translate-x-0.5' />
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
                              'h-14 justify-between gap-4 rounded-xl border-muted-foreground/10 px-5 transition-all hover:bg-muted/50',
                              paymentLoading === loadingKey && 'border-primary ring-1 ring-primary'
                            )}
                          >
                            <div className='flex items-center gap-3'>
                              <div className='flex size-8 items-center justify-center rounded-lg bg-muted/50'>
                                {paymentLoading === loadingKey ? (
                                  <Loader2 className='size-4 animate-spin' />
                                ) : method.icon ? (
                                  <img
                                    src={method.icon}
                                    alt={method.name}
                                    className='size-4 object-contain opacity-80'
                                  />
                                ) : (
                                  getPaymentIcon('waffo', 'size-4 opacity-80')
                                )}
                              </div>
                              <span className='font-bold'>{method.name}</span>
                            </div>
                            <ChevronRight className='text-muted-foreground/30 size-4 transition-transform group-hover:translate-x-0.5' />
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
                  <Alert className='rounded-2xl border-muted-foreground/10'>
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
        <Alert className='rounded-2xl border-muted-foreground/10'>
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
            <Label className='text-muted-foreground ml-1 text-[11px] font-bold tracking-widest uppercase'>
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
