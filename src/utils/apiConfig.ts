/**
 * Get the API base URL, automatically converting HTTP to HTTPS if the page is loaded over HTTPS
 * This prevents Mixed Content errors when the frontend is served over HTTPS
 * 
 * NOTE: If backend doesn't support HTTPS, this will cause timeouts.
 * Configure HTTPS on Elastic Beanstalk for production use.
 */
export function getApiBaseUrl(): string {
  let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  
  // Check if backend supports HTTPS by testing the URL
  // For now, if VITE_API_URL is explicitly set to HTTP, use it as-is
  // This allows temporary workaround if HTTPS isn't configured yet
  const explicitHttp = import.meta.env.VITE_API_URL?.startsWith('http://');
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
  
  // Only auto-convert if:
  // 1. Page is HTTPS AND
  // 2. API URL is HTTP AND
  // 3. Not explicitly set to HTTP (allows temporary workaround)
  if (isHttpsPage && apiUrl.startsWith('http://') && !explicitHttp) {
    // Try HTTPS first, but this will timeout if backend doesn't support it
    const httpsUrl = apiUrl.replace('http://', 'https://');
    console.warn(
      `[API Config] Converting HTTP to HTTPS: ${import.meta.env.VITE_API_URL} → ${httpsUrl}\n` +
      `⚠️ WARNING: If backend doesn't support HTTPS, requests will timeout.\n` +
      `Please configure HTTPS on Elastic Beanstalk or set VITE_API_URL to HTTP (not recommended for production).`
    );
    return httpsUrl;
  }
  
  // If explicitly set to HTTP, use it (temporary workaround)
  if (explicitHttp && isHttpsPage) {
    console.warn(
      `[API Config] Using HTTP backend with HTTPS frontend. This will cause Mixed Content errors.\n` +
      `⚠️ Configure HTTPS on Elastic Beanstalk for production use.`
    );
  }
  
  return apiUrl;
}

