import { Settings, Zap, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

export function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    {
      num: '1',
      title: t('Configure'),
      desc: t(
        'Add your API keys, set up channels and configure granular access permissions.'
      ),
      icon: <Settings className='size-7' strokeWidth={1.5} />,
    },
    {
      num: '2',
      title: t('Connect'),
      desc: t(
        'Route requests through OpenAI, Claude, Gemini, and other compatible endpoints.'
      ),
      icon: <Zap className='size-7' strokeWidth={1.5} />,
    },
    {
      num: '3',
      title: t('Monitor'),
      desc: t('Track usage, costs and performance with beautiful real-time analytics.'),
      icon: <BarChart3 className='size-7' strokeWidth={1.5} />,
    },
  ]

  return (
    <section className='border-border/40 relative z-10 border-t px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-20 text-center'>
          <div className='text-primary border-primary/20 bg-primary/5 mb-4 inline-flex rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase'>
            {t('Workflow')}
          </div>
          <h2 className='text-3xl font-bold tracking-tight md:text-5xl'>
            {t('Simple, yet powerful')}
          </h2>
        </AnimateInView>

        <div className='grid gap-12 md:grid-cols-3 md:gap-16'>
          {steps.map((step, i) => (
            <AnimateInView
              key={step.num}
              delay={i * 150}
              animation='fade-up'
              className='group relative flex flex-col items-center text-center'
            >
              <div className='relative mb-8'>
                <div className='text-muted-foreground border-border/40 bg-muted/20 group-hover:border-primary/50 group-hover:text-primary flex size-20 items-center justify-center rounded-[2rem] border transition-all duration-500 group-hover:rotate-6 group-hover:scale-110'>
                  {step.icon}
                </div>
                <div className='bg-primary text-primary-foreground absolute -top-1 -right-1 flex size-8 items-center justify-center rounded-2xl text-sm font-bold shadow-lg shadow-primary/20'>
                  {step.num}
                </div>
              </div>
              <h3 className='mb-3 text-xl font-bold tracking-tight'>{step.title}</h3>
              <p className='text-muted-foreground max-w-[260px] text-[15px] leading-relaxed'>
                {step.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
