import createNextIntlPlugin from "next-intl/plugin";

// next-intl không dùng i18n routing (locale lấy từ cookie) → trỏ tới file cấu hình request.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: {
    // next/image optimizer không tự thêm basePath vào tham số "url" nội bộ
    // (chỉ thêm vào path endpoint /_next/image) → 404 khi chạy sau basePath/proxy multi-zone.
    // Tắt tối ưu để <Image> trỏ thẳng file tĩnh (basePath luôn đúng ở đó).
    unoptimized: true,
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "res.cloudinary.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
