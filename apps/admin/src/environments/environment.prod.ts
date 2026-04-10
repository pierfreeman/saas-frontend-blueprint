// Production values are injected by scripts/generate-env.sh at Vercel build time.
export const environment = {
  production: true,
  adminApiUrl: 'https://admin-api.yourdomain.com',
  // Auth0 — filled in by generate-env.sh
  auth0Domain: '',
  auth0ClientId: '',
  auth0Audience: '',
  auth0RedirectUri: '',
};
