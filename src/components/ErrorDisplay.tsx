'use client';

import { useState, useEffect } from 'react';

export type ErrorType = 'timeout' | 'rate_limit' | 'not_found' | 'server_error' | 'network' | 'unknown';

interface ErrorDisplayProps {
  error: string;
  errorType?: ErrorType;
  onRetry?: () => void;
  retryCountdown?: number;
}

/**
 * Classify an error message into an error type
 */
export function classifyError(error: string | Error): ErrorType {
  const message = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();

  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  if (message.includes('429') || message.includes('rate limit') || message.includes('too many')) {
    return 'rate_limit';
  }
  if (message.includes('404') || message.includes('not found')) {
    return 'not_found';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('500') || message.includes('server')) {
    return 'server_error';
  }

  return 'unknown';
}

const ERROR_CONFIG: Record<ErrorType, { title: string; description: string; icon: string }> = {
  timeout: {
    title: 'Request Timed Out',
    description: 'The server is taking too long to respond. This might be due to high traffic or complex queries.',
    icon: '⏱️',
  },
  rate_limit: {
    title: 'Rate Limited',
    description: 'Too many requests. Please wait a moment before trying again.',
    icon: '🚦',
  },
  not_found: {
    title: 'Not Found',
    description: 'The requested resource could not be found. Please check the address and try again.',
    icon: '🔍',
  },
  server_error: {
    title: 'Server Error',
    description: 'Something went wrong on our end. Our team has been notified.',
    icon: '⚠️',
  },
  network: {
    title: 'Network Error',
    description: 'Unable to connect. Please check your internet connection and try again.',
    icon: '📡',
  },
  unknown: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again.',
    icon: '❌',
  },
};

export function ErrorDisplay({ error, errorType, onRetry, retryCountdown = 0 }: ErrorDisplayProps) {
  const [countdown, setCountdown] = useState(retryCountdown);
  const type = errorType || classifyError(error);
  const config = ERROR_CONFIG[type];

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  return (
    <div className="p-6 bg-red-900/20 border border-red-800 rounded-lg">
      <div className="flex items-start gap-4">
        <span className="text-3xl">{config.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-400 mb-1">{config.title}</h3>
          <p className="text-gray-300 text-sm mb-3">{config.description}</p>

          {/* Show actual error message for debugging */}
          <details className="text-xs text-gray-500 mb-4">
            <summary className="cursor-pointer hover:text-gray-400">Technical details</summary>
            <pre className="mt-2 p-2 bg-gray-900 rounded overflow-x-auto">{error}</pre>
          </details>

          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={countdown > 0}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  countdown > 0
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {countdown > 0 ? `Retry in ${countdown}s` : 'Try Again'}
              </button>
            )}
            <a
              href="/"
              className="px-4 py-2 rounded font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              Try Another Address
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StaleDataBannerProps {
  message?: string;
  lastUpdated?: Date | number;
  onRefresh?: () => void;
}

export function StaleDataBanner({ message, lastUpdated, onRefresh }: StaleDataBannerProps) {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : null;

  return (
    <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-yellow-400">⚠️</span>
        <span className="text-yellow-200 text-sm">
          {message || 'Showing cached data.'}
          {formattedTime && (
            <span className="text-yellow-400/70"> Last updated: {formattedTime}</span>
          )}
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="text-yellow-400 hover:text-yellow-300 text-sm underline"
        >
          Refresh
        </button>
      )}
    </div>
  );
}
