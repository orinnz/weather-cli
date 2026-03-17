# cli-weather

A beautiful, AI-powered weather CLI with smart fallbacks. Get instant weather insights for any city worldwide.

![npm](https://img.shields.io/npm/v/@anonydev3/weather-cli)
![npm](https://img.shields.io/npm/dm/@anonydev3/weather-cli)
![GitHub](https://img.shields.io/github/license/orinnz/weather-cli)

## ⚡ Quick Start

**Install globally:**
```bash
npm install -g @anonydev3/weather-cli
```

**Check weather instantly:**
```bash
cli-weather "New York"
cli-weather "Tokyo"
cli-weather "London" --forecast
```

**Ask AI questions:**
```bash
cli-weather "Hanoi" --ask "Can I go for a walk tomorrow?"
cli-weather "Paris" --ask "Should I bring an umbrella?" --when tomorrow
```

That's it! No API keys or setup required. 🎉

---

## Features

✅ **Instant weather** - Current conditions for any city  
✅ **3-day forecast** - With `-f` or `--forecast` flag  
✅ **AI insights** - Smart recommendations via Gemini AI  
✅ **Ask mode** - Natural language weather questions  
✅ **Smart fallbacks** - Works even when AI quota is exceeded  
✅ **Location aliases** - Save favorites with `--save home`  
✅ **No setup needed** - Works out of the box  
✅ **Cached responses** - Faster repeat queries  

---

## Usage Examples

### Basic Weather
```bash
cli-weather "Ho Chi Minh City"
cli-weather "Berlin" --units imperial
```

### With Forecast
```bash
cli-weather "Tokyo" --forecast
cli-weather "Sydney" -f
```

### Ask AI Questions
```bash
cli-weather "Hanoi" --ask "Can I go for a walk tomorrow?"
cli-weather "London" --ask "Should I bring an umbrella?" --when tomorrow
cli-weather "Paris" --ask "Is it good weather for cycling?" --date 2026-03-20
```

### Quick Date Check
```bash
cli-weather "Bangkok" --date-check 2026-03-18
cli-weather "Seoul" --when tomorrow --date-check
```

### Save Favorite Locations
```bash
cli-weather "Hanoi" --save home
cli-weather "home" --ask "Can I run outside?"
cli-weather --list-saved
cli-weather --remove home
```

### Full Options
```bash
cli-weather --help
```

---

## CLI Options

| Option | Description |
|--------|-------------|
| `-a, --ask "question"` | Ask Gemini a weather question |
| `--when <date>` | Natural date: `today`, `tomorrow`, `monday`, or `YYYY-MM-DD` |
| `--date <YYYY-MM-DD>` | Specific date for ask mode |
| `--date-check` | Quick weather check for a date |
| `--save <alias>` | Save location with alias (e.g., `--save home`) |
| `--list-saved` | List all saved aliases |
| `--remove <alias>` | Remove saved alias |
| `-u, --units` | `metric` (default) or `imperial` |
| `-f, --forecast` | Show 3-day forecast |
| `--no-color` | Disable ANSI colors |
| `-h, --help` | Show help |

---

## Output Examples

### Current Weather
```
[ Weather for Hanoi, Hanoi, Vietnam ]
----------------------------------------------------------------
Condition:         Overcast, warm, and humid
AI Summary:        Hanoi is experiencing warm, overcast conditions...
AI Recommendation: Stay hydrated and enjoy the comfortable weather.
AI Outfit Tip:     Wear light, breathable clothing.
Source:            AI
----------------------------------------------------------------
Temperature:       26.7 C
Feels like:        27.9 C
Humidity:          61%
Wind Speed:        17.4 km/h
...
```

### AI Q&A
```
[ Gemini Q&A ]
----------------------------------------------------------------
Question:          Can I go for a walk tomorrow?
Target Date:       2026-03-18
Answer:            Yes, tomorrow looks suitable for a walk with 
                   overcast skies and temperatures from 20-28.5°C.
Source:            AI
```

---

## For Contributors & Developers

### Local Development

**Clone and install:**
```bash
git clone https://github.com/orinnz/weather-cli.git
cd weather-cli
pnpm install
```

**Run locally:**
```bash
pnpm start -- "London"
pnpm start -- "Tokyo" --forecast
pnpm start -- "Hanoi" --ask "Can I walk tomorrow?"
```

**Development mode:**
```bash
pnpm run dev        # Watch mode
pnpm run build      # Build only
pnpm run check      # Type check
pnpm test           # Run tests
```

### Environment Variables (Optional)

Create a `.env` file for local development:

```bash
# Your Gemini API key (optional - has fallback mode)
GEMINI_API_KEY=your_api_key_here

# Custom AI proxy URL (optional)
WEATHER_API_BASE_URL=https://your-proxy.workers.dev
WEATHER_API_TOKEN=your_proxy_token

# Model override (optional)
GEMINI_MODEL=gemini-2.5-flash
```

**Note:** The CLI works without any env variables using the hosted proxy.

### Deploy Your Own Proxy (Optional)

If you want to use your own Gemini API key:

1. **Setup Cloudflare Worker:**
```bash
cd cloudflare-worker
npm i -g wrangler
wrangler login
wrangler secret put GEMINI_API_KEY
wrangler deploy
```

2. **Configure CLI:**
```bash
# .env
WEATHER_API_BASE_URL=https://weather-cli-proxy.<your-subdomain>.workers.dev
```

---

## Tech Stack

- **Runtime:** Node.js 18+ (ESM)
- **Language:** TypeScript
- **Weather API:** Open-Meteo (free, no key required)
- **Geocoding:** Open-Meteo Geocoding
- **AI:** Google Gemini 2.5 Flash
- **Proxy:** Cloudflare Workers
- **Caching:** Local JSON cache

---

## License

MIT © [Phuoc](https://github.com/orinnz/weather-cli)
