import { NextResponse } from "next/server";
import { isAuthConfigured, checkAuth } from "@/lib/auth/server";

interface AuthStatusResponse {
  authenticated: boolean;
  configured: boolean;
}

export async function GET(): Promise<NextResponse<AuthStatusResponse>> {
  const configured = isAuthConfigured();
  if (!configured) {
    return NextResponse.json({ authenticated: false, configured: false });
  }
  const authenticated = await checkAuth();
  return NextResponse.json({ authenticated, configured: true });
}
