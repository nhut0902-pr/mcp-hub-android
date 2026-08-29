import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn("[Supabase] Missing public configuration; Auth UI will show a configuration error.");
}

const noopStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

const webStorage = typeof window === "undefined"
  ? noopStorage
  : {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => window.localStorage.setItem(key, value),
      removeItem: async (key: string) => window.localStorage.removeItem(key),
    };

export const supabase = createClient(
  supabaseUrl ?? "https://invalid.supabase.co",
  supabasePublishableKey ?? "invalid-publishable-key",
  {
    auth: {
      storage: Platform.OS === "web" ? webStorage : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web" && typeof window !== "undefined",
      flowType: "pkce",
    },
  },
);

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}
