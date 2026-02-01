import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn: dsn || undefined,
  // Ne pas envoyer d’infos personnelles (ROADMAP: pas de données sensibles en prod)
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
  enabled: !!dsn,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: dsn ? 1.0 : 0,
  integrations: dsn
    ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ]
    : [],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
