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
