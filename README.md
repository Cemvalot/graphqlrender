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

### Deploy

#### Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Static Site"**
3. Connect your GitHub/GitLab/Bitbucket repository
4. Configure the following settings:
   - **Name**: `graphql-profile` (or your preferred name)
   - **Branch**: `main` (or your default branch)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Click **"Create Static Site"**
6. Wait for the build to complete - your site will be live automatically!

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
