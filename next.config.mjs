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
};

export default nextConfig;
