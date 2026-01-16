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
  googleCloud: {
    // For Google Cloud Vision API:
    // 1. Create a project at https://console.cloud.google.com
    // 2. Enable Vision API
    // 3. Create a service account and download JSON key
    // 4. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to the JSON file path
    //    (This should be set as a system environment variable, not in .env.local)
    projectId: getEnvVar("GOOGLE_CLOUD_PROJECT_ID"),
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

  return {
    valid: errors.length === 0,
    errors,
  };
}
