import { useState, useEffect, useMemo, useCallback } from 'react'
import { Crown, RefreshCw, Sparkles, Check, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatQuotaUSD } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  StatusBadge,
  dotColorMap,
  textColorMap,
} from '@/components/status-badge'
import {
  getPublicPlans,
  getSelfSubscriptionFull,
  updateBillingPreference,
} from '@/features/subscriptions/api'
import { SubscriptionPurchaseDialog } from '@/features/subscriptions/components/dialogs/subscription-purchase-dialog'
import {
  estimatePlanTotalQuota,
  formatDuration,
  formatResetPeriod,
} from '@/features/subscriptions/lib'
import type {
  PlanRecord,
  UserSubscriptionRecord,
} from '@/features/subscriptions/types'
import type { PaymentMethod, TopupInfo } from '../types'

interface SubscriptionPlansCardProps {
  topupInfo: TopupInfo | null
  onAvailabilityChange?: (available: boolean) => void
}

function getEpayMethods(payMethods: PaymentMethod[] = []): PaymentMethod[] {
  return payMethods.filter(
    (m) =>
      m?.type && m.type !== 'stripe' && m.type !== 'creem' && m.type !== 'sepay'
  )
}

function getBillingPreferenceLabel(
  preference: string,
  t: (key: string) => string
): string {
  switch (preference) {
    case 'subscription_first':
      return t('Subscription First')
    case 'wallet_first':
      return t('Wallet First')
    case 'subscription_only':
      return t('Subscription Only')
    case 'wallet_only':
      return t('Wallet Only')
    default:
      return preference
  }
}

