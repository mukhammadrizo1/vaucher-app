const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

export const environment = {
  production: true,
  apiUrl: isLocalhost
    ? 'http://localhost:3000/api'
    : 'https://vaucher-app.fly.dev/api',
};
