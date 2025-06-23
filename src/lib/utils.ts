import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility function to set cache headers for API responses
 * @param maxAge - Cache duration in seconds (default: 5)
 * @returns Headers object for NextResponse
 */
export function getCacheHeaders(maxAge: number = 5) {
  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    'CDN-Cache-Control': `max-age=${maxAge}`,
    'Vercel-CDN-Cache-Control': `max-age=${maxAge}`,
    // Vercel specific headers to override browser cache
    'Surrogate-Control': `max-age=${maxAge}`,
    'Surrogate-Key': `api-cache-${maxAge}s`
  }
}

/**
 * Utility function to disable caching completely
 * @returns Headers object for NextResponse
 */
export function getNoCacheHeaders() {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'CDN-Cache-Control': 'no-cache',
    'Vercel-CDN-Cache-Control': 'no-cache',
    'Surrogate-Control': 'no-cache',
    'Surrogate-Key': 'no-cache'
  }
}
