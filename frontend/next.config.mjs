import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, ".."),
  ...(process.env.WISHBI_STATIC_EXPORT === "true"
    ? { output: "export", basePath: "/Wish", trailingSlash: true }
    : {}),
};

export default nextConfig;
