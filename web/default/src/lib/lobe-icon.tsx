'use client'

import { useEffect, useState } from 'react'

/**
 * LobeHub Icon Loader
 * Dynamically load and render icons from @lobehub/icons
 *
 * Supports:
 * - Basic: "OpenAI", "OpenAI.Color"
 * - Chained properties are parsed for compatibility, but only the lightweight
 *   SVG variants are rendered. Compound variants that depend on
 *   @lobehub/ui/antd-style are intentionally not imported because antd-style's
 *   cssinjs cache schedules updates inside useInsertionEffect in React 19.
 * - Size parameter: getLobeIcon("OpenAI", 20)
 */

type IconProps = Record<string, unknown>
type IconComponent = React.ComponentType<IconProps>

const SUPPORTED_VARIANTS = new Set(['Color', 'Mono'])

function FallbackIcon(props: { label: string; size: number }) {
  return (
    <div
      className='bg-muted text-muted-foreground flex items-center justify-center rounded-full text-xs font-medium'
      style={{ width: props.size, height: props.size }}
    >
      {props.label}
    </div>
  )
}

function parseIconName(iconName: string): {
  baseKey: string
  propStartIndex: number
  variant: string
} {
  const segments = iconName.split('.')
  const baseKey = segments[0]
  const maybeVariant = segments[1]

  if (SUPPORTED_VARIANTS.has(maybeVariant)) {
    return { baseKey, propStartIndex: 2, variant: maybeVariant }
  }

  return { baseKey, propStartIndex: 1, variant: 'Mono' }
}

function LobeIconRenderer(props: {
  baseKey: string
  fallbackLabel: string
  iconProps: IconProps
  size: number
  variant: string
}) {
  const [IconComponent, setIconComponent] = useState<IconComponent | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let isActive = true
    setFailed(false)
    setIconComponent(null)

    import(
      /* webpackInclude: /components\/(Color|Mono)\.js$/ */
      `@lobehub/icons/es/${props.baseKey}/components/${props.variant}.js`
    )
      .then((module: { default?: IconComponent }) => {
        if (isActive) setIconComponent(() => module.default ?? null)
      })
      .catch(() => {
        if (isActive) setFailed(true)
      })

    return () => {
      isActive = false
    }
  }, [props.baseKey, props.variant])

  if (failed || !IconComponent) {
    return <FallbackIcon label={props.fallbackLabel} size={props.size} />
  }

  return <IconComponent {...props.iconProps} />
}

/**
 * Parse a property value from string to appropriate type
 * @param raw - Raw string value
 * @returns Parsed value (boolean, number, or string)
 */
function parseValue(raw: string | undefined | null): string | number | boolean {
  if (raw == null) return true

  let v = String(raw).trim()

  // Remove curly braces
  if (v.startsWith('{') && v.endsWith('}')) {
    v = v.slice(1, -1).trim()
  }

  // Remove quotes
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }

  // Boolean
  if (v === 'true') return true
  if (v === 'false') return false

  // Number
  if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v)

  // Return as string
  return v
}

/**
 * Get LobeHub icon component by name
 * @param iconName - Icon name/description (e.g., "OpenAI", "OpenAI.Color", "Claude.Avatar")
 * @param size - Icon size (default: 20)
 * @returns Icon component or fallback
 *
 * @example
 * getLobeIcon("OpenAI", 24)
 * getLobeIcon("OpenAI.Color", 20)
 * getLobeIcon("Claude.Avatar.type={'platform'}", 32)
 */
export function getLobeIcon(
  iconName: string | undefined | null,
  size: number = 20
): React.ReactNode {
  if (!iconName || typeof iconName !== 'string') {
    return <FallbackIcon label='?' size={size} />
  }

  const trimmedName = iconName.trim()
  if (!trimmedName) {
    return <FallbackIcon label='?' size={size} />
  }

  // Parse component path and chained properties
  const segments = trimmedName.split('.')
  const { baseKey, propStartIndex, variant } = parseIconName(trimmedName)

  // Parse chained properties (e.g., "type={'platform'}", "shape='square'")
  const props: Record<string, string | number | boolean> = {}

  for (let i = propStartIndex; i < segments.length; i++) {
    const seg = segments[i]
    if (!seg) continue

    const eqIdx = seg.indexOf('=')
    if (eqIdx === -1) {
      props[seg.trim()] = true
      continue
    }

    const key = seg.slice(0, eqIdx).trim()
    const valRaw = seg.slice(eqIdx + 1).trim()
    props[key] = parseValue(valRaw)
  }

  // Set size if not explicitly specified in the string
  if (props.size == null && size != null) {
    props.size = size
  }

  return (
    <LobeIconRenderer
      baseKey={baseKey}
      fallbackLabel={trimmedName.charAt(0).toUpperCase()}
      iconProps={props}
      size={size}
      variant={variant}
    />
  )
}
