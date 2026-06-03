import { NextResponse } from "next/server";

export type ApiKeyStatus = "configured" | "missing";

export interface ConfigStatusResponse {
  openai: ApiKeyStatus;
  twelveData: ApiKeyStatus;
  marketaux: ApiKeyStatus;
}

export async function GET(): Promise<NextResponse<ConfigStatusResponse>> {
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
