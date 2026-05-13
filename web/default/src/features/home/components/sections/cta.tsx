import { Link } from '@/lib/next-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='relative z-10 overflow-hidden px-6 py-24 md:py-40'>
      {/* Background glow effect */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10'
      >
        <div
          className='absolute top-1/2 left-1/2 h-[400px] w-full -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[100px] dark:opacity-[0.1]'
          style={{
            background: `radial-gradient(circle at center, var(--primary) 0%, transparent 70%)`,
          }}
        />
      </div>

      <AnimateInView
        className='mx-auto max-w-4xl text-center'
        animation='scale-in'
      >
        <div className='text-primary border-primary/20 bg-primary/5 mb-6 inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase'>
          {t('Start Today')}
        </div>
        <h2 className='text-3xl leading-[1.1] font-bold tracking-tight md:text-6xl'>
          {t('Ready to simplify')}
          <br />
          <span className='from-foreground to-foreground/60 bg-gradient-to-b bg-clip-text text-transparent'>
            {t('your AI integration?')}
          </span>
        </h2>
        <p className='text-muted-foreground/80 mx-auto mt-6 max-w-lg text-base leading-relaxed md:text-lg'>
          {t(
            'Join hundreds of developers building the next generation of AI applications with our unified gateway.'
          )}
        </p>
        <div className='mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row'>
          <Button
            size='lg'
            className='group h-12 rounded-xl px-8 text-sm font-semibold'
            render={<Link to='/sign-up' />}
          >
            {t('Get Started Now')}
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
        </div>
      </AnimateInView>
    </section>
  )
}
