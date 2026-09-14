// API Configuration
// Uses environment variables from .env.local file
// Copy .env.example to .env.local and fill in your values

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    console.warn(`Warning: ${name} is not set. Some features may not work.`);
  }
  return value || defaultValue || "";
}

export const config = {
  lastfm: {
    apiKey: getEnvVar("LASTFM_API_KEY"),
    apiSecret: getEnvVar("LASTFM_API_SECRET"),
    username: getEnvVar("LASTFM_USERNAME"),
    password: getEnvVar("LASTFM_PASSWORD"),
  },
  discogs: {
    userToken: getEnvVar("DISCOGS_USER_TOKEN"),
    username: getEnvVar("DISCOGS_USERNAME"),
  },
  gemini: {
    // https://aistudio.google.com/app/apikey
    apiKey: getEnvVar("GEMINI_API_KEY"),
    /**
     * Vision model for cover ID.
     * Default: gemini-3.5-flash-lite (current Flash-Lite as of Aug 2026).
     * Cheaper alt: gemini-3.1-flash-lite (official 2.5-flash-lite replacement).
     * Higher accuracy: gemini-3.6-flash or gemini-3.7-flash.
     * Note: gemini-2.5-flash-lite retires ~Oct 2026 — do not use as default.
     */
    visionModel: getEnvVar("GEMINI_VISION_MODEL", "gemini-3.5-flash-lite"),
  },
};

// Validate required configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.lastfm.apiKey || config.lastfm.apiKey === "") {
    errors.push("LASTFM_API_KEY is required");
  }
  if (!config.lastfm.apiSecret || config.lastfm.apiSecret === "") {
    errors.push("LASTFM_API_SECRET is required");
  }
  if (!config.lastfm.username || config.lastfm.username === "") {
    errors.push("LASTFM_USERNAME is required");
  }
  if (!config.lastfm.password || config.lastfm.password === "") {
    errors.push("LASTFM_PASSWORD is required");
  }
  if (!config.discogs.userToken || config.discogs.userToken === "") {
    errors.push("DISCOGS_USER_TOKEN is required");
  }
  if (!config.discogs.username || config.discogs.username === "") {
    errors.push("DISCOGS_USERNAME is required");
  }
  if (!config.gemini.apiKey || config.gemini.apiKey === "") {
    errors.push("GEMINI_API_KEY is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
