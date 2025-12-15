/**
 * Utils module tests
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml, validateInput, validateToken, checkRateLimit } from '../src/utils.js';

describe('Utils Module', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;/script&gt;');
      expect(result).not.toContain('<script>');
      expect(escapeHtml('Hello & World')).toBe('Hello &amp; World');
    });

    it('should handle plain text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('validateInput', () => {
    it('should validate numbers', () => {
      expect(validateInput('123', 'number')).toBe(123);
      expect(() => validateInput('abc', 'number')).toThrow();
    });

    it('should validate integers', () => {
      expect(validateInput('42', 'int')).toBe(42);
      expect(() => validateInput('42.5', 'int')).toThrow();
    });

    it('should trim strings', () => {
      expect(validateInput('  hello  ', 'string')).toBe('hello');
    });
  });

  describe('validateToken', () => {
    it('should validate JWT format', () => {
      const validToken = 'eyJhbGci.eyJzdWIi.fake';
      expect(validateToken(validToken)).toBe(true);
    });

    it('should reject invalid tokens', () => {
      expect(validateToken('invalid')).toBe(false);
      expect(validateToken('')).toBe(false);
      expect(validateToken(null)).toBe(false);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      expect(() => checkRateLimit('test-key', 5, 1000)).not.toThrow();
    });

    it('should throw when limit exceeded', () => {
      const key = 'limit-test';
      checkRateLimit(key, 2, 1000);
      checkRateLimit(key, 2, 1000);
      expect(() => checkRateLimit(key, 2, 1000)).toThrow('Rate limit exceeded');
    });
  });
});

