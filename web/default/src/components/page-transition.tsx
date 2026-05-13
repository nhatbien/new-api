import type { ReactNode } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

type Variants = Record<string, unknown>

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition(props: PageTransitionProps) {
  return (
    <div className={cn('animate-appear opacity-0', props.className)}>
      {props.children}
    </div>
  )
}

export function AnimatedOutlet() {
  const routeKey = useRouterState({
    select: (s) => s.location.pathname,
  })

  return (
    <div
      key={routeKey}
      className='animate-appear flex min-h-0 flex-1 flex-col opacity-0'
    >
      <Outlet />
    </div>
  )
}

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  variants?: Variants
}

export function StaggerContainer(props: StaggerContainerProps) {
  return (
    <div className={cn('animate-appear opacity-0', props.className)}>
      {props.children}
    </div>
  )
}

interface StaggerItemProps {
  children: ReactNode
  className?: string
  variants?: Variants
}

export function StaggerItem(props: StaggerItemProps) {
  return (
    <div className={cn('animate-appear opacity-0', props.className)}>
      {props.children}
    </div>
  )
}

export function TableStaggerContainer(props: StaggerContainerProps) {
  return <tbody className={props.className}>{props.children}</tbody>
}

export function TableStaggerRow(props: StaggerItemProps) {
  return (
    <tr className={cn('animate-appear opacity-0', props.className)}>
      {props.children}
    </tr>
  )
}

export function CardStaggerContainer(props: StaggerContainerProps) {
  return (
    <div className={cn('animate-appear opacity-0', props.className)}>
      {props.children}
    </div>
  )
}

export function CardStaggerItem(props: StaggerItemProps) {
  return (
    <div className={cn('animate-appear opacity-0', props.className)}>
      {props.children}
    </div>
  )
}

interface FadeInProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function FadeIn(props: FadeInProps) {
  return (
    <div
      className={cn('animate-appear opacity-0', props.className)}
      style={
        props.delay === undefined
          ? undefined
          : { animationDelay: `${props.delay}s` }
      }
    >
      {props.children}
    </div>
  )
}
