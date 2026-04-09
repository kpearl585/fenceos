import { Page } from '@playwright/test';

/**
 * Console monitoring utilities for E2E tests
 *
 * Captures console errors, warnings, and failed network requests
 */

export interface ConsoleMessage {
  type: string;
  text: string;
  location?: string;
}

export interface NetworkError {
  url: string;
  status: number;
  method: string;
}

export class ConsoleMonitor {
  private consoleMessages: ConsoleMessage[] = [];
  private networkErrors: NetworkError[] = [];

  constructor(private page: Page) {}

  startMonitoring() {
    // Monitor console messages
    this.page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        this.consoleMessages.push({
          type,
          text: msg.text(),
          location: msg.location()?.url,
        });
      }
    });

    // Monitor network failures
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        this.networkErrors.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method(),
        });
      }
    });

    // Monitor page errors
    this.page.on('pageerror', (error) => {
      this.consoleMessages.push({
        type: 'pageerror',
        text: error.message,
      });
    });
  }

  getErrors(): ConsoleMessage[] {
    return this.consoleMessages.filter((m) => m.type === 'error' || m.type === 'pageerror');
  }

  getWarnings(): ConsoleMessage[] {
    return this.consoleMessages.filter((m) => m.type === 'warning');
  }

  getNetworkErrors(): NetworkError[] {
    return this.networkErrors;
  }

  clear() {
    this.consoleMessages = [];
    this.networkErrors = [];
  }

  hasErrors(): boolean {
    return this.getErrors().length > 0 || this.networkErrors.length > 0;
  }
}
