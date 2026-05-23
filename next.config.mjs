/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://miro.com https://*.miro.com",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // Compat con embeds viejos en Miro que apuntan a /embed/:clientId/plan
      { source: "/embed/:clientId/plan", destination: "/embed/:clientId" },
    ];
  },
};

export default nextConfig;
