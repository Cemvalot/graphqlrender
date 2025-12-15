/**
 * Security and utility functions
 */

// XSS protection: Escape HTML
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Validate input
export function validateInput(input, type = 'string') {
  if (type === 'number') {
    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) throw new Error('Invalid number');
    return num;
  }
  if (type === 'int') {
    const num = parseInt(input, 10);
    if (isNaN(num) || num.toString() !== String(input).trim()) {
      throw new Error('Invalid integer');
    }
    return num;
  }
  return String(input || '').trim();
}

// Secure token storage (already using localStorage, but add validation)
export function validateToken(token) {
  if (!token || typeof token !== 'string') return false;
  // JWT basic format check (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

// Rate limiting helper (simple in-memory)
const rateLimit = new Map();
export function checkRateLimit(key, max = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimit.get(key) || { count: 0, resetAt: now + windowMs };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }
  
  if (record.count >= max) {
    throw new Error('Rate limit exceeded. Please wait before trying again.');
  }
  
  record.count++;
  rateLimit.set(key, record);
  return true;
}

