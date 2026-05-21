import * as Sentry from '@sentry/nextjs';
import { scrubEvent } from '@/lib/sentry-scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  debug: false,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  beforeSend: (event) => scrubEvent(event),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
