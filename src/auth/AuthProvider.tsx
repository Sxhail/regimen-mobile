import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import type { Session, User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "../lib/supabase";

type AuthContextValue = {
  isConfigured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function exchangeCodeFromUrl(url: string) {
  if (!supabase) {
    return;
  }

  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  if (typeof code === "string" && code.length > 0) {
    await supabase.auth.exchangeCodeForSession(code);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        exchangeCodeFromUrl(url).catch(() => {});
      }
    });
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      exchangeCodeFromUrl(url).catch(() => {});
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error("Supabase is not configured yet.");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error("Supabase is not configured yet.");
    }

    const emailRedirectTo = Linking.createURL("auth");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) {
      throw error;
    }

    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    }),
    [loading, session, signInWithPassword, signOut, signUpWithPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
