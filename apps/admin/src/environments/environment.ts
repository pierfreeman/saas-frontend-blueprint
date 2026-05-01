export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  adminApiUrl: 'http://localhost:3001',
  // Auth0 — SaaS Admin Portal application (separate from the platform app)
  // Set up a new SPA application in your Auth0 dashboard with Admin-Users-DB connection.
  auth0Domain: 'dev-kjj86ngdpy5eq4fd.eu.auth0.com',
  auth0ClientId: '891dcqwixqabl0Pg9DDVFmlV7jcCtL3z',
  auth0Audience: 'https://admin-api.saas-api.com',
  auth0RedirectUri: 'http://localhost:4203/auth/callback',
};
