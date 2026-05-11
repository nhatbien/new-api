import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

export interface SepaySettingsValues {
  SepayEnabled: boolean
  SepayBankCode: string
  SepayAccountNumber: string
  SepayAccountName: string
  SepayQrTemplate: string
  SepayContentPrefix: string
  SepayWebhookSecret: string
  SepayUnitPrice: number
  SepayMinTopUp: number
}

interface Props {
  defaultValues: SepaySettingsValues
}

export function SepaySettingsSection({ defaultValues }: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)
  const form = useForm<SepaySettingsValues>({ defaultValues })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const handleSave = async () => {
    const values = form.getValues()
    const enabled = !!values.SepayEnabled

    if (enabled && !values.SepayBankCode.trim()) {
      toast.error(t('Bank code is required'))
      return
    }

    if (enabled && !values.SepayAccountNumber.trim()) {
      toast.error(t('Account number is required'))
      return
    }

    if (enabled && !values.SepayAccountName.trim()) {
      toast.error(t('Account name is required'))
      return
    }

    if (enabled && !values.SepayWebhookSecret.trim()) {
      toast.error(t('Webhook secret is required'))
      return
    }

    if (enabled && Number(values.SepayUnitPrice) <= 0) {
      toast.error(t('Unit price must be greater than 0'))
      return
    }

    if (enabled && Number(values.SepayMinTopUp) < 1) {
      toast.error(t('Minimum top-up amount must be at least 1'))
      return
    }

    setLoading(true)
    try {
      const options: { key: string; value: string }[] = [
        { key: 'SepayEnabled', value: enabled ? 'true' : 'false' },
        { key: 'SepayBankCode', value: values.SepayBankCode.trim() },
        {
          key: 'SepayAccountNumber',
          value: values.SepayAccountNumber.trim(),
        },
        { key: 'SepayAccountName', value: values.SepayAccountName.trim() },
        {
          key: 'SepayQrTemplate',
          value: values.SepayQrTemplate.trim() || 'compact2',
        },
        {
          key: 'SepayContentPrefix',
          value: values.SepayContentPrefix.trim() || 'NAP',
        },
        { key: 'SepayUnitPrice', value: String(values.SepayUnitPrice ?? 1) },
        { key: 'SepayMinTopUp', value: String(values.SepayMinTopUp ?? 1) },
      ]

      if (values.SepayWebhookSecret.trim()) {
        options.push({
          key: 'SepayWebhookSecret',
          value: values.SepayWebhookSecret.trim(),
        })
      }

      for (const option of options) {
        await updateOption.mutateAsync(option)
      }
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsSection
      title={t('SEPAY QR Payment Gateway')}
      description={t('Configure SEPAY bank transfer payment via VietQR')}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'Use these values to generate VietQR transfer codes and verify SEPAY webhook callbacks. Webhook URL: <ServerAddress>/api/sepay/webhook'
          )}
        </AlertDescription>
      </Alert>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('SepayEnabled')}
            onCheckedChange={(value) => form.setValue('SepayEnabled', value)}
          />
          <Label>{t('Enable SEPAY QR')}</Label>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('QR template')}</Label>
          <Input placeholder='compact2' {...form.register('SepayQrTemplate')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Transfer content prefix')}</Label>
          <Input placeholder='NAP' {...form.register('SepayContentPrefix')} />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-1.5'>
          <Label>{t('Bank code')}</Label>
          <Input
            placeholder='MB, VCB, ACB...'
            {...form.register('SepayBankCode')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Account number')}</Label>
          <Input
            autoComplete='off'
            placeholder='0123456789'
            {...form.register('SepayAccountNumber')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Account name')}</Label>
          <Input
            placeholder='NGUYEN VAN A'
            {...form.register('SepayAccountName')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-1.5 md:col-span-1'>
          <Label>{t('Webhook secret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank to keep the existing secret')}
            {...form.register('SepayWebhookSecret')}
          />
          <p className='text-muted-foreground text-xs'>
            {t('Stored value is not echoed back for security')}
          </p>
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Unit price (local currency / USD)')}</Label>
          <Input
            type='number'
            step={0.01}
            min={0}
            {...form.register('SepayUnitPrice', { valueAsNumber: true })}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up (USD)')}</Label>
          <Input
            type='number'
            min={1}
            {...form.register('SepayMinTopUp', { valueAsNumber: true })}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? t('Saving...') : t('Save SEPAY settings')}
      </Button>
    </SettingsSection>
  )
}
