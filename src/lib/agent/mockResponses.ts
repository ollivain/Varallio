import { formatCurrency, formatPercent, formatSignedPercent } from "@/lib/formatters";
import type { AgentAlertItem, AgentContext, AgentNewsItem } from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStockWeight(context: AgentContext): number {
  return context.portfolio.allocation.find((item) => item.type === "stock")?.percent ?? 0;
}

function getLargestHolding(context: AgentContext) {
  return context.portfolio.topHoldings[0];
}

function describeAlert(alert: AgentAlertItem): string {
  const priceStr =
    alert.currentPrice === undefined
      ? "nykyhintaa ei löydy dashboardin datasta"
      : `nykyhinta ${formatCurrency(alert.currentPrice, { currency: alert.currency, decimals: 2 })}`;
  return `${alert.name} (${alert.ticker}) ${alert.direction === "above" ? "yli" : "alle"} ${formatCurrency(alert.targetPrice, { currency: alert.currency, decimals: 2 })}, ${priceStr}`;
}

function describeNewsItem(item: AgentNewsItem): string {
  const tickers = item.tickers?.length ? ` [${item.tickers.join(", ")}]` : "";
  const sentiment = item.sentiment ? `, ${item.sentiment}` : "";
  return `"${item.title}"${tickers} (${item.priority}${sentiment}, ${item.timeLabel}) — ${item.reason}`;
}

function getRelatedNews(context: AgentContext): AgentNewsItem[] {
  const seen = new Map<string, AgentNewsItem>();
  for (const item of [
    ...context.news.portfolioRelatedNews,
    ...context.news.watchlistRelatedNews,
    ...context.news.latestNews,
  ]) {
    if (!seen.has(item.title)) seen.set(item.title, item);
  }
  return Array.from(seen.values());
}

function dataNoteIfMock(context: AgentContext): string {
  const status = context.dataHealthSummary.overallStatus;
  if (status === "mock") return " (Huom: data on demo-tilassa, ei live-markkinadataa.)";
  if (status === "stale") return " (Huom: osa datasta voi olla vanhentunutta — suosittelen päivittämistä.)";
  if (status === "partial") return " (Huom: osa datasta on mock/tuntematon.)";
  return "";
}

// ── Response builder ──────────────────────────────────────────────────────────

