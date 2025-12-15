## Zone01 GraphQL Profile (Vite + Vanilla JS)

A production-ready dashboard that authenticates against Zone01, fetches profile data via GraphQL, and renders SVG-based statistics with a built-in GraphiQL interface.

### Features

#### Core Requirements ✅
- **Authentication**: Username/email + password login with JWT storage
- **Profile Sections**: Identity, Total XP, Audit Ratio, Level, Skills, XP by Project
- **Statistics**: 2+ SVG graphs (XP Over Time, Audit Ratio, Skills Distribution)
- **GraphQL Queries**: Normal, nested, and arguments-based queries

#### Bonus Features ⭐
- **Additional Graph**: Skills Distribution bar chart (3rd SVG graph)
- **GraphiQL Interface**: Built-in query tester with syntax highlighting
- **Security**: Input validation, XSS protection, rate limiting
- **UI/UX**: Responsive design, clean typography, modern aesthetics

### Getting Started

```bash
npm install
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
npm test           # Run tests
npm run test:ui    # Run tests with UI
npm run test:coverage # Run tests with coverage
```

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=10000

# Environment (development or production)
NODE_ENV=development

# CORS Configuration
# In production, this MUST be set to your allowed origins (comma-separated)
# Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# For development, you can leave this unset (will default to *)
ALLOWED_ORIGINS=
```

**Important for Production:**
- `ALLOWED_ORIGINS` is **REQUIRED** in production - the server will not start without it
- Set `NODE_ENV=production` to enable all security features
- For Render deployment: Set `ALLOWED_ORIGINS` in the Render Dashboard after services are created (see deployment instructions)
- Format: `https://service1.onrender.com,https://service2.onrender.com` (comma-separated, no spaces)

### Deploy

#### Render

Due to CORS restrictions, you need to deploy two services:

**1. Deploy Proxy Service (Web Service):**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will detect `render.yaml` and create the proxy service
5. Click **"Apply"** to deploy
6. **Wait for deployment to complete**
7. **Note the proxy service URL** (e.g., `https://graphql-profile-proxy.onrender.com`)
8. **IMPORTANT - Set CORS after deployment:**
   - Go to your proxy service → **Environment** tab
   - Add/Edit `ALLOWED_ORIGINS` environment variable
   - Set value to: `https://graphql-profile-proxy.onrender.com,https://your-static-site-name.onrender.com`
   - (You'll update this again after creating the static site)
   - Click **"Save Changes"** - service will restart

**2. Deploy Static Site:**
1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect your repository
3. Configure:
   - **Name**: `graphql-profile` (or your preferred name)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. **Add Environment Variable:**
   - Key: `VITE_PROXY_URL`
   - Value: `https://graphql-profile-proxy.onrender.com` (use your actual proxy URL from step 6)
5. Click **"Create Static Site"**
6. **Wait for deployment to complete**
7. **Note the static site URL** (e.g., `https://graphql-profile.onrender.com`)

**3. Update CORS in Proxy Service:**
1. Go back to your proxy service → **Environment** tab
2. Update `ALLOWED_ORIGINS` to include both URLs:
   - Value: `https://graphql-profile-proxy.onrender.com,https://graphql-profile.onrender.com`
   - (Replace with your actual service names)
3. Click **"Save Changes"**
4. Your services should now work together!

#### Netlify
- Build: `npm run build`
- Publish: `dist`
- Framework: None (static)

#### GitHub Pages
1. `npm run build`
2. Deploy `dist` folder
3. Set `base` in `vite.config.js` if using subpath

### Security Features

- ✅ XSS protection via HTML escaping
- ✅ Input validation for all user inputs
- ✅ Rate limiting (20-30 requests/minute)
- ✅ Query sanitization (blocks mutations/introspection)
- ✅ Secure token storage
- ✅ CORS-safe API calls

### Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm run test:coverage
```

Test coverage includes:
- Authentication flow
- Graph rendering
- Utility functions
- Input validation

### Project Structure

```
/
├── index.html          # Login page
├── profile.html        # Dashboard
├── src/
│   ├── auth.js        # Authentication
│   ├── gql.js         # GraphQL client
│   ├── profile.js     # Profile logic
│   ├── graphs.js      # SVG charts
│   ├── utils.js       # Security & utilities
│   └── styles.css     # Styling
├── tests/             # Test suite
└── package.json
```

### GraphQL Queries Demonstrated

1. **Normal Query**: `user { firstName lastName }`
2. **Nested Query**: `user { xp_project { object { name } } }`
3. **Arguments Query**: `transactions(where: {type: {_eq: "xp"}})`
4. **Aggregate Query**: `transactions_aggregate { aggregate { sum { amount } } }`
