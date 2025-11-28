# Deployment Guide

## GitHub Repository
✅ Repository created and code pushed to: https://github.com/amudgal/clearways-ai-homepage

## Netlify Deployment

The project is configured for Netlify deployment with:
- `netlify.toml` configuration file
- SPA routing support (all routes redirect to index.html)
- Build output directory: `dist`

### Option 1: Deploy via Netlify Dashboard (Recommended)

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub" and authorize if needed
4. Choose the repository: `amudgal/clearways-ai-homepage`
5. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

Netlify will automatically:
- Build your site on every push to the repository
- Deploy previews for pull requests
- Handle SPA routing automatically (via netlify.toml)

### Option 2: Deploy via Netlify CLI

If you prefer using the CLI:

```bash
# Link to a new site
netlify init

# Or deploy directly (after linking)
netlify deploy --prod --dir=dist
```

### Environment Variables

If you need any environment variables, add them in:
- Netlify Dashboard → Site settings → Environment variables

### Custom Domain

To add a custom domain:
1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow DNS configuration instructions

## Build Commands Reference

- **Development**: `npm run dev`
- **Production Build**: `npm run build`
- **Build Output**: `dist/` directory

