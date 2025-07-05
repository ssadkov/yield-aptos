/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['explorer.aptoslabs.com'],
    },
    async headers() {
        return [
            {
                // Static assets - long cache
                source: '/:path*.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
            {
                // API routes - no cache
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate, max-age=0',
                    },
                    {
                        key: 'Pragma',
                        value: 'no-cache',
                    },
                    {
                        key: 'Expires',
                        value: '0',
                    },
                    {
                        key: 'CDN-Cache-Control',
                        value: 'no-cache',
                    },
                    {
                        key: 'Vercel-CDN-Cache-Control',
                        value: 'no-cache',
                    },
                ],
            },
            {
                // Default for other pages
                source: '/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=3600, s-maxage=3600',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
  