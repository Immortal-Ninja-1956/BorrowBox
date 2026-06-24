import { trpc } from "@/lib/trpc";
import { useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const utils = trpc.useUtils();
  const clearSession = trpc.auth.clearSession.useMutation();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Listen to ALL auth state changes including INITIAL_SESSION.
    // After a Google OAuth redirect, Supabase fires "INITIAL_SESSION" (not "SIGNED_IN")
    // once it has parsed the access token from the URL hash. At that point
    // main.tsx's fetch wrapper can already read session?.access_token and will
    // attach the Bearer header automatically, so we just need to invalidate/refetch.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED"
      ) {
        // Invalidate so that the next call re-runs with the fresh Bearer token
        // that main.tsx will inject from supabase.auth.getSession().
        utils.auth.me.invalidate();
      } else if (event === "SIGNED_OUT") {
        try {
          await clearSession.mutateAsync();
        } catch (err) {
          console.error("Failed to clear session cookie:", err);
        }
        utils.auth.me.setData(undefined, null);
        utils.auth.me.invalidate();
      }
    });
    return () => subscription.unsubscribe();
  }, [utils]); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    try {
      await clearSession.mutateAsync();
    } catch (err) {
      console.error("Failed to clear session cookie during logout:", err);
    }
    await supabase.auth.signOut();
    utils.auth.me.setData(undefined, null);
    utils.auth.me.invalidate();
  }, [utils, clearSession]);

  const state = useMemo(() => {
    const isLoading = meQuery.isLoading;
    return {
      user: meQuery.data ?? null,
      loading: isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
