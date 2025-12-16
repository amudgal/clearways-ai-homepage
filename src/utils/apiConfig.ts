/**
 * Get the API base URL, automatically converting HTTP to HTTPS if the page is loaded over HTTPS
 * This prevents Mixed Content errors when the frontend is served over HTTPS
 */
export function getApiBaseUrl(): string {
  let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
  // Always convert HTTP to HTTPS if the page is loaded over HTTPS
  // This is critical for production to prevent Mixed Content errors
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (apiUrl.startsWith('http://')) {
      apiUrl = apiUrl.replace('http://', 'https://');
      console.warn(
        `[API Config] Converting HTTP to HTTPS: ${import.meta.env.VITE_API_URL} → ${apiUrl}\n` +
        `This is required because the page is loaded over HTTPS. ` +
        `Please update VITE_API_URL in Netlify to use HTTPS directly.`
      );
    }
  }
  
  return apiUrl;
}

