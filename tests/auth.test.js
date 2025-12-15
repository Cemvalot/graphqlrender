/**
 * Auth module tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, getToken, logout } from '../src/auth.js';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();
global.localStorage = localStorageMock;

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('login', () => {
    it('should store JWT token on successful login', async () => {
      const mockToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.test.token';
      const mockHeaders = new Map();
      mockHeaders.set('content-type', 'application/json');
      mockHeaders.set('Authorization', null);
      mockHeaders.set('X-Token', null);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn((key) => mockHeaders.get(key))
        },
        text: async () => JSON.stringify(mockToken)
      });

      const token = await login('user@example.com', 'password');
      
      expect(token).toBe(mockToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('zone01_jwt', mockToken);
    });

    it('should throw error on failed login', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' })
      });

      await expect(login('user@example.com', 'wrong')).rejects.toThrow();
    });

    it('should handle JWT as plain string response', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.test';
      fetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn((key) => key === 'content-type' ? 'application/json' : null)
        },
        text: async () => JSON.stringify(mockToken)
      });

      const token = await login('user', 'pass');
      expect(token).toBe(mockToken);
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      localStorageMock.setItem('zone01_jwt', 'test-token');
      expect(getToken()).toBe('test-token');
    });

    it('should return null if no token', () => {
      expect(getToken()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should remove token from storage', () => {
      // Mock window.location.href to avoid navigation error
      delete window.location;
      window.location = { href: '' };
      const locationSpy = vi.spyOn(window.location, 'href', 'set');
      
      localStorageMock.setItem('zone01_jwt', 'test-token');
      logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('zone01_jwt');
      expect(locationSpy).toHaveBeenCalledWith('/index.html');
      
      locationSpy.mockRestore();
    });
  });
});

