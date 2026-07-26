import { trpc } from "@/lib/trpc";
import { useCallback, useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ALLOWED_DOMAIN = "@vitstudent.ac.in";

export function useAuth() {
  const utils = trpc.useUtils();
  const clearSession = trpc.auth.clearSession.useMutation();
  const [, setLocation] = useLocation();
  const [sessionReady, setSessionReady] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 1,
    retryDelay: 500,
    refetchOnWindowFocus: false,
    // Only fire the auth.me query once we know whether Supabase has a session.
    // This prevents the "null poisoning" bug where an early tokenless request
    // caches null and isAuthenticated stays false even after login.
    enabled: sessionReady,
  });

  useEffect(() => {
    // On mount, check if Supabase already has a persisted session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Reject persisted sessions from non-VIT emails
        const email = session.user?.email?.toLowerCase() ?? "";
        if (!email.endsWith(ALLOWED_DOMAIN)) {
          supabase.auth.signOut();
          return;
        }
        setSessionReady(true);
      }
      setInitialCheckDone(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "PASSWORD_RECOVERY"
      ) {
        if (session) {
          // Domain gate: reject non-VIT emails immediately after OAuth redirect
          const email = session.user?.email?.toLowerCase() ?? "";
          if (!email.endsWith(ALLOWED_DOMAIN)) {
            toast.error(`Only ${ALLOWED_DOMAIN} college emails are allowed.`);
            await supabase.auth.signOut();
            window.location.href = "/login";
            return;
          }
          setSessionReady(true);
          // Small delay to ensure session is written to sessionStorage
          // before the tRPC fetch wrapper reads it via getSession()
          await new Promise((r) => setTimeout(r, 50));
          utils.auth.me.invalidate();
        }
      } else if (event === "SIGNED_OUT") {
        setSessionReady(false);
        try {
          await clearSession.mutateAsync();
        } catch (err) {
          console.error("Failed to clear session cookie:", err);
        }
        utils.auth.me.setData(undefined, null);
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
    setSessionReady(false);
    await supabase.auth.signOut();
    utils.auth.me.setData(undefined, null);
  }, [utils, clearSession]);

  // Strict 10-minute inactivity auto-logout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      if (sessionReady) {
        timeoutId = setTimeout(() => {
          logout();
          toast.error("Session expired due to inactivity. Please log in again.");
          setLocation("/login?expired=true");
        }, 10 * 60 * 1000); // 10 minutes
      }
    };

    if (sessionReady) {
      resetTimer();
      // Listen for user activity
      window.addEventListener("mousemove", resetTimer);
      window.addEventListener("keydown", resetTimer);
      window.addEventListener("click", resetTimer);
      window.addEventListener("scroll", resetTimer);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [sessionReady, logout, setLocation]);

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setSessionReady(true);
      // Small delay so sessionStorage is ready
      await new Promise((r) => setTimeout(r, 50));
    }
    return meQuery.refetch();
  }, [meQuery]);

  const state = useMemo(() => {
    // Still loading if:
    // 1. We haven't checked Supabase for an existing session yet, OR
    // 2. We know there IS a session but auth.me hasn't returned its first fetch yet
    const isLoading =
      !initialCheckDone ||
      (sessionReady && meQuery.isLoading);

    return {
      user: meQuery.data ?? null,
      loading: isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    initialCheckDone,
    sessionReady,
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
  ]);

  return {
    ...state,
    refresh,
    logout,
  };
}
