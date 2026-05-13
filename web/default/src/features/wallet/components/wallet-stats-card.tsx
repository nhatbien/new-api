import { motion } from 'motion/react'
import { BriefcaseBusiness, TrendingUp, Zap, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Button } from '@/components/ui/button'
import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  onAddFunds?: () => void
}

export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()

  if (props.loading) {
    return (
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
        <div className='h-56 rounded-[22px] bg-primary/10' />
        <div className='h-56 rounded-[22px] border bg-background' />
        <div className='h-56 rounded-[22px] border bg-background' />
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex min-h-56 flex-col justify-between overflow-hidden rounded-[22px] bg-primary p-8 text-white shadow-sm'
      >
        <div>
          <div className='flex size-14 items-center justify-center rounded-xl bg-white/18'>
            <BriefcaseBusiness className='size-7' />
          </div>
          <div className='mt-6 text-base font-semibold text-white/85'>
            {t('Current Balance')}
          </div>
          <div className='mt-4 text-5xl font-bold tracking-tight'>
            {formatQuota(props.user?.quota ?? 0)}
          </div>
        </div>

        <div className='mt-6'>
          <Button
            variant='secondary'
            className='h-14 rounded-xl border-none bg-white px-7 text-base font-semibold text-black shadow-sm transition-all hover:bg-white/95 hover:text-black active:scale-95'
            onClick={props.onAddFunds}
          >
            <Plus className='mr-2 size-5 stroke-[2.8] text-black' />
            {t('Add Funds')}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className='flex min-h-56 flex-col justify-between rounded-[22px] border bg-background p-8 shadow-sm'
      >
        <div className='flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <TrendingUp className='size-7' />
        </div>
        <div>
          <div className='text-base font-semibold text-foreground/80'>
            {t('Total Usage')}
          </div>
          <div className='mt-4 text-5xl font-bold tracking-tight text-foreground'>
            {formatQuota(props.user?.used_quota ?? 0)}
          </div>
          <div className='mt-5 text-base text-muted-foreground'>
            {t('Total quota consumed')}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className='flex min-h-56 flex-col justify-between rounded-[22px] border bg-background p-8 shadow-sm'
      >
        <div className='flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <Zap className='size-7' />
        </div>
        <div>
          <div className='text-base font-semibold text-foreground/80'>
            {t('API Requests')}
          </div>
          <div className='mt-4 text-5xl font-bold tracking-tight text-foreground'>
            {(props.user?.request_count ?? 0).toLocaleString()}
          </div>
          <div className='mt-5 text-base text-muted-foreground'>
            {t('Total requests')}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
