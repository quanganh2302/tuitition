// Custom next/image loader: tự thêm basePath cho ảnh local (public/), giữ nguyên URL ảnh ngoài
// (Cloudinary/Pexels). Next.js không tự thêm basePath vào "src" — chỉ vào path endpoint.
export default function imageLoader({ src }) {
  if (/^https?:\/\//.test(src)) return src;
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}`;
}
