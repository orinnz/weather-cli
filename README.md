# cli-weather

A simple Node.js command-line app to check the current weather in a specific location.

## Features

- Search weather by city/location name
- Supports `metric` and `imperial` units
- Optional 3-day forecast mode
- Local file cache for faster repeated weather/location lookups
- Gemini AI weather insights with source tag (`AI` or `Fallback`)
- Gemini question mode for practical yes/no recommendations
- Natural date support with `--when` (`today`, `tomorrow`, weekdays)
- Saved location aliases (`--save`, `--list-saved`, `--remove`)
- Uses Open-Meteo APIs (no API key required)

## Requirements

- Node.js 18+

## Setup

```bash
npm install
```

Optional Gemini configuration:

```bash
# .env file (auto-loaded)
GEMINI_API_KEY=your_api_key_here

# Optional model override
GEMINI_MODEL=gemini-2.0-flash
```

If no Gemini API key is provided, the app falls back to built-in weather descriptions.

## Proxy Mode (Users Run Immediately)

If you want users to run without providing their own Gemini key, host the included proxy server with your key.

1. Start proxy server:

```bash
pnpm proxy:start
```

2. Configure CLI to use proxy:

```bash
# .env
WEATHER_API_BASE_URL=http://localhost:8787
# Optional token if you set WEATHER_PROXY_TOKEN on server
WEATHER_API_TOKEN=your_proxy_token
```

When `WEATHER_API_BASE_URL` is set, CLI uses proxy first and falls back to local Gemini key only if available.

### Cloudflare Worker Deploy

Worker files are included in `cloudflare-worker/`.

1. Install and login:

```bash
npm i -g wrangler
wrangler login
```

2. Deploy worker:

```bash
cd cloudflare-worker
wrangler secret put GEMINI_API_KEY
# Optional extra protection token
wrangler secret put WEATHER_PROXY_TOKEN
wrangler deploy
```

3. Configure CLI client `.env`:

```bash
WEATHER_API_BASE_URL=https://weather-cli-proxy.<your-subdomain>.workers.dev
WEATHER_API_TOKEN=<same WEATHER_PROXY_TOKEN value>
```

4. Test:

```bash
pnpm start -- "hanoi" --ask "Can I run today?"
```

## Usage

Build and run:

```bash
npm start -- "London"
```

Build only:

```bash
npm run build
```

## CLI options

- `-a, --ask` Ask a weather question to Gemini (ask mode)
- `--date` Optional date for ask mode in `YYYY-MM-DD`
- `--date-check` Quick weather check for a specific date in `YYYY-MM-DD`
- `--when` Natural date: `today`, `tomorrow`, weekday names, or `YYYY-MM-DD`
- `--save` Save alias for location
- `--list-saved` Show all saved aliases
- `--remove` Delete saved alias
- `-u, --units` Set units: `metric` (default) or `imperial`
- `-f, --forecast` Show 3-day forecast
- `--no-color` Disable ANSI colors
- `-h, --help` Show help

## Examples

```bash
npm start -- Tokyo
npm start -- "San Francisco" --units imperial
npm start -- Hanoi --forecast
npm start -- Hanoi --ask "Can I go for a walk tomorrow?"
npm start -- Hanoi --ask "Should I cycle outside?" --date 2026-03-18
npm start -- Hanoi --date-check 2026-03-18
npm start -- Hanoi --ask "Can I go for a walk?" --when tomorrow
npm start -- Hanoi --save home
npm start -- home --ask "Should I run?"
npm start -- --list-saved
```
# weather-cli
