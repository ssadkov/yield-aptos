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
                // API routes - short cache
                source: '/api/:path*',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=5, s-maxage=5, stale-while-revalidate=10',
                    },
                    {
                        key: 'CDN-Cache-Control',
                        value: 'max-age=5',
                    },
                    {
                        key: 'Vercel-CDN-Cache-Control',
                        value: 'max-age=5',
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
  