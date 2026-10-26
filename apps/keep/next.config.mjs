/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@gyenbox/db", "@gyenbox/storage"],
}

export default nextConfig
