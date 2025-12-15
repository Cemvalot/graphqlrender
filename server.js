import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;
const ZONE01_BASE = 'https://platform.zone01.gr';

// Security: Set security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Remove server information
  res.removeHeader('X-Powered-By');
  next();
});

// Security: Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Check if request is secure (behind proxy)
    const isSecure = req.secure || 
                     req.headers['x-forwarded-proto'] === 'https' ||
                     req.headers['x-forwarded-ssl'] === 'on';
    
    if (!isSecure && req.method !== 'GET') {
      return res.status(403).json({ error: 'HTTPS required' });
    }
    next();
  });
}

// Security: Restrict CORS to allowed origins
// CRITICAL: In production, ALLOWED_ORIGINS must be set or server will fail to start
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : (process.env.NODE_ENV === 'production' ? null : ['*']); // Only allow * in development

if (process.env.NODE_ENV === 'production' && (!ALLOWED_ORIGINS || ALLOWED_ORIGINS.length === 0)) {
  console.error('ERROR: ALLOWED_ORIGINS environment variable must be set in production!');
  process.exit(1);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) only in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes('*') || (origin && ALLOWED_ORIGINS.includes(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Limit request body size (prevent DoS)
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ limit: '1mb', type: '*/*' }));

// Security: Rate limiting (simple in-memory)
// NOTE: For production with multiple instances, consider using Redis-based rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute per IP

// Cleanup old rate limit entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt + RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  return true;
}

// Security: Get client IP
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

// Security: Rate limiting middleware
function rateLimitMiddleware(req, res, next) {
  const ip = getClientIP(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Security: Validate GraphQL query (prevent mutations/introspection)
function sanitizeGraphQLQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid query');
  }
  
  // Remove comments and normalize whitespace for better detection
  const normalizedQuery = query
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  const lowerQuery = normalizedQuery.toLowerCase();
  
  // More comprehensive dangerous patterns
  // Note: __typename is allowed as it's commonly used in queries
  const dangerousPatterns = [
    /\bmutation\s*\w*\s*\{/i,  // mutation keyword
    /\bsubscription\s*\w*\s*\{/i,  // subscription keyword
    /__schema\s*\{/i,  // introspection schema query
    /__type\s*\(/i,  // introspection type query
    /__directive/i,  // introspection
    /__field/i,  // introspection
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalizedQuery)) {
      throw new Error('Mutations, subscriptions, and introspection are not allowed');
    }
  }
  
  // Basic query validation - must start with query or {
  if (!lowerQuery.startsWith('query') && !lowerQuery.startsWith('{')) {
    throw new Error('Invalid GraphQL query format');
  }
  
  // Limit query length to prevent DoS
  if (query.length > 10000) {
    throw new Error('Query too long');
  }
  
  return query;
}

// Security: Safe headers to forward (whitelist approach)
const SAFE_HEADERS_TO_FORWARD = [
  'content-type',
  'set-cookie',
  'authorization',
  'x-request-id'
];

function forwardSafeHeaders(sourceHeaders, targetResponse) {
  sourceHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    // Only forward safe headers
    if (SAFE_HEADERS_TO_FORWARD.includes(lowerKey)) {
      targetResponse.setHeader(key, value);
    }
  });
}

// Proxy for auth endpoints
app.post('/api/auth/signin', rateLimitMiddleware, async (req, res) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
  try {
    const authHeader = req.headers.authorization;
    
    const response = await fetch(`${ZONE01_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    // Forward only safe headers
    forwardSafeHeaders(response.headers, res);

    res.status(response.status);
    
    if (typeof data === 'string') {
      res.send(data);
    } else {
      res.json(data);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Security: Don't expose internal error details
    console.error('Auth proxy error:', error.message);
    
    if (error.name === 'AbortError') {
      res.status(504).json({ error: 'Request timeout' });
    } else {
      res.status(500).json({ error: 'Authentication request failed' });
    }
  }
});

// Proxy for GraphQL endpoint
app.post('/api/graphql-engine/v1/graphql', rateLimitMiddleware, async (req, res) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for GraphQL
  
  try {
    // Security: Validate GraphQL query
    if (req.body && req.body.query) {
      sanitizeGraphQLQuery(req.body.query);
    }
    
    const authHeader = req.headers.authorization;
    
    const response = await fetch(`${ZONE01_BASE}/api/graphql-engine/v1/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    // Forward only safe headers
    forwardSafeHeaders(response.headers, res);

    res.status(response.status).json(data);
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Security: Don't expose internal error details
    console.error('GraphQL proxy error:', error.message);
    
    // Handle validation errors differently
    if (error.message.includes('not allowed') || error.message.includes('Invalid') || error.message.includes('too long')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    res.status(500).json({ error: 'GraphQL request failed' });
  }
});

// Security: Validate environment variables on startup
function validateEnvironment() {
  const errors = [];
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS must be set in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    process.exit(1);
  }
}

// Validate environment before starting server
validateEnvironment();

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Allowed origins: ${process.env.ALLOWED_ORIGINS}`);
  }
});

