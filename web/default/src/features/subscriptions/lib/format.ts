import type { TFunction } from 'i18next'
import dayjs from '@/lib/dayjs'
import type { SubscriptionPlan } from '../types'

export function formatDuration(
  plan: Partial<SubscriptionPlan>,
  t: TFunction
): string {
  const unit = plan?.duration_unit || 'month'
  const value = plan?.duration_value || 1
  const unitLabels: Record<string, string> = {
    year: t('years'),
    month: t('months'),
    day: t('days'),
    hour: t('hours'),
    custom: t('Custom (seconds)'),
  }
  if (unit === 'custom') {
    const seconds = plan?.custom_seconds || 0
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)} ${t('days')}`
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)} ${t('hours')}`
    return `${seconds} ${t('seconds')}`
  }
  return `${value} ${unitLabels[unit] || unit}`
}

export function formatResetPeriod(
  plan: Partial<SubscriptionPlan>,
  t: TFunction
): string {
  const period = plan?.quota_reset_period || 'never'
  if (period === 'daily') return t('Daily')
  if (period === 'weekly') return t('Weekly')
  if (period === 'monthly') return t('Monthly')
  if (period === 'custom') {
    const seconds = Number(plan?.quota_reset_custom_seconds || 0)
    if (seconds >= 86400) return `${Math.floor(seconds / 86400)} ${t('days')}`
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)} ${t('hours')}`
    if (seconds >= 60) return `${Math.floor(seconds / 60)} ${t('minutes')}`
    return `${seconds} ${t('seconds')}`
  }
  return t('No Reset')
}

function estimateDurationSeconds(plan: Partial<SubscriptionPlan>): number {
  const value = Number(plan?.duration_value || 1)
  switch (plan?.duration_unit || 'month') {
    case 'year':
      return value * 365 * 86400
    case 'month':
      return value * 30 * 86400
    case 'day':
      return value * 86400
    case 'hour':
      return value * 3600
    case 'custom':
      return Number(plan?.custom_seconds || 0)
    default:
      return 0
  }
}

export function estimateQuotaCycles(plan: Partial<SubscriptionPlan>): number {
  const period = plan?.quota_reset_period || 'never'
  if (period === 'never') return 1

  const durationSeconds = estimateDurationSeconds(plan)
  if (durationSeconds <= 0) return 1

  if (period === 'daily') return Math.max(1, Math.ceil(durationSeconds / 86400))
  if (period === 'weekly') {
    return Math.max(1, Math.ceil(durationSeconds / (7 * 86400)))
  }
  if (period === 'monthly') {
    if (plan?.duration_unit === 'year') {
      return Math.max(1, Number(plan?.duration_value || 1) * 12)
    }
    if (plan?.duration_unit === 'month') {
      return Math.max(1, Number(plan?.duration_value || 1))
    }
    return Math.max(1, Math.ceil(durationSeconds / (30 * 86400)))
  }
  if (period === 'custom') {
    const customSeconds = Number(plan?.quota_reset_custom_seconds || 0)
    if (customSeconds <= 0) return 1
    return Math.max(1, Math.ceil(durationSeconds / customSeconds))
  }

  return 1
}

export function estimatePlanTotalQuota(
  plan: Partial<SubscriptionPlan>
): number {
  const amount = Number(plan?.total_amount || 0)
  if (amount <= 0) return 0
  return amount * estimateQuotaCycles(plan)
}

export function formatTimestamp(ts: number): string {
  if (!ts) return '-'
  return dayjs(ts * 1000).format('YYYY-MM-DD HH:mm:ss')
}
