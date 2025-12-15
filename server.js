import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;
const ZONE01_BASE = 'https://platform.zone01.gr';

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  credentials: false
}));

app.use(express.json());
app.use(express.text({ type: '*/*' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy for auth endpoints
app.post('/api/auth/signin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    const response = await fetch(`${ZONE01_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();

    // Forward response headers that might contain the token
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    res.status(response.status);
    
    if (typeof data === 'string') {
      res.send(data);
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
});

// Proxy for GraphQL endpoint
app.post('/api/graphql-engine/v1/graphql', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    const response = await fetch(`${ZONE01_BASE}/api/graphql-engine/v1/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Forward response headers
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
    });

    res.status(response.status).json(data);
  } catch (error) {
    console.error('GraphQL proxy error:', error);
    res.status(500).json({ error: 'GraphQL proxy request failed', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});

