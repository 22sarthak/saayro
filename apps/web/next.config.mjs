/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@saayro/mock-data", "@saayro/tokens", "@saayro/types", "@saayro/ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ]
  }
};

export default nextConfig;

