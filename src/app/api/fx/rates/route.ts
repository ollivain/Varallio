import { NextResponse } from "next/server";
import { getServerFxRates } from "@/lib/currency/serverProvider";
import { getStaticFxRates } from "@/lib/currency/staticProvider";
import type { FXRatesResponse } from "@/lib/currency";
import { checkAuth } from "@/lib/auth/server";

export async function GET(): Promise<NextResponse<FXRatesResponse | { error: string }>> {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
