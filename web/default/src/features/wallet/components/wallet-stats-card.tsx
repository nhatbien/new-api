import { Activity, BarChart3, WalletCards, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <div className='bg-primary/10 relative overflow-hidden rounded-2xl p-6'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='mt-3 h-10 w-40' />
          <Skeleton className='mt-4 h-9 w-28 rounded-lg' />
        </div>
        <div className='bg-muted/35 rounded-2xl p-6'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='mt-3 h-8 w-32' />
        </div>
        <div className='bg-muted/35 rounded-2xl p-6'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='mt-3 h-8 w-32' />
        </div>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
      {/* Primary Balance Card */}
      <div className='bg-primary relative flex flex-col justify-between overflow-hidden rounded-2xl p-6 text-white'>
        <div className='relative z-10'>
          <div className='flex items-center gap-2 opacity-80'>
            <WalletCards className='size-4' />
            <span className='text-xs font-medium tracking-wider uppercase'>
              {t('Current Balance')}
            </span>
          </div>
          <div className='mt-2 font-mono text-3xl font-bold tracking-tight'>
            {formatQuota(props.user?.quota ?? 0)}
          </div>
        </div>

        <div className='relative z-10 mt-6'>
          <Button
            size='sm'
            variant='secondary'
            className='h-9 w-fit gap-2 rounded-lg font-semibold whitespace-nowrap'
            onClick={props.onAddFunds}
          >
            <Plus className='size-4' />
            {t('Add Funds')}
          </Button>
        </div>

        {/* Decorative elements */}
        <div className='absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl' />
        <div className='absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-black/10 blur-3xl' />
      </div>

      {/* Secondary Stats */}
      <div className='bg-muted/35 flex flex-col justify-center rounded-2xl p-6 transition-colors hover:bg-muted/50'>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <BarChart3 className='size-4' />
          <span className='text-xs font-medium tracking-wider uppercase'>
            {t('Total Usage')}
          </span>
        </div>
        <div className='mt-2 font-mono text-2xl font-bold'>
          {formatQuota(props.user?.used_quota ?? 0)}
        </div>
        <div className='text-muted-foreground/60 mt-1 text-xs'>
          {t('Total consumed quota')}
        </div>
      </div>

      <div className='bg-muted/35 flex flex-col justify-center rounded-2xl p-6 transition-colors hover:bg-muted/50'>
        <div className='flex items-center gap-2 text-muted-foreground'>
          <Activity className='size-4' />
          <span className='text-xs font-medium tracking-wider uppercase'>
            {t('API Requests')}
          </span>
        </div>
        <div className='mt-2 font-mono text-2xl font-bold'>
          {(props.user?.request_count ?? 0).toLocaleString()}
        </div>
        <div className='text-muted-foreground/60 mt-1 text-xs'>
          {t('Total requests made')}
        </div>
      </div>
    </div>
  )
}
