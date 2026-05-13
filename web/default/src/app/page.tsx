import { AppProviders } from '@/components/app-providers'
import { NextAppShell } from '@/components/next-app-shell'
import { getServerHomePageContent } from '@/features/home/server'

export default async function Page() {
  const initialHomePageContent = await getServerHomePageContent()

  return (
    <AppProviders>
      <NextAppShell
        initialHomePageContent={initialHomePageContent}
        initialHomePageContentLoaded
      />
    </AppProviders>
  )
}
