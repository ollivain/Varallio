import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isAuthConfigured,
  createAuthCookieValue,
  getAuthCookieOptions,
} from "@/lib/auth/server";

interface LoginBody {
  password: string;
}

function isValidBody(body: unknown): body is LoginBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.password === "string" && b.password.length > 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { ok: false, error: "APP_PASSWORD is not configured on the server." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const expected = process.env.APP_PASSWORD!;
  if (body.password !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid password." }, { status: 401 });
  }

  const isProd = process.env.NODE_ENV === "production";
  const tokenValue = createAuthCookieValue();
  const opts = getAuthCookieOptions(isProd);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    ...opts,
    value: tokenValue,
  });
  return response;
}
