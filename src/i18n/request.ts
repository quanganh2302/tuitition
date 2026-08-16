import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

// Không dùng i18n routing: locale lấy từ cookie `locale` (nút LanguageSwitcher set). Mặc định "vi".
export const locales = ["vi", "en"] as const;
export const defaultLocale = "vi";

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get("locale")?.value;
  const locale = (locales as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as string)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
