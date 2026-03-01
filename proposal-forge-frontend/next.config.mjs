/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["react-markdown"],
  experimental: {
    optimizePackageImports: ["@radix-ui/react-accordion", "@radix-ui/react-checkbox", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-label", "@radix-ui/react-separator", "@radix-ui/react-slider", "@radix-ui/react-slot", "@radix-ui/react-switch"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "uploadthing.com", pathname: "/**" },
      { protocol: "https", hostname: "utfs.io", pathname: "/**" },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
    ],
  },
};

export default nextConfig;
