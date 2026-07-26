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

export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

/**
 * React Native has no dependable shared cookie jar, so mobile authenticates
 * with the bearer token the API returns at login and keeps it in the device
 * keychain rather than AsyncStorage.
 */
export const api = createApiClient({
  baseUrl: API_URL,
  getToken: tokenStore.get,
});
