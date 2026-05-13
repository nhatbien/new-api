export default function CatchAllPage() {
  return null
}

export function generateStaticParams() {
  return [
    { path: ['about'] },
    { path: ['pricing'] },
    { path: ['rankings'] },
    { path: ['privacy-policy'] },
    { path: ['user-agreement'] },
    { path: ['setup'] },
    { path: ['sign-in'] },
    { path: ['sign-up'] },
    { path: ['forgot-password'] },
    { path: ['otp'] },
    { path: ['oauth'] },
    { path: ['reset'] },
    { path: ['user', 'reset'] },
    { path: ['dashboard'] },
    { path: ['channels'] },
    { path: ['keys'] },
    { path: ['models'] },
    { path: ['playground'] },
    { path: ['profile'] },
    { path: ['redemption-codes'] },
    { path: ['subscriptions'] },
    { path: ['usage-logs'] },
    { path: ['users'] },
    { path: ['wallet'] },
    { path: ['system-settings'] },
    { path: ['chat2link'] },
    { path: ['401'] },
    { path: ['403'] },
    { path: ['404'] },
    { path: ['500'] },
    { path: ['503'] },
  ]
}
