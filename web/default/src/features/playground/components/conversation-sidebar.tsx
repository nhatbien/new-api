import { useMemo } from 'react'
import { SquarePen, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Conversation } from '../types'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  disabled?: boolean
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  disabled,
}: ConversationSidebarProps) {
  const { t } = useTranslation()
  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  )

  return (
    <aside className='flex h-full w-64 shrink-0 flex-col border-r bg-muted/30'>
      <div className='flex items-center justify-between gap-2 border-b px-3 py-2'>
        <span className='text-sm font-medium'>{t('History')}</span>
        <Button
          size='icon-sm'
          variant='ghost'
          onClick={onNew}
          disabled={disabled}
          title={t('New chat')}
          aria-label={t('New chat')}
        >
          <SquarePen className='size-4' />
        </Button>
      </div>
      <div className='flex-1 overflow-y-auto p-2'>
        {sorted.length === 0 ? (
          <div className='px-2 py-4 text-center text-xs text-muted-foreground'>
            {t('No conversations yet')}
          </div>
        ) : (
          <ul className='flex flex-col gap-0.5'>
            {sorted.map((c) => {
              const isActive = c.id === activeId
              return (
                <li key={c.id}>
                  <div
                    className={cn(
                      'group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/60'
                    )}
                    onClick={() => onSelect(c.id)}
                  >
                    <span className='min-w-0 flex-1 truncate'>
                      {c.title || t('New chat')}
                    </span>
                    <button
                      type='button'
                      className='shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100'
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(c.id)
                      }}
                      title={t('Delete')}
                      aria-label={t('Delete')}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </aside>
  )
}
