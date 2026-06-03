# Investment OS

Henkilökohtainen AI-sijoitusdashboard. Analyysi- ja seurantatyökalu – ei sijoitusneuvontaa.

## Käynnistys lokaalisti

```bash
npm install
cp .env.example .env.local   # täytä haluamasi API-avaimet
npm run dev
```

Avaa http://localhost:3000.

App toimii täysin ilman API-avaimia mock-datalla.

## Ympäristömuuttujat

Lisää `.env.local`-tiedostoon. Avaimia ei lähetetä koskaan client-bundleen.

| Muuttuja | Tarkoitus | Pakollinen |
|---|---|---|
| `OPENAI_API_KEY` | AI-agentti (gpt-4o-mini) | Ei – mock fallback |
| `MARKET_DATA_API_KEY` | Markkinahinnat (Twelve Data) | Ei – mock fallback |
| `MARKETAUX_API_KEY` | Uutiset (Marketaux) | Ei – mock fallback |

Mock fallback aktivoituu automaattisesti jos avain puuttuu tai API-kutsu epäonnistuu.
API-avainten tila näkyy dashboardissa: **Data → API & Asetukset**.

Valuuttakurssit haetaan server-puolella ECB:n euro foreign exchange reference rates -lähteestä (`/api/fx/rates`). API-avainta ei tarvita. Jos live-haku epäonnistuu, app käyttää staattisia EUR-pohjaisia fallback-kursseja.

## Deploy – Vercel

1. Push repo GitHubiin
2. Luo uusi projekti Vercelissä (Import Git Repository)
3. Lisää env-muuttujat Vercel-projektin Settings → Environment Variables:
   - `OPENAI_API_KEY`
   - `MARKET_DATA_API_KEY`
   - `MARKETAUX_API_KEY`
4. Deploy

Huomioita:
- Next.js App Router tunnistetaan automaattisesti
- API routet deployataan serverless-funktioina
- `.env.local` ei koskaan mene GitHubiin tai Verceliin – vain Vercel-projektiin erikseen syötetyt muuttujat

## Arkkitehtuuri

```
src/
├── app/
│   ├── page.tsx               # pääsivu, kaikki tila useInvestmentData-hookilla
│   ├── layout.tsx             # PWA metadata, manifest
│   ├── error.tsx              # error boundary
│   ├── not-found.tsx          # 404
│   ├── loading.tsx            # loading state
│   └── api/
│       ├── agent/             # OpenAI Chat, mock fallback
│       ├── news/              # Marketaux, mock fallback
│       ├── fx/rates/          # ECB live FX, static fallback
│       ├── market/quotes/     # Twelve Data, mock fallback
│       └── config/status/     # API-avainten tila (ei avaimia)
├── components/                # UI-komponentit
└── lib/                       # bisneslogiikka, providerit, tyypit
```

## localStorage

Kaikki käyttäjädata tallennetaan **paikallisesti selaimeen**. Data ei lähde palvelimelle.

| Avain | Sisältö |
|---|---|
| `investment-os:portfolio` | Omistukset ja käteinen |
| `investment-os:watchlist` | Seurantalista |
| `investment-os:alerts` | Hintahälytykset |
| `investment-os:news` | Uutiset |
| `investment-os:data-status` | Datalähteen tila |
| `investment-os:fx-rates` | Viimeksi haetut EUR-pohjaiset FX-kurssit |
| `investment-os:assistant-chat` | Chat-historia |

Data → **Vie täysi backup** lataa kaiken datan JSON-backup-tiedostona. Data → **Palauta backup** palauttaa aiemman backup-tiedoston. Data → Resetoi palauttaa demo-tilan.

## Suositeltu käyttöönottojärjestys

1. **Lisää API-avaimet** — `.env.local` tai Vercel Environment Variables
2. **Käynnistä sovellus** — `npm run dev`
3. **Päivitä valuuttakurssit** — Data → Päivitä valuuttakurssit (ECB, ei API-avainta)
4. **Tuo transaktiot** — Tapahtumat → Tuo CSV → Nordnet CSV tai Investment OS CSV
5. **Päivitä hinnat** — Data → Päivitä hinnat (vaatii MARKET_DATA_API_KEY)
6. **Päivitä uutiset** — Data → Päivitä uutiset (vaatii MARKETAUX_API_KEY)
7. **Määritä tavoiteallokaatio** — Tavoitteet → Muokkaa (Rebalance Plannerille ja Scenario Simulaattorille)
8. **Vie backup** — Data → Vie täysi backup

