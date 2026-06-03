import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerNews } from "@/lib/news/serverProvider";
import type { NewsProviderResult } from "@/lib/news/types";

function normalizeTickers(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((ticker): ticker is string => typeof ticker === "string")
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);
}

function readTickersFromUrl(request: NextRequest): string[] {
  const rawTickers = request.nextUrl.searchParams.get("tickers");
  if (!rawTickers) return [];

  return rawTickers
    .split(",")
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean);
}

const FALLBACK_RESULT: NewsProviderResult = {
  items: [],
  source: "mock",
};

export async function GET(request: NextRequest): Promise<NextResponse<NewsProviderResult>> {
  try {
    const result = await getServerNews(readTickersFromUrl(request));
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[/api/news GET] Unexpected error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(FALLBACK_RESULT);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<NewsProviderResult>> {
  let body: unknown = null;

  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const tickers =
    body && typeof body === "object"
      ? normalizeTickers((body as Record<string, unknown>).tickers)
      : [];

  try {
    const result = await getServerNews(tickers);
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[/api/news POST] Unexpected error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(FALLBACK_RESULT);
  }
}
