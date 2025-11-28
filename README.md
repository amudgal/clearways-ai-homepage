# ClearWays AI Homepage

This is a code bundle for ClearWays AI Homepage. The original project is available at https://www.figma.com/design/HWpBlrvM20G31TOsUOZtTa/ClearWays-AI-Homepage.

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the development server at `http://localhost:3000`

### Production Build

```bash
npm run build
```

Builds the production-ready site to the `dist/` directory.

## 📦 Project Structure

- `src/` - Source code
  - `components/` - React components
  - `pages/` - Page components
  - `assets/` - Images and static assets
- `dist/` - Production build output
- `netlify.toml` - Netlify deployment configuration

## 🌐 Deployment

### GitHub Repository
✅ Code is available at: https://github.com/amudgal/clearways-ai-homepage

### Netlify Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy:**
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Import the GitHub repository: `amudgal/clearways-ai-homepage`
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Deploy!

### Custom Domain: www.clearways.ai
See [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md) for step-by-step instructions to configure `www.clearways.ai`.

**Quick Setup:**
1. Deploy site to Netlify (see above)
2. Add custom domain `www.clearways.ai` in Netlify Dashboard
3. Configure DNS CNAME record at your DNS provider
4. Wait for DNS propagation (1-4 hours typically)

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives

## 📄 License

Private project - All rights reserved.