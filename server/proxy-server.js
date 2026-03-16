#!/usr/bin/env node

import "dotenv/config";
import { createServer } from "node:http";
import { GoogleGenAI } from "@google/genai";

const PORT = Number(process.env.WEATHER_PROXY_PORT ?? "8787");
const API_KEY = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
const ACCESS_TOKEN = process.env.WEATHER_PROXY_TOKEN;

if (!API_KEY) {
  console.error("Missing GEMINI_API_KEY or GOOGLE_API_KEY for proxy server.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-weather-token"
  });
  res.end(body);
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-weather-token"
    });
    res.end();
    return;
  }

  if (req.url !== "/v1/ask" || req.method !== "POST") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (ACCESS_TOKEN) {
    const token = req.headers["x-weather-token"];
    if (token !== ACCESS_TOKEN) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
    if (raw.length > 1024 * 1024) {
      req.destroy(new Error("Payload too large"));
    }
  });

  req.on("error", () => {
    sendJson(res, 400, { error: "Request stream error" });
  });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(raw);
      const prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
      const model = typeof parsed.model === "string" && parsed.model.trim().length > 0
        ? parsed.model
        : DEFAULT_MODEL;

      if (!prompt || prompt.trim().length === 0) {
        sendJson(res, 400, { error: "Missing prompt" });
        return;
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt
      });

      const text = typeof response.text === "string" ? response.text.trim() : "";
      sendJson(res, 200, { text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 500, { error: message });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Weather AI proxy listening on http://localhost:${PORT}`);
});
