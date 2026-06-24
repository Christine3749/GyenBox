/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@gyenbox/api-client", "@gyenbox/db", "@gyenbox/types"],
}

export default nextConfig
