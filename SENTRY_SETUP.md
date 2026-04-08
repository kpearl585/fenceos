# Sentry Setup Guide

## Overview

Sentry has been integrated into FenceEstimatePro to provide:
- **Error tracking** - Catch and fix bugs in production
- **Performance monitoring** - Track slow API routes and page loads
- **Session replay** - See exactly what users did before an error occurred

## Configuration

### 1. Environment Variables

Add these to your `.env.local` file (already configured):

```bash
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://33bf54f148b69d420e3fc0ae17f092f7@o4511105698365440.ingest.us.sentry.io/4511180652150784
SENTRY_AUTH_TOKEN=your-auth-token-here
```

### 2. Get Your Sentry Auth Token

1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Click "Create New Token"
3. Name it "FenceEstimatePro Build"
4. Scopes needed:
   - `project:read`
   - `project:write`
   - `project:releases`
5. Copy the token and add it to `.env.local`

### 3. Vercel Environment Variables

Add these to your Vercel project settings:

**Production:**
```
NEXT_PUBLIC_SENTRY_DSN=https://33bf54f148b69d420e3fc0ae17f092f7@o4511105698365440.ingest.us.sentry.io/4511180652150784
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

**Preview & Development:**
- Same as production (errors will be tagged by environment)

## Files Created

- `sentry.client.config.ts` - Client-side error tracking
- `sentry.server.config.ts` - Server-side error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `instrumentation.ts` - Next.js instrumentation hook
- `next.config.js` - Updated with Sentry webpack plugin

## Features Enabled

### ✅ Error Tracking
All unhandled errors are automatically sent to Sentry with:
- Stack traces
- User context (if logged in)
- Breadcrumbs (user actions leading to error)
- Device/browser info

### ✅ Performance Monitoring
- API route performance
- Page load times
- Database query performance
- Sample rate: 100% (adjust in production if needed)

### ✅ Session Replay
- Records 10% of normal sessions
- Records 100% of error sessions
- Masked text/media for privacy
- See exactly what users did before errors

### ✅ Filtered Noise
Auto-ignores common false positives:
- `ChunkLoadError` (deployment updates)
- `NetworkError` (user internet issues)
- `ResizeObserver` (browser quirks)
- Browser extension errors

## Testing Sentry

### Method 1: Trigger Test Error (Recommended)

Create a test page at `src/app/sentry-test/page.tsx`:

```tsx
'use client';

export default function SentryTestPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Sentry Test Page</h1>
      <button
        onClick={() => {
          throw new Error('Test Sentry Error - This is expected!');
        }}
        style={{
          background: '#EF4444',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Trigger Test Error
      </button>
    </div>
  );
}
```

Visit `/sentry-test` and click the button. Check Sentry dashboard for the error.

### Method 2: Console Command

In browser console:
```javascript
throw new Error('Sentry Test Error');
```

### Method 3: Server Error

Add to any API route:
```typescript
throw new Error('Server-side test error');
```

## Sentry Dashboard

View errors at: https://pearl-labs-llc-u5.sentry.io/projects/fenceos/

## Production Checklist

Before deploying:

- [ ] Sentry auth token added to Vercel env vars
- [ ] DSN added to Vercel env vars  
- [ ] Test error appears in Sentry dashboard
- [ ] Session replay working (check Issues → Replays tab)
- [ ] Performance monitoring showing data
- [ ] Error filtering working (no spam errors)

## Adjusting Sample Rates

Edit `sentry.client.config.ts`:

```typescript
// Reduce performance monitoring (save quota)
tracesSampleRate: 0.1, // 10% of requests

// Reduce session replays (save storage)
replaysSessionSampleRate: 0.05, // 5% of sessions
replaysOnErrorSampleRate: 1.0,  // 100% of error sessions
```

## Troubleshooting

### Build fails with Sentry plugin errors
- Check `SENTRY_AUTH_TOKEN` is set
- Verify org/project names in `next.config.js`

### No errors appearing in Sentry
- Check DSN is correct
- Verify Sentry is initialized (check browser console)
- Test with manual error: `throw new Error('test')`

### Too many errors
- Adjust `beforeSend` filters in config files
- Add more patterns to `ignoreErrors` array

## Cost Optimization

Sentry free tier includes:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month

To stay under limits:
1. Lower `tracesSampleRate` to 0.1 (10%)
2. Lower `replaysSessionSampleRate` to 0.01 (1%)
3. Keep `replaysOnErrorSampleRate` at 1.0 (catch all errors)

## Support

Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
Pearl Labs Sentry: https://pearl-labs-llc-u5.sentry.io/
