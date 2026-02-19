# ARM Engine Frontend

Public-facing website for ARM Engine self-service platform.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Hosting:** Vercel (production)
- **API Client:** Axios

## Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd arm-engine/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration:
```
REACT_APP_API_URL=http://localhost:3000
```

### Development

Run the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000) (or 3001 if 3000 is occupied by the backend).

### Building

Create a production build:
```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

### Testing

Run tests:
```bash
npm test
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── Navigation.tsx
│   └── Footer.tsx
├── pages/          # Page components
│   ├── Landing.tsx
│   ├── About.tsx
│   ├── Pricing.tsx
│   └── Contact.tsx
├── layouts/        # Layout components
│   └── MainLayout.tsx
├── App.tsx         # Main app with routing
└── index.tsx       # Entry point
```

## Available Pages

- **Home (/)** - Landing page with hero and features
- **/about** - About ARM Engine
- **/pricing** - Pricing plans overview
- **/contact** - Contact information and form

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to complete deployment

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy the `build/` directory to your hosting provider

## Environment Variables

- `REACT_APP_API_URL` - Backend API base URL (default: http://localhost:3000)
- `REACT_APP_ENV` - Environment (development, staging, production)

## Phase 1 Status

✅ Public website foundation complete
✅ Landing page implemented
✅ Navigation and footer
✅ Responsive design (mobile, tablet, desktop)
✅ Static pages (About, Pricing, Contact)

## Next Phases

- **Phase 2:** User authentication UI (signup, login, password reset)
- **Phase 3:** Stripe Checkout integration
- **Phase 4:** Customer billing dashboard
- **Phase 5:** Webhook robustness and end-to-end testing

## Support

For issues or questions, contact: support@armengine.example