export function getMockAgentResponse(question: string, context: AgentContext): string {
  const q = question.toLocaleLowerCase("fi-FI");
  const currency = context.portfolio.baseCurrency;
  const dataNote = dataNoteIfMock(context);

  // ── Hälytykset ────────────────────────────────────────────────────────────
  if (q.includes("häly") || q.includes("haly") || q.includes("lauennut")) {
    const triggered = context.alerts.triggeredAlerts;
    const active = context.alerts.activeAlerts;
    if (triggered.length > 0) {
      const list = triggered.slice(0, 3).map(describeAlert).join("; ");
      return `Dashboardin datan perusteella ${triggered.length} hintahälytystä on lauennut: ${list}. Tämä on sääntöpohjainen huomio nykyhinnoista — ei sijoitussuositus.${dataNote}`;
    }
    if (active.length > 0) {
      const list = active.slice(0, 3).map(describeAlert).join("; ");
      return `Yksikään hälytys ei näytä lauenneen nykyhinnoilla. Aktiivisia hälytyksiä on ${active.length}: ${list}.${dataNote}`;
    }
    return `Dashboardin datassa ei näy tällä hetkellä aktiivisia hintahälytyksiä.${dataNote}`;
  }

  // ── Valittu kohde / snapshot ──────────────────────────────────────────────
  if (
    q.includes("valittu") ||
    q.includes("snapshot") ||
    q.includes("kohde") ||
    (context.selectedCompanySnapshot &&
      q.includes(context.selectedCompanySnapshot.symbol.toLowerCase()))
  ) {
    const cs = context.selectedCompanySnapshot;
    if (!cs) {
      return `Yhtään kohdetta ei ole valittuna snapshotissa. Valitse omistus tai watchlist-kohde nähdäksesi tarkemman tilannekuvan.${dataNote}`;
    }
    const nameRef = cs.name ? `${cs.name} (${cs.symbol})` : cs.symbol;
    const role = cs.isHolding ? "portfolio-omistus" : "watchlist-tutkimuskohde";
    const weightStr =
      cs.portfolioWeight !== undefined
        ? ` Paino salkussa on ${cs.portfolioWeight.toFixed(1)} %.`
        : "";
    const returnStr =
      cs.totalReturnPercent !== undefined
        ? ` Kokonaistuotto on ${formatSignedPercent(cs.totalReturnPercent)}.`
        : "";
    const sentimentStr =
      cs.sentiment !== "unknown" ? ` Uutissentiment on ${cs.sentiment}.` : "";
    const insightStr =
      cs.insights.length > 0 ? ` Huomioita: ${cs.insights.slice(0, 2).join("; ")}.` : "";
    return `${nameRef} on dashboardissasi ${role}.${weightStr}${returnStr}${sentimentStr}${insightStr} Tämä perustuu valitun kohteen snapshot-dataan.${dataNote}`;
  }

  // ── Uutiset / tärkeimmät ──────────────────────────────────────────────────
  if (
    q.includes("uutis") ||
    q.includes("tärkein") ||
    q.includes("tarkein") ||
    q.includes("vaikuttaa")
  ) {
    const related = getRelatedNews(context);
    if (related.length === 0) {
      return `Dashboardin datasta ei löydy tällä hetkellä portfolioon tai seurantalistaan liittyviä uutisia.${dataNote}`;
    }
    const top = related[0];
    const rest = related.slice(1, 3).map(describeNewsItem).join("; ");
    return `Uutisintelligienssi nostaa tärkeimmäksi: ${describeNewsItem(top)}. ${rest ? `Muita huomionarvoisia: ${rest}.` : ""} Tämä perustuu uutisintelligienssin prioriteettipisteytykseen.${dataNote}`;
  }

  // ── Portfolio insights / havainnot ────────────────────────────────────────
  if (
    q.includes("insight") ||
    q.includes("havainto") ||
    q.includes("portfoliosta") ||
    q.includes("salkusta")
  ) {
    const insights = context.portfolioInsights;
    if (insights.length === 0) {
      return `Portfolio insights ei nosta tällä hetkellä erityisiä havaintoja salkustasi.${dataNote}`;
    }
    const top = insights[0];
    const second = insights[1];
    const secondStr = second
      ? ` Lisäksi: [${second.severity}/${second.category}] ${second.title}: ${second.description}`
      : "";
    return `Portfolio insights nostaa: [${top.severity}/${top.category}] ${top.title}: ${top.description}${secondStr}. Tämä perustuu salkun sääntöpohjaiseen analyysiin.${dataNote}`;
  }

  // ── Action suggestions / seuraavat askeleet ───────────────────────────────
  if (
    q.includes("seuraava") ||
    q.includes("toimenpide") ||
    q.includes("ehdotus") ||
    q.includes("askel") ||
    q.includes("tee") ||
    q.includes("tarkista")
  ) {
    const actions = context.actionSuggestions;
    if (actions.length === 0) {
      return `Dashboardin data ei nosta tällä hetkellä erityisiä toimenpide-ehdotuksia.${dataNote}`;
    }
    const top = actions[0];
    const second = actions[1];
    const secondStr = second ? ` Seuraavaksi: ${second.title} — ${second.description}.` : "";
    return `Action suggestions ehdottaa: [${top.priority}] ${top.title} — ${top.description}.${secondStr} Nämä ovat turvallisia tarkistuksia, eivät osto- tai myyntisuosituksia.${dataNote}`;
  }

  // ── Watchlist research ────────────────────────────────────────────────────
  if (
    q.includes("watchlist") ||
    q.includes("seurata") ||
    q.includes("seurantalista") ||
    q.includes("research")
  ) {
    const research = context.watchlistResearch;
    if (research.length === 0) {
      return `Seurantalistasi on tyhjä tai watchlist research ei tuota havaintoja.${dataNote}`;
    }
    const highPriority = research.filter((r) => r.priority === "high").slice(0, 2);
    const others = research.filter((r) => r.priority !== "high").slice(0, 1);
    const items = [...highPriority, ...others];
    const list = items
      .map((r) => `${r.name} (${r.symbol}): ${r.reason} [${r.priority}/${r.sentiment}]`)
      .join("; ");
    return `Watchlist research nostaa seurattaviksi: ${list}. Nämä ovat tutkimusideoita, ei osto-/myyntisuosituksia.${dataNote}`;
  }

  // ── Data health / tuoreus ─────────────────────────────────────────────────
  if (
    q.includes("data") ||
    q.includes("päivit") ||
    q.includes("tuoreus") ||
    q.includes("lähde") ||
    q.includes("mock")
  ) {
    const health = context.dataHealthSummary;
    const items = health.items
      .map((i) => `${i.label}: ${i.source}/${i.status}`)
      .join(", ");
    const warnings =
      health.warnings.length > 0 ? ` Varoitukset: ${health.warnings.join("; ")}.` : "";
    return `Data health -tilan mukaan kokonaisstatus on "${health.overallStatus}". Lähteet: ${items}.${warnings} Suosittelen päivittämään hinnat ja uutiset DataControls-valikosta ennen vahvoja johtopäätöksiä.${dataNote}`;
  }

  // ── Allokaatio / tavoite / poikkeama ─────────────────────────────────────
  if (
    q.includes("allokaatio") ||
    q.includes("tavoite") ||
    q.includes("poikkeama") ||
    q.includes("drift") ||
    q.includes("tasapainot") ||
    q.includes("tasapaino")
  ) {
    const goals = context.goals;
    if (!goals.hasGoals) {
      return `Tavoiteallokaatiota ei ole asetettu. Voit määrittää sen Tavoitteet-osiossa — se mahdollistaa Rebalance Plannerin ja Scenario Simulaattorin hyödyntämisen. Tämä ei ole sijoitussuositus.${dataNote}`;
    }
    const drifts = goals.topDrifts.slice(0, 3);
    if (drifts.length === 0) {
      return `Tavoitteet on asetettu, mutta poikkeamadataa ei löydy. Varmista, että salkussa on omistuksia.${dataNote}`;
    }
    const driftList = drifts
      .map((d) => `${d.label}: tavoite ${d.targetPercent} %, nyt ${d.currentPercent.toFixed(1)} % (${d.driftPercent >= 0 ? "+" : ""}${d.driftPercent.toFixed(1)} pp, ${d.status})`)
      .join("; ");
    return `Tavoiteallokaatiovertailu dashboardin datan mukaan: ${driftList}. ${goals.overweightLabels.length > 0 ? `Ylipaino: ${goals.overweightLabels.join(", ")}.` : ""}${goals.underweightLabels.length > 0 ? ` Alipaino: ${goals.underweightLabels.join(", ")}.` : ""} Tämä on vertailu omiin tavoitteisiisi, ei sijoitussuositus.${dataNote}`;
  }

  // ── Riskit / hajautus ─────────────────────────────────────────────────────
  if (q.includes("riski") || q.includes("hajaut")) {
    const firstSignal = context.riskSignals[0];
    const signalText = firstSignal
      ? `Yksi sääntöpohjainen huomio on: ${firstSignal.label}. ${firstSignal.description}`
      : "Nykyisestä datasta ei noussut selkeitä riskisignaaleja.";
    const stockWeight = getStockWeight(context);
    return `Dashboardin datan perusteella salkun arvo on ${formatCurrency(context.portfolio.totalValue, { currency })} ja osakepaino on ${formatPercent(stockWeight, 1)}. ${signalText} Tämä on sääntöpohjainen havainto, ei sijoitussuositus.${dataNote}`;
  }

  // ── Tänään seurattavaa ────────────────────────────────────────────────────
  if (q.includes("tänään") || q.includes("tanaan") || q.includes("nyt")) {
    const triggered = context.alerts.triggeredAlerts.slice(0, 1).map(describeAlert);
    const topRisk = context.riskSignals.slice(0, 1).map((s) => s.label);
    const topNews = context.news.latestNews.slice(0, 1).map(describeNewsItem);
    const topAction = context.actionSuggestions[0];
    const items = [...triggered, ...topRisk, ...topNews].filter(Boolean);
    const actionStr = topAction
      ? ` Action suggestions ehdottaa: ${topAction.title}.`
      : "";
    if (items.length === 0) {
      return `Dashboardin datasta ei nouse tänään erityistä seurattavaa. Tarkistaisin silti salkun allokaation ja seurantalistan liikkeet.${dataNote}`;
    }
    return `Dashboardin datan perusteella seuraisin tänään: ${items.join("; ")}.${actionStr} Tämä ei ole sijoitussuositus.${dataNote}`;
  }

  // ── Onboarding / käyttöönotto ─────────────────────────────────────────────
  if (
    q.includes("käyttöönotto") ||
    q.includes("kayttoonotto") ||
    q.includes("setup") ||
    q.includes("mitä pitää") ||
    q.includes("mita pitaa") ||
    q.includes("seuraavaksi käyttö") ||
    q.includes("onboarding") ||
    q.includes("luottaa") ||
    q.includes("valmis")
  ) {
    const ob = context.onboarding;
    if (ob.isComplete) {
      return `Käyttöönotto näyttää valmiilta: ${ob.completedSteps}/${ob.totalSteps} vaihetta tehty. Dashboard käyttää oikeaa dataasi. Muista viedä backup säännöllisesti.${dataNote}`;
    }
    const pendingStr =
      ob.pendingTitles.length > 0
        ? ` Puuttuu vielä: ${ob.pendingTitles.slice(0, 3).join(", ")}.`
        : "";
    const nextStr = ob.nextStepTitle ? ` Suosittelen aloittamaan: ${ob.nextStepTitle}.` : "";
    return `Käyttöönotto on kesken: ${ob.completedSteps}/${ob.totalSteps} vaihetta tehty.${pendingStr}${nextStr} Tarkemmat ohjeet löydät dashboardin Käyttöönotto-tarkistuslistasta. Vältä vahvoja johtopäätöksiä kunnes kriittiset vaiheet ovat valmiita.${dataNote}`;
  }

  // ── Skenaario / what-if ───────────────────────────────────────────────────
  if (
    q.includes("skenaario") ||
    q.includes("scenario") ||
    q.includes("what-if") ||
    q.includes("mitä jos") ||
    q.includes("vaikuttais") ||
    q.includes("vaikuttaisi")
  ) {
    const sc = context.scenario;
    if (!sc) {
      return `Aktiivista what-if -skenaariota ei ole valittuna. Aseta skenaario Skenaariosimulaattorissa nähdäksesi arvioidun vaikutuksen.${dataNote}`;
    }
    const sign = sc.valueChange >= 0 ? "+" : "";
    return `Aktiivinen skenaario: "${sc.label}". Jos tämä skenaario toteutuisi, salkun arvo muuttuisi arviolta ${sign}${sc.valueChange.toFixed(0)} € (${sign}${sc.valueChangePercent.toFixed(1)} %). ${sc.summary} Tämä on hypoteettinen arvio, joka ei muuta oikeaa salkkudataa.${sc.warnings.length > 0 ? ` Varoituksia: ${sc.warnings.slice(0, 2).join("; ")}.` : ""}${dataNote}`;
  }

  // ── NVIDIA / symbolikohtainen ─────────────────────────────────────────────
  if (q.includes("nvidia") || q.includes("nvda")) {
    const nvidiaHolding = context.portfolio.topHoldings.find(
      (h) => h.ticker.toUpperCase() === "NVDA"
    );
    const nvidiaWatchlist = context.watchlist.items.find(
      (i) => i.ticker.toUpperCase() === "NVDA"
    );
    const nvidiaNews = getRelatedNews(context).find((item) =>
      item.tickers?.some((t) => t.toUpperCase() === "NVDA")
    );
    if (!nvidiaHolding && !nvidiaWatchlist) {
      return `NVIDIA ei näy nykyisessä salkku- tai watchlist-kontekstissa. Tämä mock-vastaus ei hae markkinadataa ulkoisista lähteistä.`;
    }
    const holdingText = nvidiaHolding
      ? `Salkussa NVIDIA-paino on ${formatPercent(nvidiaHolding.weightPercent, 1)}, päivän muutos ${formatSignedPercent(nvidiaHolding.dayChangePercent)}, kokonaistuotto ${formatSignedPercent(nvidiaHolding.totalReturnPercent)}.`
      : "NVIDIA ei ole suurimpien omistusten joukossa.";
    const watchlistText = nvidiaWatchlist
      ? ` Watchlistillä NVIDIA muutos on ${formatSignedPercent(nvidiaWatchlist.changePercent)}.`
      : "";
    const newsText = nvidiaNews ? ` Uutisnosto: ${describeNewsItem(nvidiaNews)}.` : "";
    return `Portfolio insights -datan perusteella: ${holdingText}${watchlistText}${newsText} Tarkastelisin erityisesti, onko yksittäisen teknologiaomistuksen paino kasvanut liian suureksi. Tämä ei ole sijoitussuositus.${dataNote}`;
  }

  // ── Yleinen fallback ──────────────────────────────────────────────────────
  const topInsight = context.portfolioInsights[0];
  const topAction = context.actionSuggestions[0];
  const largestHolding = getLargestHolding(context);

  const insightStr = topInsight
    ? `Portfolio insights nostaa: ${topInsight.title} — ${topInsight.description}.`
    : `Salkun arvo on ${formatCurrency(context.portfolio.totalValue, { currency })}.`;
  const actionStr = topAction ? ` Ehdotettu seuraava tarkistus: ${topAction.title}.` : "";
  const holdingStr = largestHolding
    ? ` Suurin omistus on ${largestHolding.name} (${formatPercent(largestHolding.weightPercent, 1)}).`
    : "";

  return `${insightStr}${holdingStr}${actionStr} Tämä on mock-vastaus — ei sijoitussuositus.${dataNote}`;
}
