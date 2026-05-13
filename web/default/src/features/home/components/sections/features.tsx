import {
  Zap,
  Shield,
  Globe,
  Code,
  Gauge,
  DollarSign,
  Users,
  HeartHandshake,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()

  const features = [
    {
      id: 'fast',
      num: '01',
      title: t('Lightning Fast'),
      desc: t(
        'Optimized network architecture ensures millisecond response times across all endpoints.'
      ),
      span: 'md:col-span-2',
      icon: <Zap className='size-4 text-primary' />,
      visual: (
        <div className='mt-6 grid grid-cols-3 gap-2'>
          {['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Qwen', 'Llama'].map(
            (name) => (
              <div
                key={name}
                className='border-border/40 bg-muted/30 text-muted-foreground flex items-center justify-center rounded-xl border px-3 py-2.5 text-[11px] font-medium transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:text-primary'
              >
                {name}
              </div>
            )
          )}
        </div>
      ),
    },
    {
      id: 'secure',
      num: '02',
      title: t('Secure by Design'),
      desc: t(
        'Enterprise-grade security with granular permission controls and encryption.'
      ),
      span: 'md:col-span-1',
      icon: <Shield className='size-4 text-primary' />,
      visual: (
        <div className='mt-6 flex items-center justify-center'>
          <div className='relative'>
            <div className='flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5'>
              <Shield
                className='size-7 text-primary/70'
                strokeWidth={1.5}
              />
            </div>
            <div className='absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30'>
              <svg
                className='size-3 text-primary-foreground'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                strokeWidth={3}
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='m4.5 12.75 6 6 9-13.5'
                />
              </svg>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'global',
      num: '03',
      title: t('Intelligent Routing'),
      desc: t('Smart load balancing and automatic failover for 99.99% uptime.'),
      span: 'md:col-span-1',
      icon: <Globe className='size-4 text-primary' />,
      visual: (
        <div className='mt-6 space-y-2.5'>
          {[t('Load Balancing'), t('Rate Limiting'), t('Cost Control')].map(
            (step, i) => (
              <div key={step} className='flex items-center gap-3'>
                <div
                  className={`flex size-6 items-center justify-center rounded-lg text-[10px] font-bold transition-colors ${
                    i === 1
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'border-border/40 bg-muted/40 text-muted-foreground border'
                  }`}
                >
                  {i + 1}
                </div>
                <div className='bg-border/40 h-px flex-1' />
                <span className='text-muted-foreground text-[11px] font-medium'>{step}</span>
              </div>
            )
          )}
        </div>
      ),
    },
    {
      id: 'developer',
      num: '04',
      title: t('Developer Obsessed'),
      desc: t('Unified API routes that work seamlessly with your existing tools and SDKs.'),
      span: 'md:col-span-2',
      icon: <Code className='size-4 text-primary' />,
      visual: (
        <div className='mt-6 flex items-center gap-4'>
          <div className='flex -space-x-3'>
            {['API', 'SDK', 'CLI', 'Docs'].map((n) => (
              <div
                key={n}
                className='border-background bg-muted flex size-10 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm'
              >
                {n}
              </div>
            ))}
          </div>
          <div className='bg-primary/5 text-primary flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold'>
            <Code className='size-3.5' />
            {t('OpenAPI Compatible')}
          </div>
        </div>
      ),
    },
  ]

  const additionalFeatures = [
    {
      icon: <Gauge className='size-5' strokeWidth={1.5} />,
      title: t('High Performance'),
      desc: t('Built with Go for maximum throughput and efficiency.'),
    },
    {
      icon: <DollarSign className='size-5' strokeWidth={1.5} />,
      title: t('Cost Efficiency'),
      desc: t('Advanced quota management to prevent unexpected costs.'),
    },
    {
      icon: <Users className='size-5' strokeWidth={1.5} />,
      title: t('Multi-tenancy'),
      desc: t('Isolate workloads with flexible team and user management.'),
    },
    {
      icon: <HeartHandshake className='size-5' strokeWidth={1.5} />,
      title: t('Open Source'),
      desc: t('Transparent, community-driven, and easy to self-host.'),
    },
  ]

  return (
    <section className='relative z-10 px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 flex flex-col items-center text-center'>
          <div className='text-primary border-primary/20 bg-primary/5 mb-4 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider uppercase'>
            {t('Features')}
          </div>
          <h2 className='text-3xl leading-tight font-bold tracking-tight md:text-5xl'>
            {t('Built for developers,')}
            <br />
            <span className='text-muted-foreground'>{t('designed for scale')}</span>
          </h2>
        </AnimateInView>

        {/* Bento grid */}
        <div className='border-border/40 bg-border/40 grid gap-px overflow-hidden rounded-[2rem] border md:grid-cols-3'>
          {features.map((f, i) => (
            <AnimateInView
              key={f.id}
              delay={i * 100}
              animation='scale-in'
              className={`bg-background group hover:bg-muted/30 p-8 transition-all duration-500 md:p-10 ${f.span}`}
            >
              <div className='mb-4 flex items-center gap-3'>
                <div className='bg-primary/10 flex size-10 items-center justify-center rounded-xl transition-colors group-hover:bg-primary group-hover:text-primary-foreground'>
                  {f.icon}
                </div>
                <h3 className='text-lg font-bold tracking-tight'>{f.title}</h3>
              </div>
              <p className='text-muted-foreground text-sm leading-relaxed'>
                {f.desc}
              </p>
              {f.visual}
            </AnimateInView>
          ))}
        </div>

        {/* Additional features row */}
        <div className='mt-20 grid grid-cols-1 gap-12 md:grid-cols-4'>
          {additionalFeatures.map((f, i) => (
            <AnimateInView
              key={f.title}
              delay={i * 100}
              animation='fade-up'
              className='flex flex-col items-center text-center'
            >
              <div className='text-muted-foreground border-border/40 bg-muted/20 group-hover:border-primary/50 group-hover:text-primary mb-5 flex size-14 items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110'>
                {f.icon}
              </div>
              <h3 className='mb-2 text-base font-bold'>{f.title}</h3>
              <p className='text-muted-foreground max-w-[240px] text-[13px] leading-relaxed'>
                {f.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
