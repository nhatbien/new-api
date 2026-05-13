import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { Markdown } from '@/components/ui/markdown'
import { PublicLayout } from '@/components/layout'
import { Footer } from '@/components/layout/components/footer'
import { CTA, Features, Hero, HowItWorks, Stats } from './components'
import { useHomePageContent } from './hooks'

interface HomeProps {
  initialContent?: string
  initialContentLoaded?: boolean
}

export function Home(props: HomeProps = {}) {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const hydrated = useHydrated()
  const isAuthenticated = hydrated && !!auth.user
  const { content, isLoaded, isUrl } = useHomePageContent(
    props.initialContent,
    props.initialContentLoaded
  )

  if (!isLoaded) {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='flex min-h-screen items-center justify-center'>
          <div className='text-muted-foreground'>{t('Loading...')}</div>
        </main>
      </PublicLayout>
    )
  }

  if (content) {
    return (
      <PublicLayout showMainContainer={false}>
        <main className='overflow-x-hidden'>
          {isUrl ? (
            <iframe
              src={content}
              className='h-screen w-full border-none'
              title={t('Custom Home Page')}
            />
          ) : (
            <div className='container mx-auto py-8'>
              <Markdown className='custom-home-content'>{content}</Markdown>
            </div>
          )}
        </main>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout showMainContainer={false}>
      <Hero isAuthenticated={isAuthenticated} />
      <Stats />
      <Features />
      <HowItWorks />
      <CTA isAuthenticated={isAuthenticated} />
      <Footer />
    </PublicLayout>
  )
}
