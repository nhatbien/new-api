import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatPaymentLocalCurrencyAmount } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '../../lib'

interface PaymentSuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topupAmount: number
  paidAmount?: number
  tradeNo?: string
}

export function PaymentSuccessDialog({
  open,
  onOpenChange,
  topupAmount,
  paidAmount,
  tradeNo,
}: PaymentSuccessDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'>
        <DialogHeader>
          <div className='mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-green-500/15'>
            <CheckCircle2 className='size-8 text-green-600' />
          </div>
          <DialogTitle className='text-center text-xl font-semibold'>
            {t('Topup Successful')}
          </DialogTitle>
          <DialogDescription className='text-center'>
            {t('Your balance has been updated.')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 rounded-lg border bg-muted/30 p-4 text-sm'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground'>{t('Topup Amount')}</span>
            <span className='font-semibold'>{formatCurrency(topupAmount, '$')}</span>
          </div>
          {typeof paidAmount === 'number' && paidAmount > 0 && (
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground'>{t('You Paid')}</span>
              <span className='font-semibold'>
                {formatPaymentLocalCurrencyAmount(paidAmount, {
                  digitsLarge: 2,
                  digitsSmall: 2,
                  abbreviate: false,
                })}
              </span>
            </div>
          )}
          {tradeNo && (
            <div className='flex items-center justify-between gap-3'>
              <span className='text-muted-foreground'>{t('Order ID')}</span>
              <span className='truncate font-mono text-xs'>{tradeNo}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className='w-full'>
            {t('Done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
