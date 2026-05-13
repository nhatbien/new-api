import { Link } from '@/lib/next-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Button } from '@/components/ui/button'
import { HeroTerminalDemo } from '../hero-terminal-demo'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()

  return (
    <section className='relative z-10 flex flex-col items-center overflow-hidden px-6 pt-32 pb-16 md:pt-44 md:pb-24'>
      {/* Background glow effects */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10'
      >
        <div
          className='absolute top-0 left-1/2 h-[500px] w-full -translate-x-1/2 opacity-20 blur-[120px] dark:opacity-[0.15]'
          style={{
            background: `radial-gradient(circle at center, var(--primary) 0%, transparent 70%)`,
          }}
        />
        <div
          className='absolute top-[10%] right-[10%] h-[400px] w-[400px] opacity-10 blur-[100px] dark:opacity-[0.08]'
          style={{
            background: `radial-gradient(circle at center, var(--primary) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Grid pattern */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,black_30%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.05]'
      />

      <div className='flex max-w-4xl flex-col items-center text-center'>
        <div className='landing-animate-fade-up border-primary/20 bg-primary/5 mb-6 inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-wider text-primary uppercase opacity-0' style={{ animationDelay: '0ms' }}>
          {t('Next-Generation AI Gateway')}
        </div>
        <h1
          className='landing-animate-fade-up text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.05] font-extrabold tracking-tight'
          style={{ animationDelay: '100ms' }}
        >
          {t('Unified API for')}
          <br />
          <span className='from-foreground to-foreground/70 bg-gradient-to-b bg-clip-text text-transparent'>
            {t('All Your AI Models')}
          </span>
        </h1>
        <p
          className='landing-animate-fade-up text-muted-foreground/80 mt-6 max-w-2xl text-base leading-relaxed opacity-0 md:text-xl'
          style={{ animationDelay: '200ms' }}
        >
          {systemName}{' '}
          {t(
            'is the modern open-source gateway for enterprise-grade AI deployments. Connect, manage, and scale your AI infrastructure with confidence.'
          )}
        </p>
        <div
          className='landing-animate-fade-up mt-10 flex flex-col items-center gap-4 opacity-0 sm:flex-row'
          style={{ animationDelay: '300ms' }}
        >
          {props.isAuthenticated ? (
            <Button
              size='lg'
              className='group h-12 rounded-xl px-8 text-sm font-semibold'
              render={<Link to='/dashboard' />}
            >
              {t('Go to Dashboard')}
              <ArrowRight className='ml-2 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
            </Button>
          ) : (
            <>
              <Button
                size='lg'
                className='group h-12 rounded-xl px-8 text-sm font-semibold'
                render={<Link to='/sign-up' />}
              >
                {t('Get Started Free')}
                <ArrowRight className='ml-2 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
              </Button>
              <Button
                variant='outline'
                size='lg'
                className='border-border/60 hover:border-border hover:bg-muted/50 h-12 rounded-xl px-8 text-sm font-semibold'
                render={<Link to='/pricing' />}
              >
                {t('View Pricing')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div
        className='landing-animate-fade-up mt-16 w-full opacity-0 md:mt-24'
        style={{ animationDelay: '450ms' }}
      >
        <div className='relative mx-auto max-w-5xl'>
          <div className='bg-primary/20 absolute -inset-1 rounded-[2rem] opacity-20 blur-2xl dark:opacity-10' />
          <HeroTerminalDemo />
        </div>
      </div>
    </section>
  )
}
