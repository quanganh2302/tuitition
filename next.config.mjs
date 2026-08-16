import createNextIntlPlugin from "next-intl/plugin";

// next-intl không dùng i18n routing (locale lấy từ cookie) → trỏ tới file cấu hình request.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  images: {
    // next/image không tự thêm basePath vào "src" (chỉ vào path endpoint) → ảnh local vỡ
    // sau basePath/proxy multi-zone. Custom loader tự thêm basePath, khỏi sửa từng <Image>.
    loader: "custom",
    loaderFile: "./src/lib/imageLoader.js",
  },
};

export default withNextIntl(nextConfig);
