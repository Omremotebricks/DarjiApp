# Darji Book Pro

Expo + React Native Web app with PWA support.

## Local development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run start
```

Run web only:

```bash
npm run web
```

## Production web build

Create a static web export:

```bash
npm run build:web
```

Output folder:

```text
dist/
```

## Deploy to Vercel

This repo includes [vercel.json](vercel.json) configured for Expo static output.

### Option 1: Vercel dashboard

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Vercel will automatically use:
   - Build Command: `npm run build:web`
   - Output Directory: `dist`

### Option 2: Vercel CLI

Install Vercel CLI:

```bash
npm i -g vercel
```

Deploy:

```bash
vercel
```

Deploy to production:

```bash
vercel --prod
```
