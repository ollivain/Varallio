import { NextResponse } from "next/server";
import { getServerFxRates } from "@/lib/currency/serverProvider";
import { getStaticFxRates } from "@/lib/currency/staticProvider";
import type { FXRatesResponse } from "@/lib/currency";

export async function GET(): Promise<NextResponse<FXRatesResponse>> {
  try {
    const result = await getServerFxRates();
    return NextResponse.json(result);
  } catch (err) {
    console.error(
      "[/api/fx/rates] Unexpected error, returning static FX fallback:",
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json(getStaticFxRates());
  }
}
