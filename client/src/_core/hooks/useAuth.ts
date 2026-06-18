import { trpc } from "@/lib/trpc";
import { useCallback, useMemo, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        utils.auth.me.invalidate();
      }
    });
    return () => subscription.unsubscribe();
  }, [utils]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    utils.auth.me.setData(undefined, null);
    utils.auth.me.invalidate();
  }, [utils]);

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
