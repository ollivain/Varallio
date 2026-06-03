import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerMarketQuotes } from "@/lib/market/serverProvider";
import type { MarketDataResult } from "@/lib/market/types";
import { checkAuth } from "@/lib/auth/server";

interface QuotesResponseBody extends MarketDataResult {
  source: "api" | "mock";
}

function isValidBody(body: unknown): body is { tickers: string[] } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.tickers) &&
    b.tickers.length > 0 &&
    b.tickers.every((t) => typeof t === "string")
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<QuotesResponseBody | { error: string }>> {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { quotes: [], errors: [], source: "mock" },
      { status: 400 }
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      { quotes: [], errors: [], source: "mock" },
      { status: 400 }
    );
  }

  try {
    const result = await getServerMarketQuotes(body.tickers);
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[/api/market/quotes] Unexpected error:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ quotes: [], errors: [], source: "mock" as const });
  }
}
