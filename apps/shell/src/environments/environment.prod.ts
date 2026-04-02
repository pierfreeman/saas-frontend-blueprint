// Production values are injected by scripts/generate-env.sh at Vercel build time.
// Do not commit real credentials here.
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com',
  adminApiUrl: 'https://admin-api.yourdomain.com',
  auth0Domain: 'your-tenant.eu.auth0.com',
  auth0ClientId: 'YOUR_PROD_CLIENT_ID',
  auth0Audience: 'https://api.yourdomain.com',
  auth0RedirectUri: 'https://app.yourdomain.com/auth/callback',
};
