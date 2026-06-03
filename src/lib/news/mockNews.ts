import type { NewsItem } from "./types";

export const mockNews: NewsItem[] = [
  {
    id: "news-ecb-rates",
    title: "EKP pitää korot ennallaan - mitä se tarkoittaa markkinoille?",
    source: "Market Brief",
    publishedAt: "2026-06-01T06:30:00.000Z",
    summary: "Korkopäätös tukee varovaista markkinatunnelmaa Euroopassa.",
    sentiment: "neutral",
    createdAt: "2026-06-01T06:35:00.000Z",
    updatedAt: "2026-06-01T06:35:00.000Z",
  },
  {
    id: "news-nvidia-results",
    title: "NVIDIA julkaisi vahvan tulosraportin",
    source: "Equity Wire",
    publishedAt: "2026-06-01T08:15:00.000Z",
    tickers: ["NVDA"],
    summary: "Datakeskusliikevaihto ja AI-kysyntä ylittivät odotukset.",
    sentiment: "positive",
    createdAt: "2026-06-01T08:20:00.000Z",
    updatedAt: "2026-06-01T08:20:00.000Z",
  },
  {
    id: "news-asml-cycle",
    title: "ASML hyötyy puolijohdesyklin elpymisestä",
    source: "Nordic Markets",
    publishedAt: "2026-05-31T14:00:00.000Z",
    tickers: ["ASML"],
    summary: "Tilaukset viittaavat asteittaiseen kysynnän paranemiseen.",
    sentiment: "positive",
    createdAt: "2026-05-31T14:05:00.000Z",
    updatedAt: "2026-05-31T14:05:00.000Z",
  },
  {
    id: "news-fortum-power",
    title: "Fortumin näkymissä painetta sähkön hinnan laskiessa",
    source: "Helsinki Desk",
    publishedAt: "2026-05-30T10:45:00.000Z",
    tickers: ["FORTUM"],
    summary: "Sähkön spot-hinnan lasku voi painaa lähiajan tulosodotuksia.",
    sentiment: "negative",
    createdAt: "2026-05-30T10:50:00.000Z",
    updatedAt: "2026-05-30T10:50:00.000Z",
  },
];

export default mockNews;
