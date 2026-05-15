import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  formatPaymentLocalCurrencyAmount,
} from '@/lib/currency'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { DEFAULT_DISCOUNT_RATE } from '../../constants'
import { formatCurrency, getPaymentIcon } from '../../lib'
import type { PaymentMethod } from '../../types'
import type { PaymentResult } from '../../hooks/use-payment'

interface PaymentConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  topupAmount: number
  paymentAmount: number
  paymentMethod: PaymentMethod | undefined
  calculating: boolean
  processing: boolean
  discountRate?: number
  paymentResult?: PaymentResult | null
  qrExpiresAt?: number | null
  onQrExpired?: () => void
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPaymentFormSrcDoc(
  url: string,
  params: Record<string, unknown>
): string {
  const inputs = Object.entries(params)
    .map(([key, value]) => {
      return `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(String(value ?? ''))}" />`
    })
    .join('')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { height: 100%; margin: 0; font-family: sans-serif; }
      body { display: grid; place-items: center; color: #666; }
    </style>
  </head>
  <body>
    <form id="payment-form" method="POST" action="${escapeHtml(url)}">
      ${inputs}
      <noscript><button type="submit">Continue</button></noscript>
    </form>
    <script>document.getElementById('payment-form').submit();</script>
  </body>
</html>`
}

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  topupAmount,
  paymentAmount,
  paymentMethod,
  calculating,
  processing,
  discountRate = DEFAULT_DISCOUNT_RATE,
  paymentResult,
  qrExpiresAt,
  onQrExpired,
}: PaymentConfirmDialogProps) {
  const { t } = useTranslation()
  const hasDiscount = discountRate > 0 && discountRate < 1 && paymentAmount > 0
  const originalAmount = paymentAmount
  const finalAmount = hasDiscount ? originalAmount * discountRate : originalAmount
  const discountAmount = hasDiscount ? originalAmount - finalAmount : 0
  const discountPercent = hasDiscount ? Math.round((1 - discountRate) * 100) : 0
  const isAwaitingPayment = !!paymentResult
  const isQrPayment = paymentResult?.type === 'qr'

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!isQrPayment || !qrExpiresAt) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [isQrPayment, qrExpiresAt])

  const remainingMs = qrExpiresAt ? Math.max(0, qrExpiresAt - now) : 0
  const remainingSec = Math.floor(remainingMs / 1000)
  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0')
  const ss = String(remainingSec % 60).padStart(2, '0')
  const isExpired = isQrPayment && !!qrExpiresAt && remainingMs <= 0

  useEffect(() => {
    if (isExpired && onQrExpired) onQrExpired()
  }, [isExpired, onQrExpired])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-lg'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-xl font-semibold'>
            {t('Confirm Payment')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('Review your payment details')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-3 py-3 sm:space-y-4 sm:py-4'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>
              {t('Topup Amount')}
            </span>
            <span className='text-lg font-semibold'>
              {formatCurrency(topupAmount, '$')}
            </span>
          </div>

          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>
              {t('You Pay')}
            </span>
            {calculating ? (
              <Skeleton className='h-6 w-24' />
            ) : (
              <div className='flex items-baseline gap-2'>
                <span className='text-2xl font-semibold'>
                  {formatPaymentLocalCurrencyAmount(finalAmount, {
                    digitsLarge: 2,
                    digitsSmall: 2,
                    abbreviate: false,
                  })}
                </span>
                {hasDiscount && (
                  <span className='text-muted-foreground text-sm line-through'>
                    {formatPaymentLocalCurrencyAmount(originalAmount, {
                      digitsLarge: 2,
                      digitsSmall: 2,
                      abbreviate: false,
                    })}
                  </span>
                )}
              </div>
            )}
          </div>

          {hasDiscount && !calculating && (
            <div className='bg-muted/50 rounded-lg p-3'>
              <div className='flex items-center justify-between gap-3 text-sm'>
                <span className='text-muted-foreground'>
                  {t('Discount')} {discountPercent}% • {t('You save')}
                </span>
                <span className='font-semibold text-green-600'>
                  {formatPaymentLocalCurrencyAmount(discountAmount, {
                    digitsLarge: 2,
                    digitsSmall: 2,
                    abbreviate: false,
                  })}
                </span>
              </div>
            </div>
          )}

          <div className='border-t pt-4'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                {t('Payment Method')}
              </span>
              <div className='flex items-center gap-2'>
                {getPaymentIcon(
                  paymentMethod?.type,
                  'h-4 w-4',
                  paymentMethod?.icon,
                  paymentMethod?.name
                )}
                <span className='font-medium'>{paymentMethod?.name}</span>
              </div>
            </div>
          </div>

          {paymentResult?.type === 'qr' && (
            <div className='border-t pt-4'>
              <div className='flex flex-col items-center gap-3 text-center'>
                <img
                  src={paymentResult.qrUrl}
                  alt={t('Payment QR code')}
                  className='h-64 w-64 rounded-md border bg-white object-contain p-2'
                />
                {paymentResult.transferContent && (
                  <div className='text-muted-foreground text-sm'>
                    {t('Transfer content')}: {' '}
                    <span className='font-medium text-foreground'>
                      {paymentResult.transferContent}
                    </span>
                  </div>
                )}
                {qrExpiresAt && (
                  <div
                    className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${
                      isExpired
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    <Clock className='h-4 w-4' />
                    {isExpired
                      ? t('QR code expired')
                      : t('Expires in {{time}}', { time: `${mm}:${ss}` })}
                  </div>
                )}
                <div className='text-muted-foreground text-xs'>
                  {t('Waiting for bank transfer. Balance will be updated automatically.')}
                </div>
              </div>
            </div>
          )}

          {paymentResult?.type === 'embedded-form' && (
            <div className='border-t pt-4'>
              <iframe
                title={t('Payment checkout')}
                srcDoc={buildPaymentFormSrcDoc(
                  paymentResult.url,
                  paymentResult.params
                )}
                className='h-[420px] w-full rounded-md border bg-white'
                sandbox='allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation'
              />
              <div className='mt-3 flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => window.open(paymentResult.url, '_blank')}
                  className='gap-2'
                >
                  <ExternalLink className='h-4 w-4' />
                  {t('Open in new tab')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter
          className={
            isQrPayment ? 'flex justify-end' : 'grid grid-cols-2 gap-2 sm:flex'
          }
        >
          <AlertDialogCancel disabled={processing}>
            {isAwaitingPayment ? t('Close') : t('Cancel')}
          </AlertDialogCancel>
          {!isQrPayment && (
            <AlertDialogAction
              onClick={onConfirm}
              disabled={processing || isAwaitingPayment}
            >
              {processing && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {t('Confirm Payment')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
