'use client';

import { useState } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function SentryTestPage() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testClientError = () => {
    addResult('Triggering client-side error...');
    throw new Error('🧪 Client-side test error - This is expected!');
  };

  const testCaptureException = () => {
    addResult('Manually capturing exception...');
    Sentry.captureException(new Error('🧪 Manually captured test error'));
    addResult('✅ Exception captured - Check Sentry dashboard');
  };

  const testCaptureMessage = () => {
    addResult('Sending test message...');
    Sentry.captureMessage('🧪 Test message from FenceEstimatePro', 'info');
    addResult('✅ Message sent - Check Sentry dashboard');
  };

  const testWithContext = () => {
    addResult('Sending error with custom context...');
    Sentry.withScope((scope) => {
      scope.setTag('test-type', 'context-test');
      scope.setUser({ email: 'test@fenceestimatepro.com' });
      scope.setContext('test-context', {
        feature: 'sentry-integration',
        timestamp: Date.now(),
      });
      Sentry.captureException(new Error('🧪 Error with custom context'));
    });
    addResult('✅ Error with context sent - Check Sentry dashboard');
  };

  return (
    <div style={{ padding: '3rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Sentry Integration Test
        </h1>
        <p style={{ color: '#6B7280' }}>
          Test Sentry error tracking for FenceEstimatePro. Each button triggers a different type of error or event.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={testClientError}
          style={{
            background: '#EF4444',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          💥 Trigger Unhandled Error (Will crash page)
        </button>

        <button
          onClick={testCaptureException}
          style={{
            background: '#F59E0B',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          📸 Capture Exception (Safe - won't crash)
        </button>

        <button
          onClick={testCaptureMessage}
          style={{
            background: '#3B82F6',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          💬 Send Info Message
        </button>

        <button
          onClick={testWithContext}
          style={{
            background: '#8B5CF6',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          🏷️ Send Error with Context
        </button>
      </div>

      <div
        style={{
          background: '#F3F4F6',
          borderRadius: '8px',
          padding: '1.5rem',
          marginTop: '2rem',
        }}
      >
        <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Test Results</h3>
        {testResults.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
            Click a button above to test Sentry integration...
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {testResults.map((result, i) => (
              <div
                key={i}
                style={{
                  background: 'white',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              >
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#EFF6FF',
          borderRadius: '8px',
          border: '1px solid #BFDBFE',
        }}
      >
        <p style={{ fontSize: '0.875rem', color: '#1E40AF', margin: 0 }}>
          <strong>Next steps:</strong> After triggering test errors, check your{' '}
          <a
            href="https://pearl-labs-llc-u5.sentry.io/projects/fenceos/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2563EB', textDecoration: 'underline' }}
          >
            Sentry dashboard
          </a>{' '}
          to see the events.
        </p>
      </div>
    </div>
  );
}