export function SubscriptionPlansCard({
  topupInfo,
  onAvailabilityChange,
}: SubscriptionPlansCardProps) {
  const { t } = useTranslation()

  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [activeSubscriptions, setActiveSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [allSubscriptions, setAllSubscriptions] = useState<
    UserSubscriptionRecord[]
  >([])
  const [billingPreference, setBillingPreference] =
    useState('subscription_first')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null)

  const enableStripe = !!topupInfo?.enable_stripe_topup
  const enableCreem = !!topupInfo?.enable_creem_topup
  const enableSepay = !!topupInfo?.enable_sepay_topup
  const enableOnlineTopUp = !!topupInfo?.enable_online_topup
  const sepayMethod = useMemo(
    () => topupInfo?.pay_methods?.find((m) => m?.type === 'sepay'),
    [topupInfo?.pay_methods]
  )
  const epayMethods = useMemo(
    () => getEpayMethods(topupInfo?.pay_methods),
    [topupInfo?.pay_methods]
  )

  const fetchPlans = useCallback(async () => {
    try {
      const res = await getPublicPlans()
      if (res.success) {
        setPlans(res.data || [])
      }
    } catch {
      setPlans([])
    }
  }, [])

  const fetchSelfSubscription = useCallback(async () => {
    try {
      const res = await getSelfSubscriptionFull()
      if (res.success && res.data) {
        setBillingPreference(
          res.data.billing_preference || 'subscription_first'
        )
        setActiveSubscriptions(res.data.subscriptions || [])
        setAllSubscriptions(res.data.all_subscriptions || [])
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchSelfSubscription()])
      setLoading(false)
    }
    init()
  }, [fetchPlans, fetchSelfSubscription])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchSelfSubscription()
    } finally {
      setRefreshing(false)
    }
  }

  const handlePreferenceChange = async (pref: string) => {
    const previous = billingPreference
    setBillingPreference(pref)
    try {
      const res = await updateBillingPreference(pref)
      if (res.success) {
        toast.success(t('Updated successfully'))
        const normalized = res.data?.billing_preference || pref
        setBillingPreference(normalized)
      } else {
        toast.error(res.message || t('Update failed'))
        setBillingPreference(previous)
      }
    } catch {
      toast.error(t('Request failed'))
      setBillingPreference(previous)
    }
  }

  const hasActive = activeSubscriptions.length > 0
  const hasAny = allSubscriptions.length > 0
  const isAvailable = loading || plans.length > 0 || hasAny
  const disablePref = !hasActive
  const isSubPref =
    billingPreference === 'subscription_first' ||
    billingPreference === 'subscription_only'
  const displayPref =
    disablePref && isSubPref ? 'wallet_first' : billingPreference

  const planPurchaseCountMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const sub of allSubscriptions) {
      const planId = sub?.subscription?.plan_id
      if (!planId) continue
      map.set(planId, (map.get(planId) || 0) + 1)
    }
    return map
  }, [allSubscriptions])

  useEffect(() => {
    onAvailabilityChange?.(isAvailable)
  }, [isAvailable, onAvailabilityChange])

  const planTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const p of plans) {
      if (p?.plan?.id) {
        map.set(p.plan.id, p.plan.title || '')
      }
    }
    return map
  }, [plans])

  const getRemainingDays = (sub: UserSubscriptionRecord) => {
    const endTime = sub?.subscription?.end_time || 0
    if (!endTime) return 0
    const now = Date.now() / 1000
    return Math.max(0, Math.ceil((endTime - now) / 86400))
  }

  const getUsagePercent = (sub: UserSubscriptionRecord) => {
    const total = Number(sub?.subscription?.amount_total || 0)
    const used = Number(sub?.subscription?.amount_used || 0)
    if (total <= 0) return 0
    return Math.round((used / total) * 100)
  }

  if (loading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-32 rounded-2xl' />
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-64 rounded-2xl' />
          ))}
        </div>
      </div>
    )
  }

  if (plans.length === 0 && !hasAny) {
    return null
  }

  return (
    <div className='flex flex-col gap-8 pb-8'>
      {/* My subscriptions & billing preference */}
      <Card className='bg-muted/30 overflow-hidden border-none shadow-none ring-0'>
        <CardContent className='flex flex-col gap-4 p-6 sm:p-8'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='bg-primary/10 flex size-10 items-center justify-center rounded-xl'>
                <Crown className='text-primary size-5' />
              </div>
              <div>
                <h3 className='text-base font-bold'>{t('My Subscriptions')}</h3>
                <div className='flex items-center gap-2'>
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      hasActive ? 'bg-green-500' : 'bg-muted-foreground/30'
                    )}
                  />
                  <span className='text-muted-foreground text-xs font-medium'>
                    {hasActive
                      ? `${activeSubscriptions.length} ${t('Active')}`
                      : t('No Active Subscriptions')}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Select
                items={[
                  {
                    value: 'subscription_first',
                    label: getBillingPreferenceLabel('subscription_first', t),
                  },
                  {
                    value: 'wallet_first',
                    label: getBillingPreferenceLabel('wallet_first', t),
                  },
                  {
                    value: 'subscription_only',
                    label: getBillingPreferenceLabel('subscription_only', t),
                  },
                  {
                    value: 'wallet_only',
                    label: getBillingPreferenceLabel('wallet_only', t),
                  },
                ]}
                value={displayPref}
                onValueChange={(v) => v !== null && handlePreferenceChange(v)}
              >
                <SelectTrigger className='h-9 w-40 rounded-lg border-none bg-background text-xs font-semibold'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      value='subscription_first'
                      disabled={disablePref}
                    >
                      {getBillingPreferenceLabel('subscription_first', t)}
                    </SelectItem>
                    <SelectItem value='wallet_first'>
                      {getBillingPreferenceLabel('wallet_first', t)}
                    </SelectItem>
                    <SelectItem
                      value='subscription_only'
                      disabled={disablePref}
                    >
                      {getBillingPreferenceLabel('subscription_only', t)}
                    </SelectItem>
                    <SelectItem value='wallet_only'>
                      {getBillingPreferenceLabel('wallet_only', t)}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant='outline'
                size='icon'
                className='size-9 rounded-lg border-none bg-background'
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={cn('size-4', refreshing && 'animate-spin')}
                />
              </Button>
            </div>
          </div>

          {disablePref && isSubPref && (
            <p className='text-muted-foreground/80 bg-background/50 rounded-lg px-4 py-2 text-xs'>
              {t(
                'Preference saved as {{pref}}, but no active subscription. Wallet will be used automatically.',
                {
                  pref: getBillingPreferenceLabel(billingPreference, t),
                }
              )}
            </p>
          )}

          {hasAny && (
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {allSubscriptions.map((sub) => {
                const subscription = sub.subscription
                const totalAmount = Number(subscription?.amount_total || 0)
                const usedAmount = Number(subscription?.amount_used || 0)
                const remainAmount =
                  totalAmount > 0 ? Math.max(0, totalAmount - usedAmount) : 0
                const planTitle = planTitleMap.get(subscription?.plan_id) || ''
                const remainDays = getRemainingDays(sub)
                const usagePercent = getUsagePercent(sub)
                const now = Date.now() / 1000
                const isExpired = (subscription?.end_time || 0) < now
                const isCancelled = subscription?.status === 'cancelled'
                const isActive = subscription?.status === 'active' && !isExpired

                return (
                  <div
                    key={subscription?.id}
                    className='group relative flex flex-col gap-3 rounded-2xl bg-background p-4 transition-all hover:ring-2 hover:ring-primary/20'
                  >
                    <div className='flex items-start justify-between'>
                      <div className='min-w-0'>
                        <h4 className='truncate text-sm font-bold'>
                          {planTitle || t('Subscription')}
                        </h4>
                        <p className='text-muted-foreground text-[10px] font-medium'>
                          #{subscription?.id}
                        </p>
                      </div>
                      {isActive ? (
                        <span className='bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase'>
                          {t('Active')}
                        </span>
                      ) : (
                        <span className='bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase'>
                          {isCancelled ? t('Cancelled') : t('Expired')}
                        </span>
                      )}
                    </div>

                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center justify-between text-[10px] font-bold uppercase'>
                        <span className='text-muted-foreground'>
                          {t('Usage')}
                        </span>
                        <span className='text-foreground'>
                          {usagePercent}%
                        </span>
                      </div>
                      <Progress value={usagePercent} className='h-1.5' />
                    </div>

                    <div className='flex flex-col gap-1 text-xs'>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>
                          {t('Remaining')}
                        </span>
                        <span className='font-bold tabular-nums'>
                          {totalAmount > 0
                            ? formatQuotaUSD(remainAmount)
                            : t('Unlimited')}
                        </span>
                      </div>
                      <div className='flex items-center justify-between'>
                        <span className='text-muted-foreground'>
                          {isActive ? t('Expires in') : t('Ended')}
                        </span>
                        <span className='font-bold tabular-nums'>
                          {isActive
                            ? `${remainDays} ${t('days')}`
                            : new Date(
                                (subscription?.end_time || 0) * 1000
                              ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available plans grid */}
      <div className='flex flex-col gap-4'>
        <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
          {t('Subscription Plans')}
        </Label>
        {plans.length > 0 ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {plans.map((p, index) => {
              const plan = p?.plan
              if (!plan) return null
              const totalAmount = Number(plan.total_amount || 0)
              const estimatedTotalQuota = estimatePlanTotalQuota(plan)
              const price = Number(plan.price_amount || 0).toFixed(2)
              const isPopular = index === 1 || plans.length === 1
              const limit = Number(plan.max_purchase_per_user || 0)
              const count = planPurchaseCountMap.get(plan.id) || 0
              const reached = limit > 0 && count >= limit

              const benefits = [
                formatDuration(plan, t),
                estimatedTotalQuota > 0
                  ? formatQuotaUSD(estimatedTotalQuota)
                  : t('Unlimited'),
                formatResetPeriod(plan, t) !== t('No Reset')
                  ? formatResetPeriod(plan, t)
                  : null,
              ].filter(Boolean) as string[]

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'group relative flex flex-col rounded-3xl bg-background p-6 transition-all duration-300 hover:-translate-y-1',
                    isPopular && 'ring-2 ring-primary'
                  )}
                >
                  {isPopular && (
                    <div className='bg-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest'>
                      {t('Recommended')}
                    </div>
                  )}

                  <div className='mb-6'>
                    <h4 className='text-lg font-black tracking-tight'>
                      {plan.title}
                    </h4>
                    <p className='text-muted-foreground line-clamp-1 text-xs font-medium'>
                      {plan.subtitle || t('Premium access')}
                    </p>
                  </div>

                  <div className='mb-6 flex items-baseline gap-1'>
                    <span className='text-3xl font-black'>${price}</span>
                    <span className='text-muted-foreground text-xs font-medium'>
                      /{formatDuration(plan, t)}
                    </span>
                  </div>

                  <div className='mb-8 flex flex-1 flex-col gap-3'>
                    {benefits.map((benefit) => (
                      <div
                        key={benefit}
                        className='flex items-center gap-2 text-xs font-bold'
                      >
                        <div className='bg-primary/10 flex size-5 items-center justify-center rounded-full'>
                          <Check className='text-primary size-3' strokeWidth={3} />
                        </div>
                        {benefit}
                      </div>
                    ))}
                  </div>

                  <Button
                    variant={isPopular ? 'default' : 'outline'}
                    className={cn(
                      'h-11 w-full rounded-xl font-bold transition-all'
                    )}
                    disabled={reached}
                    onClick={() => {
                      setSelectedPlan(p)
                      setPurchaseOpen(true)
                    }}
                  >
                    {reached ? t('Limit Reached') : t('Subscribe Now')}
                  </Button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className='bg-muted/30 flex h-40 items-center justify-center rounded-3xl'>
            <p className='text-muted-foreground text-sm font-medium'>
              {t('No plans available at the moment')}
            </p>
          </div>
        )}
      </div>

      <SubscriptionPurchaseDialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          setPurchaseOpen(open)
          if (!open) {
            fetchSelfSubscription()
          }
        }}
        plan={selectedPlan}
        enableStripe={enableStripe}
        enableCreem={enableCreem}
        enableSepay={enableSepay}
        sepayMethod={sepayMethod}
        enableOnlineTopUp={enableOnlineTopUp}
        epayMethods={epayMethods}
        purchaseLimit={
          selectedPlan?.plan?.max_purchase_per_user
            ? Number(selectedPlan.plan.max_purchase_per_user)
            : undefined
        }
        purchaseCount={
          selectedPlan?.plan?.id
            ? planPurchaseCountMap.get(selectedPlan.plan.id)
            : undefined
        }
      />
    </div>
  )
}
