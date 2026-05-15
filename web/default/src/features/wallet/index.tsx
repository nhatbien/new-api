import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { WalletCards, Crown, Share2, Receipt, Gift, Loader2 } from 'lucide-react'
import { getSelf } from '@/lib/api'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { SectionPageLayout } from '@/components/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AffiliateRewardsCard } from './components/affiliate-rewards-card'
import { BillingHistoryDialog } from './components/dialogs/billing-history-dialog'
import { CreemConfirmDialog } from './components/dialogs/creem-confirm-dialog'
import { PaymentConfirmDialog } from './components/dialogs/payment-confirm-dialog'
import { PaymentSuccessDialog } from './components/dialogs/payment-success-dialog'
import { TransferDialog } from './components/dialogs/transfer-dialog'
import { RechargeFormCard } from './components/recharge-form-card'
import { getUserBillingHistory } from './api'
import { QR_PAYMENT_TIMEOUT_MS, QR_PAYMENT_POLL_INTERVAL_MS } from './constants'
import type { TopupRecord } from './types'
import { SubscriptionPlansCard } from './components/subscription-plans-card'
import { WalletStatsCard } from './components/wallet-stats-card'
import {
  useTopupInfo,
  usePayment,
  useAffiliate,
  useRedemption,
  useCreemPayment,
  useWaffoPayment,
  useWaffoPancakePayment,
} from './hooks'
import type { PaymentResult } from './hooks/use-payment'
import {
  getDefaultPaymentType,
  getMinTopupAmount,
  isWaffoPancakePayment,
  getAmountDiscount,
} from './lib'
import type {
  UserWalletData,
  PaymentMethod,
  PresetAmount,
  CreemProduct,
} from './types'

interface WalletProps {
  initialShowHistory?: boolean
}

