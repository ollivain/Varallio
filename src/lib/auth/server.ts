import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "investment_os_auth";
const HMAC_MESSAGE = "investment-os";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

export function createAuthCookieValue(): string {
  const password = process.env.APP_PASSWORD!;
  return createHmac("sha256", password).update(HMAC_MESSAGE).digest("hex");
}

export function isValidAuthCookie(cookieValue: string): boolean {
  if (!isAuthConfigured()) return false;
  const expected = createAuthCookieValue();
  try {
    const a = Buffer.from(cookieValue, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getAuthCookieOptions(isProd: boolean) {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function checkAuth(): Promise<boolean> {
  if (!isAuthConfigured()) return false;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return false;
  return isValidAuthCookie(cookie.value);
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
