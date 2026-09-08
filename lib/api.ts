import Constants from "expo-constants";
import { Platform } from "react-native";

// Expo Router API routes (app/api/**/+api.ts) are served by the same Metro
// dev server as the app. On web that's same-origin, so a relative fetch
// works. On native there's no "origin" to resolve against, so we build an
// absolute URL from the dev server's host — or from EXPO_PUBLIC_API_URL in
// a production build, where there is no dev server to ask.
function getBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === "web") return "";
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `http://${hostUri}` : "";
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status}`);
  }
  return response.json();
}