export function Wallet(props: WalletProps) {
  const { t } = useTranslation()
  const [user, setUser] = useState<UserWalletData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [topupAmount, setTopupAmount] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [customAmountMode, setCustomAmountMode] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>()
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [billingDialogOpen, setBillingDialogOpen] = useState(false)
  const [redemptionCode, setRedemptionCode] = useState('')
  const [creemDialogOpen, setCreemDialogOpen] = useState(false)
  const [selectedCreemProduct, setSelectedCreemProduct] =
    useState<CreemProduct | null>(null)
  const [showSubscriptionPanel, setShowSubscriptionPanel] = useState(true)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('topup')
  const [successOpen, setSuccessOpen] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{
    topupAmount: number
    paidAmount?: number
    tradeNo?: string
  } | null>(null)

  const { status } = useStatus()
  const { currency } = useSystemConfig()
  const { topupInfo, presetAmounts, loading: topupLoading } = useTopupInfo()

  // Calculate effective exchange rate - when display type is USD, use rate of 1
  const effectiveUsdExchangeRate = useMemo(() => {
    return currency?.quotaDisplayType === 'USD'
      ? 1
      : currency?.usdExchangeRate || 1
  }, [currency?.quotaDisplayType, currency?.usdExchangeRate])
  const {
    amount: paymentAmount,
    calculating,
    processing,
    calculatePaymentAmount,
    processPayment,
  } = usePayment()
  const {
    affiliateLink,
    loading: affiliateLoading,
    transferQuota,
    transferring,
  } = useAffiliate()
  const { redeeming, redeemCode } = useRedemption()
  const { processing: creemProcessing, processCreemPayment } = useCreemPayment()
  const { processWaffoPayment } = useWaffoPayment()
  const { processing: pancakeProcessing, processWaffoPancakePayment } =
    useWaffoPancakePayment()

  // Fetch and refresh user data
  const fetchUser = useCallback(async () => {
    try {
      setUserLoading(true)
      const response = await getSelf()
      if (response.success && response.data) {
        setUser(response.data as UserWalletData)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch user data:', error)
    } finally {
      setUserLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (props.initialShowHistory) {
      setBillingDialogOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [props.initialShowHistory])

  // Initialize topup amount when topup info is loaded
  useEffect(() => {
    if (topupInfo && topupAmount === 0) {
      const minTopup = getMinTopupAmount(topupInfo)
      setTopupAmount(minTopup)

      // Calculate initial payment amount with default payment type
      const defaultPaymentType = getDefaultPaymentType(topupInfo)
      calculatePaymentAmount(minTopup, defaultPaymentType)
    }
  }, [topupInfo, topupAmount, calculatePaymentAmount])

  // Get current payment type (selected or default)
  const getCurrentPaymentType = useCallback(() => {
    return selectedPaymentMethod?.type || getDefaultPaymentType(topupInfo)
  }, [selectedPaymentMethod, topupInfo])

  // Handle preset selection
  const handleSelectPreset = (preset: PresetAmount) => {
    if (preset.value === -1) {
      setCustomAmountMode(true)
      setSelectedPreset(-1)
      return
    }

    setCustomAmountMode(false)
    setTopupAmount(preset.value)
    setSelectedPreset(preset.value)
    calculatePaymentAmount(preset.value, getCurrentPaymentType())
  }

  // Handle topup amount change
  const handleTopupAmountChange = (amount: number) => {
    setTopupAmount(amount)
    setSelectedPreset(null)
    setCustomAmountMode(true)
    calculatePaymentAmount(amount, getCurrentPaymentType())
  }

  // Handle payment method selection
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    setPaymentResult(null)
    setPaymentLoading(method.type)

    try {
      // Validate minimum topup
      const minTopup = getMinTopupAmount(topupInfo)
      if (topupAmount < minTopup) {
        return
      }

      // Calculate payment amount and show confirmation dialog
      await calculatePaymentAmount(topupAmount, method.type)
      setConfirmDialogOpen(true)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Handle payment confirmation
  const handlePaymentConfirm = async () => {
    if (!selectedPaymentMethod) return

    const isPancake = isWaffoPancakePayment(selectedPaymentMethod.type)
    const result = isPancake
      ? await processWaffoPancakePayment(topupAmount)
      : await processPayment(topupAmount, selectedPaymentMethod.type)

    if (!result) return

    if (typeof result === 'object') {
      if (result.type === 'external') {
        window.open(result.url, '_blank')
        setConfirmDialogOpen(false)
        await fetchUser()
        return
      }
      setPaymentResult(result)
      if (result.type === 'qr') {
        setQrExpiresAt(Date.now() + QR_PAYMENT_TIMEOUT_MS)
      }
      return
    }

    if (result) {
      setConfirmDialogOpen(false)
      await fetchUser()
    }
  }

  // Poll for QR (bank transfer) payment completion
  useEffect(() => {
    if (
      !confirmDialogOpen ||
      !paymentResult ||
      paymentResult.type !== 'qr' ||
      !paymentResult.tradeNo
    ) {
      return
    }
    const tradeNo = paymentResult.tradeNo
    let cancelled = false

    const poll = async () => {
      try {
        const res = await getUserBillingHistory(1, 10, tradeNo)
        if (cancelled) return
        const data = (res as { data?: { items?: TopupRecord[] } }).data
        const record = data?.items?.find((it) => it.trade_no === tradeNo)
        if (record && record.status === 'success') {
          setSuccessInfo({
            topupAmount,
            paidAmount: record.money,
            tradeNo: record.trade_no,
          })
          setSuccessOpen(true)
          setConfirmDialogOpen(false)
          setPaymentResult(null)
          setQrExpiresAt(null)
          await fetchUser()
        }
      } catch (_e) {
        // ignore transient errors
      }
    }

    const id = window.setInterval(poll, QR_PAYMENT_POLL_INTERVAL_MS)
    poll()
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [confirmDialogOpen, paymentResult, topupAmount, fetchUser])

  // Handle redemption
  const handleRedeem = async () => {
    if (!redemptionCode) return

    const success = await redeemCode(redemptionCode)
    if (success) {
      setRedemptionCode('')
      await fetchUser()
    }
  }

  // Handle transfer
  const handleTransfer = async (amount: number) => {
    const success = await transferQuota(amount)
    if (success) {
      await fetchUser()
    }
    return success
  }

  // Handle Creem product selection
  const handleCreemProductSelect = (product: CreemProduct) => {
    setSelectedCreemProduct(product)
    setCreemDialogOpen(true)
  }

  // Handle Creem payment confirmation
  const handleCreemConfirm = async () => {
    if (!selectedCreemProduct) return

    const success = await processCreemPayment(selectedCreemProduct.productId)
    if (success) {
      setCreemDialogOpen(false)
      setSelectedCreemProduct(null)
      await fetchUser()
    }
  }

  const handleWaffoMethodSelect = async (_method: unknown, index: number) => {
    const loadingKey = `waffo-${index}`
    setPaymentLoading(loadingKey)

    try {
      await processWaffoPayment(topupAmount, index)
    } finally {
      setPaymentLoading(null)
    }
  }

  // Get discount rate for current topup amount
  const getDiscountRate = useCallback(() => {
    return getAmountDiscount(topupAmount, topupInfo?.discount)
  }, [topupInfo, topupAmount])

  const handleSubscriptionAvailabilityChange = useCallback(
    (available: boolean) => {
      setShowSubscriptionPanel(available)
    },
    []
  )

  const handleAddFundsClick = () => {
    setActiveTab('topup')
    const element = document.getElementById('wallet-tabs-container')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Content>
          <div className='mx-auto flex w-full max-w-[1120px] flex-col gap-7 py-6 sm:gap-9 lg:py-8'>
            <WalletStatsCard
              user={user}
              loading={userLoading}
              onAddFunds={handleAddFundsClick}
            />

            {/* Simplified Redemption Code Section */}
            <div className='flex flex-col items-center justify-between gap-4 rounded-[20px] border bg-background p-5 shadow-sm sm:flex-row sm:px-6'>
              <div className='flex items-center gap-5'>
                <Gift className='size-6 text-primary' />
                <span className='text-base font-semibold'>
                  {t('Redemption Code')}
                </span>
              </div>
              <div className='flex w-full items-center gap-3 sm:w-auto'>
                <Input
                  value={redemptionCode}
                  onChange={(e) => setRedemptionCode(e.target.value)}
                  placeholder={t('Enter code...')}
                  className='h-12 w-full rounded-xl border bg-background px-5 text-sm focus-visible:border-primary focus-visible:ring-0 sm:w-64'
                />
                <Button
                  onClick={handleRedeem}
                  disabled={redeeming || !redemptionCode}
                  className='h-12 rounded-xl px-6 font-semibold'
                >
                  {redeeming ? (
                    <Loader2 className='size-3 animate-spin' />
                  ) : (
                    t('Redeem')
                  )}
                </Button>
              </div>
            </div>

            <div id='wallet-tabs-container' className='scroll-mt-6'>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className='w-full'
              >
                <div className='flex flex-wrap items-center justify-between gap-4 border-b'>
                  <TabsList className='h-14 w-fit gap-6 rounded-none bg-transparent p-0'>
                    <TabsTrigger
                      value='topup'
                      className='data-active:border-primary data-active:text-foreground h-14 gap-3 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-base font-medium text-muted-foreground shadow-none transition-all data-active:bg-transparent data-active:shadow-none'
                    >
                      <WalletCards className='size-4' />
                      {t('Add Funds')}
                    </TabsTrigger>
                    {showSubscriptionPanel && (
                      <TabsTrigger
                        value='subscriptions'
                        className='data-active:border-primary data-active:text-foreground h-14 gap-3 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-base font-medium text-muted-foreground shadow-none transition-all data-active:bg-transparent data-active:shadow-none'
                      >
                        <Crown className='size-4' />
                        {t('Subscriptions')}
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value='affiliate'
                      className='data-active:border-primary data-active:text-foreground h-14 gap-3 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-base font-medium text-muted-foreground shadow-none transition-all data-active:bg-transparent data-active:shadow-none'
                    >
                      <Share2 className='size-4' />
                      {t('Affiliate')}
                    </TabsTrigger>
                  </TabsList>

                  <Button
                    variant='ghost'
                    onClick={() => setBillingDialogOpen(true)}
                    className='h-12 gap-2 rounded-xl px-4 text-base font-medium text-foreground'
                  >
                    <Receipt className='size-4' />
                    {t('Transaction History')}
                  </Button>
                </div>

                <div className='mt-9'>
                  <TabsContent value='topup' className='focus-visible:ring-0'>
                    <div id='wallet-add-funds' className='scroll-mt-4'>
                      <RechargeFormCard
                        topupInfo={topupInfo}
                        presetAmounts={presetAmounts}
                        selectedPreset={selectedPreset}
                        onSelectPreset={handleSelectPreset}
                        topupAmount={topupAmount}
                        customAmountMode={customAmountMode}
                        onTopupAmountChange={handleTopupAmountChange}
                        paymentAmount={paymentAmount}
                        calculating={calculating}
                        onPaymentMethodSelect={handlePaymentMethodSelect}
                        paymentLoading={paymentLoading}
                        loading={topupLoading}
                        priceRatio={(status?.price as number) || 1}
                        usdExchangeRate={effectiveUsdExchangeRate}
                        creemProducts={topupInfo?.creem_products}
                        enableCreemTopup={topupInfo?.enable_creem_topup}
                        onCreemProductSelect={handleCreemProductSelect}
                        enableWaffoTopup={topupInfo?.enable_waffo_topup}
                        waffoPayMethods={topupInfo?.waffo_pay_methods}
                        waffoMinTopup={topupInfo?.waffo_min_topup}
                        onWaffoMethodSelect={handleWaffoMethodSelect}
                        enableWaffoPancakeTopup={
                          topupInfo?.enable_waffo_pancake_topup
                        }
                      />
                    </div>
                  </TabsContent>

                  {showSubscriptionPanel && (
                    <TabsContent
                      value='subscriptions'
                      className='focus-visible:ring-0'
                    >
                      <SubscriptionPlansCard
                        topupInfo={topupInfo}
                        onAvailabilityChange={
                          handleSubscriptionAvailabilityChange
                        }
                      />
                    </TabsContent>
                  )}

                  <TabsContent
                    value='affiliate'
                    className='focus-visible:ring-0'
                  >
                    <AffiliateRewardsCard
                      user={user}
                      affiliateLink={affiliateLink}
                      onTransfer={() => setTransferDialogOpen(true)}
                      loading={affiliateLoading}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <PaymentConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open)
          if (!open) {
            setPaymentResult(null)
            setQrExpiresAt(null)
          }
        }}
        onConfirm={handlePaymentConfirm}
        topupAmount={topupAmount}
        paymentAmount={paymentAmount}
        paymentMethod={selectedPaymentMethod}
        calculating={calculating}
        processing={processing || pancakeProcessing}
        discountRate={getDiscountRate()}
        paymentResult={paymentResult}
        qrExpiresAt={qrExpiresAt}
      />

      <PaymentSuccessDialog
        open={successOpen}
        onOpenChange={(open) => {
          setSuccessOpen(open)
          if (!open) setSuccessInfo(null)
        }}
        topupAmount={successInfo?.topupAmount ?? 0}
        paidAmount={successInfo?.paidAmount}
        tradeNo={successInfo?.tradeNo}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onConfirm={handleTransfer}
        availableQuota={user?.aff_quota ?? 0}
        transferring={transferring}
      />

      <BillingHistoryDialog
        open={billingDialogOpen}
        onOpenChange={setBillingDialogOpen}
      />

      <CreemConfirmDialog
        open={creemDialogOpen}
        onOpenChange={setCreemDialogOpen}
        onConfirm={handleCreemConfirm}
        product={selectedCreemProduct}
        processing={creemProcessing}
      />
    </>
  )
}
