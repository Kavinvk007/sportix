# Deployment Guide

Sportix is optimized for zero-config serverless deployment via **Vercel**. By utilizing a monolithic repository structure alongside a carefully configured `vercel.json`, Vercel serves the static frontend assets globally through its CDN while spinning up AWS Lambda serverless functions for the FastAPI backend.

## Deployment Steps

1. **GitHub Repository**: Push your code to a public or private GitHub repository.
2. **Vercel Dashboard**: Log in to Vercel and click "Add New..." -> "Project".
3. **Import Project**: Select the Sportix repository.
4. **Environment Variables**: Before clicking deploy, expand the "Environment Variables" section and add:
   - `STRIPE_SECRET_KEY`: Your live or test Stripe secret key (e.g., `sk_test_...`)
   - `SECRET_KEY`: A strong, random string used for signing JWT tokens.
5. **Deploy**: Vercel will read the `vercel.json` file in the root directory and automatically configure:
   - `@vercel/static` for `frontend/**`
   - `@vercel/python` for `backend/main.py`
6. **Live URL**: Once complete, your application will be live!

## Why Vercel?
- **Cost-Effective**: Free tier scales exceptionally well for portfolios.
- **Serverless**: No need to maintain a VPS or worry about Nginx reverse-proxies.
- **Seamless Integrations**: Out-of-the-box HTTPS and CDN edge caching.
