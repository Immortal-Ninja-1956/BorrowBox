import { trpc } from "@/lib/trpc";
import { useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const utils = trpc.useUtils();
  const syncSession = trpc.auth.syncSession.useMutation();
  const clearSession = trpc.auth.clearSession.useMutation();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.access_token) {
          try {
            await syncSession.mutateAsync({ accessToken: session.access_token });
          } catch (err) {
            console.error("Failed to sync session cookie:", err);
          }
        }
        utils.auth.me.invalidate();
      } else if (event === "SIGNED_OUT") {
        try {
          await clearSession.mutateAsync();
        } catch (err) {
          console.error("Failed to clear session cookie:", err);
        }
        utils.auth.me.invalidate();
      }
    });
    return () => subscription.unsubscribe();
  }, [utils, syncSession, clearSession]);

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
