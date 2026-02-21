# Technical Architecture Document - Phase 1: Public Website Foundation

## Frontend Architecture

### Project Structure
```
frontend/
├── public/
├── src/
│   ├── components/       # Reusable React components (e.g., Button, Card)
│   ├── pages/            # Page-level components for routing (e.g., Home.tsx, About.tsx)
│   ├── layouts/          # Shared layouts (e.g., MainLayout.tsx)
│   ├── styles/           # Global and modular CSS/Sass files
│   ├── assets/           # Images, fonts, and static assets
│   ├── utils/            # Utility functions (e.g., helper functions)
│   └── App.tsx           # Root component
├── package.json
├── tsconfig.json
├── vercel.json           # Vercel hosting configuration
└── .env.example          # Example environment variables
```
**Rationale:** This structure ensures modularity, easy navigation, and scalability for future phases.

### Component Hierarchy
- **Root:** `App.tsx` (includes `BrowserRouter` from React Router)
  - **Layouts:** `MainLayout` (header, footer, main content area)
  - **Pages:**
    - `Home` (Landing page)
    - `About`
    - `PricingOverview`
    - `Contact`
  - **Components:** Small, reusable elements (e.g., `Button`, `HeroSection`, `Navigation`)

### Routing Strategy
- Use `react-router-dom` for client-side routing.
- Routes:
  ```js
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/pricing" element={<PricingOverview />} />
      <Route path="/contact" element={<Contact />} />
    </Routes>
  </BrowserRouter>
  ```

### State Management
- None for Phase 1. Local component state and minimal Context API for shared state (e.g., theme) will suffice.

### Styling Approach
- Use **Tailwind CSS** for utility-first styling, with customizations via the `tailwind.config.js` file.

## Deployment Architecture

### Frontend-to-Backend Connection
- API base URL will be configurable via `REACT_APP_API_URL` in `.env.local`.
- No API calls in Phase 1.

### Environment Variables
`.env.local`:
```
REACT_APP_API_URL=http://localhost:3000
```

### Build Process
- Development: `npm run dev`
- Production: `npm run build`

### Hosting Configuration
- Use **Vercel** for deployment.
- Add the following `vercel.json` for configuration:
  ```json
  {
    "rewrites": [
      { "source": "/api/:path*", "destination": "https://backend-url.com/api/:path*" }
    ]
  }
  ```

### Domain / Subdomain Strategy
- Use a Vercel-provided subdomain for staging (e.g., `arm-engine.vercel.app`).

## Development Environment

### Local Development Setup
1. `npm install` to install dependencies.
2. `npm run dev` to start the development server.
3. Ensure the backend (Node.js API) is running on port 3000.

### Port Configuration
- Frontend: Port 3001
- Backend: Port 3000

### CORS Configuration
- Backend should allow requests from `http://localhost:3001` for local development.

## Static Pages Design

### Landing Page
**Wireframe:** Hero section with a headline, subheadline, and call-to-action buttons.

### Navigation Structure
- Header:
  - Menu Items: `Home`, `About`, `Pricing`, `Contact`
  - Responsive design with a hamburger menu for mobile.

### Other Pages
- **About:** Company mission, vision, and history.
- **Pricing Overview:** High-level description of plans.
- **Contact:** Form for inquiries.

## Performance & SEO

### Code Splitting
- Use React's `lazy` and `Suspense` for code splitting at the route level.

### Image Optimization
- Use `next/image` equivalent in React for lazy-loaded and responsive images.

### SEO Considerations
- Meta tags: `title`, `description`, `keywords`.
- Lighthouse Performance Target: Score above 90.

## Security Considerations

### Security Headers
- Add CSP headers to prevent XSS attacks.
- Enforce HTTPS by default using Vercel settings.

### Environment Variable Security
- Do not commit `.env.local`. Use `.env.example` for template variables.

## Dependencies
- **react**, **react-dom** (core React)
- **react-router-dom** (routing)
- **typescript** (static typing)
- **tailwindcss** (styling framework)
- **@vitejs/plugin-react** (React plugin for Vite)
- **axios** (prepare for future API calls)

## Acceptance Criteria Verification
- Landing page implemented with navigation.
- Responsive design verified on mobile, tablet, and desktop.
- Static pages accessible via defined routes.
- Deployment verified on Vercel.

## Constraints Compliance
- No backend-breaking changes are introduced.
- Multi-tenant security preserved.
- CI consideration for future frontend tests.