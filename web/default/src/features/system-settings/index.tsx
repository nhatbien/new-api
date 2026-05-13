import { Main } from '@/components/layout'

export function SystemSettings({ children }: { children?: React.ReactNode }) {
  return (
    <Main>
      <div className='min-h-0 flex-1 px-4 pt-6 pb-4'>{children}</div>
    </Main>
  )
}
