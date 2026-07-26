import { createApiClient } from "@supercalorie/core";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "sc_session_token";

/**
 * Where the Next.js backend lives. Set EXPO_PUBLIC_API_URL to your machine's
 * LAN address (e.g. http://192.168.1.20:3000) when running on a physical
 * device — `localhost` there refers to the phone itself.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  // The Android emulator reaches the host machine through 10.0.2.2.
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");

/**
 * Reading the keychain is async, but `<Image>` needs its auth header at
 * render time, so the token is also held in memory once it's known.
 */
let cachedToken: string | null = null;

export const tokenStore = {
  async get(): Promise<string | null> {
    return (cachedToken ??= await SecureStore.getItemAsync(TOKEN_KEY));
  },
  async set(token: string): Promise<void> {
    cachedToken = token;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    cachedToken = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

/**
 * Source for a meal photo. Photos are behind auth, so unlike the web —
 * where the cookie rides along automatically — the token has to be attached
 * to the image request by hand.
 */
export function photoSource(photoId: string) {
  return {
    uri: `${API_URL}/api/photos/${photoId}`,
    headers: cachedToken ? { Authorization: `Bearer ${cachedToken}` } : undefined,
  };
}

/**
 * React Native has no dependable shared cookie jar, so mobile authenticates
 * with the bearer token the API returns at login and keeps it in the device
 * keychain rather than AsyncStorage.
 */
export const api = createApiClient({
  baseUrl: API_URL,
  getToken: tokenStore.get,
});
