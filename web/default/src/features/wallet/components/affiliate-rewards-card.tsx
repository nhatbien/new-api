import { Share2, Users, TrendingUp, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatQuota } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyButton } from '@/components/copy-button'
import type { UserWalletData } from '../types'

interface AffiliateRewardsCardProps {
  user: UserWalletData | null
  affiliateLink: string
  onTransfer: () => void
  loading?: boolean
}

export function AffiliateRewardsCard({
  user,
  affiliateLink,
  onTransfer,
  loading,
}: AffiliateRewardsCardProps) {
  const { t } = useTranslation()
  if (loading) {
    return <Skeleton className='h-40 w-full rounded-3xl' />
  }

  const hasRewards = (user?.aff_quota ?? 0) > 0

  return (
    <div className='flex flex-col gap-6'>
      <Card className='bg-primary/5 border-none shadow-none ring-0'>
        <CardContent className='flex flex-col gap-6 p-6 sm:p-8'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <div className='bg-primary/10 flex size-12 items-center justify-center rounded-2xl'>
                <Share2 className='text-primary size-6' />
              </div>
              <div>
                <h3 className='text-lg font-bold'>{t('Referral Program')}</h3>
                <p className='text-muted-foreground text-sm'>
                  {t('Invite friends and earn rewards on every top-up they make.')}
                </p>
              </div>
            </div>
            
            <div className='flex w-full items-center gap-2 sm:w-auto'>
              <Input
                value={affiliateLink}
                readOnly
                className='border-muted bg-background h-11 min-w-0 flex-1 rounded-xl font-mono text-xs'
              />
              <CopyButton
                value={affiliateLink}
                variant='default'
                className='h-11 rounded-xl px-4'
                tooltip={t('Copy referral link')}
              />
            </div>
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            <div className='bg-background flex flex-col gap-1 rounded-2xl p-4'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Wallet className='size-3.5' />
                <span className='text-[10px] font-bold uppercase tracking-wider'>{t('Pending Rewards')}</span>
              </div>
              <div className='text-xl font-black tabular-nums'>{formatQuota(user?.aff_quota ?? 0)}</div>
              {hasRewards && (
                <Button 
                  onClick={onTransfer} 
                  size='sm' 
                  className='mt-2 h-8 w-full rounded-lg text-xs font-bold'
                >
                  {t('Transfer to Balance')}
                </Button>
              )}
            </div>

            <div className='bg-background flex flex-col gap-1 rounded-2xl p-4'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <TrendingUp className='size-3.5' />
                <span className='text-[10px] font-bold uppercase tracking-wider'>{t('Total Earned')}</span>
              </div>
              <div className='text-xl font-black tabular-nums'>{formatQuota(user?.aff_history_quota ?? 0)}</div>
              <p className='text-muted-foreground text-[10px]'>{t('Lifetime referral earnings')}</p>
            </div>

            <div className='bg-background flex flex-col gap-1 rounded-2xl p-4'>
              <div className='flex items-center gap-2 text-muted-foreground'>
                <Users className='size-3.5' />
                <span className='text-[10px] font-bold uppercase tracking-wider'>{t('Total Referrals')}</span>
              </div>
              <div className='text-xl font-black tabular-nums'>{user?.aff_count ?? 0}</div>
              <p className='text-muted-foreground text-[10px]'>{t('Friends who joined via your link')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className='bg-muted/35 rounded-2xl p-6'>
        <h4 className='mb-2 text-sm font-bold'>{t('How it works?')}</h4>
        <ul className='text-muted-foreground space-y-2 text-xs'>
          <li className='flex items-start gap-2'>
            <div className='bg-primary mt-0.5 size-1.5 shrink-0 rounded-full' />
            {t('Share your unique referral link with your friends or on social media.')}
          </li>
          <li className='flex items-start gap-2'>
            <div className='bg-primary mt-0.5 size-1.5 shrink-0 rounded-full' />
            {t('When they register and add funds, you receive a percentage of their top-up amount.')}
          </li>
          <li className='flex items-start gap-2'>
            <div className='bg-primary mt-0.5 size-1.5 shrink-0 rounded-full' />
            {t('Transfer your rewards to your main balance anytime to use for API requests.')}
          </li>
        </ul>
      </div>
    </div>
  )
}
