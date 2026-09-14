import axios from "axios";
import crypto from "crypto";
import { config } from "../config";

/** Mobile session auth for scrobbling. */
export async function getSessionKey(): Promise<string | null> {
  try {
    if (!config.lastfm.apiKey || config.lastfm.apiKey === "") {
      throw new Error("Last.fm API key not configured");
    }
    if (!config.lastfm.apiSecret || config.lastfm.apiSecret === "") {
      throw new Error("Last.fm API secret not configured");
    }
    if (!config.lastfm.username || config.lastfm.username === "") {
      throw new Error("Last.fm username not configured");
    }
    if (!config.lastfm.password || config.lastfm.password === "") {
      throw new Error("Last.fm password not configured");
    }

    const apiSig = crypto
      .createHash("md5")
      .update(
        `api_key${config.lastfm.apiKey}methodauth.getMobileSessionpassword${config.lastfm.password}username${config.lastfm.username}${config.lastfm.apiSecret}`
      )
      .digest("hex");

    const response = await axios.post(
      "https://ws.audioscrobbler.com/2.0/",
      null,
      {
        params: {
          method: "auth.getMobileSession",
          username: config.lastfm.username,
          password: config.lastfm.password,
          api_key: config.lastfm.apiKey,
          api_sig: apiSig,
          format: "json",
        },
      }
    );

    if (response.data?.error) {
      console.error(
        "Last.fm API error:",
        response.data.error,
        response.data.message
      );
      throw new Error(
        `Last.fm authentication failed: ${
          response.data.message || response.data.error
        }`
      );
    }

    const sessionKey = response.data?.session?.key;
    if (!sessionKey) {
      throw new Error("No session key returned from Last.fm");
    }

    return sessionKey;
  } catch (error: any) {
    console.error("Error getting Last.fm session:", error);
    if (error.response?.data) {
      console.error("Last.fm API response:", error.response.data);
    }
    throw error;
  }
}
