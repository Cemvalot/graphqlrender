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
- Format: `https://service1.com,https://service2.com` (comma-separated, no spaces)

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
