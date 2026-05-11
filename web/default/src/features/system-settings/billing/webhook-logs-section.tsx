import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'

type WebhookLog = {
  id: number
  provider: string
  method: string
  path: string
  query: string
  client_ip: string
  headers: string
  request_body: string
  response_status: number
  response_body: string
  outcome: string
  error: string
  created_at: number
}

type WebhookLogPage = {
  page: number
  page_size: number
  total: number
  items: WebhookLog[]
}

type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

const PROVIDERS = [
  'all',
  'stripe',
  'creem',
  'waffo',
  'sepay',
  'epay',
  'subscription_epay',
]

const OUTCOMES = ['all', 'success', 'failed']

function formatTime(timestamp: number) {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleString()
}

function prettyText(value: string) {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

export function WebhookLogsSection() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [provider, setProvider] = useState('all')
  const [outcome, setOutcome] = useState('all')
  const [loading, setLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  )

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await api.get<ApiResponse<WebhookLogPage>>(
        '/api/webhook_logs',
        {
          params: {
            p: page,
            page_size: pageSize,
            provider: provider === 'all' ? undefined : provider,
            outcome: outcome === 'all' ? undefined : outcome,
          },
          disableDuplicate: true,
        } as Record<string, unknown>
      )
      setLogs(res.data.data.items || [])
      setTotal(res.data.data.total || 0)
    } catch {
      toast.error(t('Failed to load webhook logs'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, provider, outcome])

  const handleDeleteOldLogs = async () => {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    try {
      const res = await api.delete<ApiResponse<{ deleted: number }>>(
        '/api/webhook_logs',
        {
          params: { target_timestamp: thirtyDaysAgo },
        }
      )
      toast.success(
        t('Deleted {{count}} old webhook logs', {
          count: res.data.data.deleted || 0,
        })
      )
      fetchLogs()
    } catch {
      toast.error(t('Failed to delete webhook logs'))
    }
  }

  return (
    <SettingsSection
      title={t('Webhook Logs')}
      description={t('View raw payment provider webhook requests and results')}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'All payment webhook callbacks are logged here, including disabled, invalid signature, parse failure, ignored and successful events.'
          )}
        </AlertDescription>
      </Alert>

      <div className='flex flex-col gap-3 md:flex-row md:items-end'>
        <div className='grid gap-1.5 md:w-52'>
          <Label>{t('Provider')}</Label>
          <Select
            value={provider}
            onValueChange={(value) => {
              setProvider(value || 'all')
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === 'all' ? t('All providers') : item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-1.5 md:w-44'>
          <Label>{t('Outcome')}</Label>
          <Select
            value={outcome}
            onValueChange={(value) => {
              setOutcome(value || 'all')
              setPage(1)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((item) => (
                <SelectItem key={item} value={item}>
                  {item === 'all' ? t('All outcomes') : t(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type='button'
          variant='outline'
          onClick={fetchLogs}
          disabled={loading}
        >
          <RefreshCw className='mr-2 h-4 w-4' />
          {loading ? t('Loading...') : t('Refresh')}
        </Button>

        <Button type='button' variant='outline' onClick={handleDeleteOldLogs}>
          <Trash2 className='mr-2 h-4 w-4' />
          {t('Delete logs older than 30 days')}
        </Button>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-40'>{t('Time')}</TableHead>
              <TableHead className='w-36'>{t('Provider')}</TableHead>
              <TableHead>{t('Path')}</TableHead>
              <TableHead className='w-28'>{t('Status')}</TableHead>
              <TableHead className='w-28'>{t('Outcome')}</TableHead>
              <TableHead className='w-32 text-right'>{t('Action')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-muted-foreground h-24 text-center'
                >
                  {loading ? t('Loading...') : t('No webhook logs found')}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className='text-xs whitespace-nowrap'>
                    {formatTime(log.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{log.provider}</Badge>
                  </TableCell>
                  <TableCell className='max-w-[360px] truncate font-mono text-xs'>
                    {log.method} {log.path}
                    {log.query ? `?${log.query}` : ''}
                  </TableCell>
                  <TableCell>{log.response_status}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.outcome === 'success' ? 'default' : 'destructive'
                      }
                    >
                      {log.outcome}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => setSelectedLog(log)}
                    >
                      {t('Details')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex items-center justify-between'>
        <div className='text-muted-foreground text-sm'>
          {t('Total')}: {total}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1 || loading}
          >
            {t('Previous')}
          </Button>
          <Input
            className='h-8 w-16 text-center'
            value={page}
            onChange={(event) => {
              const nextPage = Number(event.target.value)
              if (Number.isFinite(nextPage) && nextPage >= 1) {
                setPage(Math.min(totalPages, nextPage))
              }
            }}
          />
          <span className='text-muted-foreground text-sm'>/ {totalPages}</span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page >= totalPages || loading}
          >
            {t('Next')}
          </Button>
        </div>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>{t('Webhook Log Details')}</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className='grid gap-4'>
              <div className='grid gap-3 md:grid-cols-3'>
                <div>
                  <Label>{t('Provider')}</Label>
                  <Input readOnly value={selectedLog.provider} />
                </div>
                <div>
                  <Label>{t('Status')}</Label>
                  <Input readOnly value={selectedLog.response_status} />
                </div>
                <div>
                  <Label>{t('Client IP')}</Label>
                  <Input readOnly value={selectedLog.client_ip} />
                </div>
              </div>

              <div>
                <Label>{t('Headers')}</Label>
                <Textarea
                  readOnly
                  rows={6}
                  className='font-mono text-xs'
                  value={prettyText(selectedLog.headers)}
                />
              </div>
              <div>
                <Label>{t('Request body')}</Label>
                <Textarea
                  readOnly
                  rows={8}
                  className='font-mono text-xs'
                  value={prettyText(selectedLog.request_body)}
                />
              </div>
              <div>
                <Label>{t('Response body')}</Label>
                <Textarea
                  readOnly
                  rows={6}
                  className='font-mono text-xs'
                  value={prettyText(selectedLog.response_body)}
                />
              </div>
              {selectedLog.error && (
                <div>
                  <Label>{t('Error')}</Label>
                  <Textarea
                    readOnly
                    rows={4}
                    className='font-mono text-xs'
                    value={selectedLog.error}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SettingsSection>
  )
}
