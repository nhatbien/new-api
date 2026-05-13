/// <reference types="next" />
/// <reference types="next/image-types/global" />

declare module '@visactor/react-vchart' {
  export const VChart: React.ComponentType<Record<string, unknown>>
}

declare module '@visactor/vchart-semi-theme' {
  export const initVChartSemiTheme: (opts?: Record<string, unknown>) => void
}