Dashboard näyttää Käyttöönotto-tarkistuslistan kunnes kaikki kriittiset vaiheet on tehty.

## Transaktioiden tuonti

### Investment OS CSV

Oma CSV-muoto. Lataa malli **Tapahtumat → Tuo CSV → Lataa malli**.

```
type,symbol,name,quantity,price,amount,currency,date,note
buy,NVDA,NVIDIA,2,900,1800,EUR,2026-01-05,
```

Sarakkeet:
| Sarake | Arvo |
|---|---|
| type | buy / sell / deposit / withdrawal / dividend / fee |
| symbol | Ticker (pakollinen buy/sell/dividend) |
| quantity | Kappalemäärä (buy/sell) |
| price | Yksikköhinta (buy/sell) |
| amount | Kokonaissumma (positiivinen) |
| currency | EUR / USD / SEK / NOK / GBP |
| date | YYYY-MM-DD |

### Nordnet CSV (kokeellinen)

Tuo tapahtumat suoraan Nordnetin export-CSV:stä ilman muunnoksia.

1. Nordnet → Tapahtumat → Vie CSV
2. Transactions → Tuo CSV → valitse **Nordnet CSV**
3. Valitse tiedosto tai liitä CSV-teksti
4. Tarkista preview: validit rivit, virherivit, duplikaatit
5. Paina "Tuo transaktiot"

Tuetut sarake-erottimet: sarkain (`\t`), puolipiste (`;`), pilkku (`,`)  
Tuetut sarakkeet: suomi ja englanti  
Tuettu päivämäärämuoto: `YYYY-MM-DD` ja `PP.KK.VVVV`  
Tuettu lukumuoto: suomalainen pilkkudesimaalit

**Suositus: ota backup ennen suurta tuontia** (Data → Vie täysi backup).

## Backup & palautus

Investment OS tallentaa kaiken datan selaimeen (localStorage). Datan varmuuskopiointi on suositeltavaa ennen selaimen vaihtoa tai selainhistorian tyhjennystä.

### Backup-export

**Data → Vie täysi backup** lataa tiedoston `investment-os-backup-YYYY-MM-DD.json`.

Backup sisältää:
- Portfolio (omistukset ja käteistilit)
- Watchlist
- Hintahälytykset
- Uutiset
- Transaktiot
- Tavoitteet ja allokaatiotavoitteet
- Data-statukset (FX-lähde ym.)
- FX-kurssit

**Backup ei sisällä API-avaimia.** API-avaimet ovat palvelimen ympäristömuuttujia eivätkä koskaan päädy client-bundleen tai backupiin.

### Restore-flow

1. **Data → Palauta backup**
2. Valitse JSON-tiedosto tai liitä backup-JSON
3. Sovellus validoi tiedoston (versio, rakenne)
4. Tarkista esikatselu (omistukset, watchlist, transaktiot jne.)
5. Lue varoitus: **palautus korvaa nykyisen paikallisen datan**
6. Ruksaa vahvistusruutu ja paina "Palauta backup"

### Versioning

Backup-formaatti on versioitu (nykyinen versio: `1`). Eri versioinen backupin lataaminen näyttää selkeän virheilmoituksen.

## PWA

App on asennettu kotinäytölle tai työpöydälle selaimella.

**TODO:** Vaihda `public/icon-192.png` ja `public/icon-512.png` oikeisiin ikoneihin.
Tällä hetkellä käytössä ovat solid `#050817` placeholder-ikonit.

## Disclaimer

Investment OS on henkilökohtainen analyysi- ja seurantatyökalu, ei sijoitusneuvonta.
Sovellus ei anna osto-, myynti- tai pidäsuosituksia. Käyttäjä on itse vastuussa
sijoituspäätöksistään.
