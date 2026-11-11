// Empty in local development: Vite proxies /api. Set the server origin for separate deployments.
const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const apiUrl = path => base + path;
export async function apiFetch(path, options) {
  const response = await fetch(apiUrl(path), options);
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The API returned an unexpected response. Please try again or contact support.');
  }
  return response;
}
