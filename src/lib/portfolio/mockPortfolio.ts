import type { Portfolio } from "./types";

/**
 * Mock portfolio used to drive the dashboard while there is no backend.
 *
 * The numbers are tuned so the derived summary (see calculations.ts) lands
 * close to the original hard-coded dashboard:
 *   - Salkun arvo      ≈ 127 540 €
 *   - Päivän muutos    ≈ +2 940 €  (+2,36 %)
 *   - Kokonais-tuotto  ≈ +18 755 € (+17,24 %)
 *   - Jakauma          ≈ Osakkeet 76 % / ETF:t 12 % / Käteinen 6 % / Raaka-aineet 6 %
 *
 * `previousClosePrice` and `averageBuyPrice` are chosen so that day change and
 * total return aggregate to the figures above rather than being stored directly.
 */
export const mockPortfolio: Portfolio = {
  id: "portfolio-main",
  name: "Oma salkku",
  baseCurrency: "EUR",
  updatedAt: "2026-06-01T08:00:00.000Z",
  holdings: [
    {
      id: "holding-nvda",
      name: "NVIDIA",
      ticker: "NVDA",
      assetType: "stock",
      currency: "EUR",
      quantity: 62,
      averageBuyPrice: 788.5,
      currentPrice: 975.3,
      previousClosePrice: 940.0,
      sector: "Teknologia",
      region: "Yhdysvallat",
      exchange: "NASDAQ",
    },
    {
      id: "holding-asml",
      name: "ASML",
      ticker: "ASML",
      assetType: "stock",
      currency: "EUR",
      quantity: 24,
      averageBuyPrice: 720.0,
      currentPrice: 852.2,
      previousClosePrice: 830.0,
      sector: "Teknologia",
      region: "Eurooppa",
      exchange: "Euronext Amsterdam",
    },
    {
      id: "holding-fortum",
      name: "Fortum",
      ticker: "FORTUM",
      assetType: "stock",
      currency: "EUR",
      quantity: 520,
      averageBuyPrice: 15.5,
      currentPrice: 17.46,
      previousClosePrice: 17.67,
      sector: "Energia",
      region: "Suomi",
      exchange: "Nasdaq Helsinki",
    },
    {
      id: "holding-wartsila",
      name: "Wärtsilä",
      ticker: "WRT1V",
      assetType: "stock",
      currency: "EUR",
      quantity: 440,
      averageBuyPrice: 14.4,
      currentPrice: 15.92,
      previousClosePrice: 15.74,
      sector: "Teollisuus",
      region: "Suomi",
      exchange: "Nasdaq Helsinki",
    },
    {
      id: "holding-iwda",
      name: "iShares Core MSCI World",
      ticker: "IWDA",
      assetType: "etf",
      currency: "EUR",
      quantity: 149,
      averageBuyPrice: 91.0,
      currentPrice: 102.5,
      previousClosePrice: 101.05,
      region: "Globaali",
      exchange: "Euronext Amsterdam",
    },
    {
      id: "holding-gold",
      name: "Xetra-Gold",
      ticker: "4GLD",
      assetType: "commodity",
      currency: "EUR",
      quantity: 82,
      averageBuyPrice: 85.0,
      currentPrice: 92.3,
      previousClosePrice: 91.9,
      region: "Eurooppa",
      exchange: "Xetra",
    },
  ],
  cash: [
    {
      id: "cash-eur",
      currency: "EUR",
      amount: 7693.5,
    },
  ],
};

export default mockPortfolio;
