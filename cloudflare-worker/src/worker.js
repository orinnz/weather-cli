function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-weather-token",
      ...extraHeaders
    }
  });
}

function getModelFromPayload(payload, env) {
  if (payload && typeof payload.model === "string" && payload.model.trim().length > 0) {
    return payload.model.trim();
  }
  if (env.GEMINI_MODEL && env.GEMINI_MODEL.trim().length > 0) {
    return env.GEMINI_MODEL.trim();
  }
  // Use gemini-2.5-flash - latest stable model
  return "gemini-2.5-flash";
}

function getModelEndpoint(model) {
  // Handle different model name formats
  if (model.startsWith("models/")) {
    return model;
  }
  if (model.startsWith("gemini-")) {
    return `models/${model}`;
  }
  return `models/${model}`;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "POST, OPTIONS",
          "access-control-allow-headers": "content-type, x-weather-token"
        }
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/v1/ask" || request.method !== "POST") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim().length === 0) {
      return jsonResponse({ error: "Missing GEMINI_API_KEY secret" }, 500);
    }

    if (env.WEATHER_PROXY_TOKEN && env.WEATHER_PROXY_TOKEN.trim().length > 0) {
      const token = request.headers.get("x-weather-token");
      if (token !== env.WEATHER_PROXY_TOKEN) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const prompt = payload && typeof payload.prompt === "string" ? payload.prompt.trim() : "";
    if (!prompt) {
      return jsonResponse({ error: "Missing prompt" }, 400);
    }

    const model = getModelFromPayload(payload, env);
    const modelEndpoint = getModelEndpoint(model);

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelEndpoint}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ]
          })
        }
      );

      const data = await geminiRes.json();

      if (!geminiRes.ok) {
        const message = data && data.error && data.error.message ? data.error.message : "Gemini request failed";
        return jsonResponse({ error: message }, geminiRes.status);
      }

      const text =
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0] &&
        typeof data.candidates[0].content.parts[0].text === "string"
          ? data.candidates[0].content.parts[0].text.trim()
          : "";

      return jsonResponse({ text }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return jsonResponse({ error: message }, 500);
    }
  }
};
