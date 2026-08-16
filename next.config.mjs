import createNextIntlPlugin from "next-intl/plugin";

// next-intl không dùng i18n routing (locale lấy từ cookie) → trỏ tới file cấu hình request.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
