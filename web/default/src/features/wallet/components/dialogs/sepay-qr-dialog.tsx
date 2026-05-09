import { Copy, Landmark } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SepayPaymentData } from '../../types'

interface SepayQrDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: SepayPaymentData | null
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-md border px-3 py-2'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      <span className='truncate text-sm font-medium'>{value}</span>
    </div>
  )
}

export function SepayQrDialog({
  open,
  onOpenChange,
  payment,
}: SepayQrDialogProps) {
  const { t } = useTranslation()

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success(t('Copied'))
  }

  if (!payment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Landmark className='h-5 w-5 text-green-600' />
            {t('SEPAY VietQR Payment')}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='bg-muted/30 flex justify-center rounded-lg border p-4'>
            <img
              src={payment.qr_url}
              alt={t('SEPAY VietQR Payment')}
              className='h-64 w-64 rounded-md object-contain'
            />
          </div>

          <div className='space-y-2'>
            <DetailRow
              label={t('Amount')}
              value={`${payment.amount.toLocaleString('vi-VN')} VND`}
            />
            <DetailRow label={t('Bank')} value={payment.bank_code} />
            <DetailRow
              label={t('Account')}
              value={payment.account_number}
            />
            {payment.account_name && (
              <DetailRow
                label={t('Account Name')}
                value={payment.account_name}
              />
            )}
            <DetailRow label={t('Content')} value={payment.description} />
          </div>

          <div className='grid grid-cols-2 gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => copy(payment.account_number)}
              className='gap-2'
            >
              <Copy className='h-4 w-4' />
              {t('Copy Account')}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => copy(payment.description)}
              className='gap-2'
            >
              <Copy className='h-4 w-4' />
              {t('Copy Content')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
