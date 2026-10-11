/**
 * Common shared types, interfaces, constants, and utilities for @repo/shared
 */

// Shared API Response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

// User model
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: string;
}

// Health check model
export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  timestamp: string;
  version: string;
  service: string;
  environment: string;
}

// Project info
export interface ProjectInfo {
  name: string;
  description: string;
  version: string;
}

// Application Constants
export const APP_CONFIG = {
  APP_NAME: 'Dhokla Dominators - Vortexa',
  DEFAULT_API_PORT: 5000,
  DEFAULT_WEB_PORT: 3000,
  API_PREFIX: '/api/v1',
} as const;

// Helper utilities
export function createSuccessResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(error: string, message = 'Error'): ApiResponse<never> {
  return {
    success: false,
    message,
    error,
    timestamp: new Date().toISOString(),
  };
}
