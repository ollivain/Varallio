import { NextResponse } from "next/server";
import { checkAuth } from "@/lib/auth/server";

export type ApiKeyStatus = "configured" | "missing";

export interface ConfigStatusResponse {
  openai: ApiKeyStatus;
  twelveData: ApiKeyStatus;
  marketaux: ApiKeyStatus;
}

export async function GET(): Promise<NextResponse<ConfigStatusResponse | { error: string }>> {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({
      openai: process.env.OPENAI_API_KEY ? "configured" : "missing",
      twelveData: process.env.MARKET_DATA_API_KEY ? "configured" : "missing",
      marketaux: process.env.MARKETAUX_API_KEY ? "configured" : "missing",
    });
  } catch {
    return NextResponse.json({
      openai: "missing",
      twelveData: "missing",
      marketaux: "missing",
    });
  }
}
