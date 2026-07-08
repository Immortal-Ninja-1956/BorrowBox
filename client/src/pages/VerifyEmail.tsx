import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Loader2, CheckCircle, Mail, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [status, setStatus] = useState<"loading" | "verified" | "pending">("loading");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // There are two ways users end up here:
    //
    // 1. REDIRECT FROM EMAIL LINK: Supabase redirects here with a hash fragment
    //    (#access_token=...&type=signup). The Supabase client picks this up
    //    automatically and fires an auth state change. If we detect a valid
    //    session, the email is verified.
    //
    // 2. REDIRECT FROM REGISTER PAGE: After signing up, the user is sent here
    //    with ?email=... to show a "check your email" message.

    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // User clicked the confirmation link and was signed in
        setStatus("verified");
        await refresh();
      } else if (event === "INITIAL_SESSION" && session) {
        // Already has a session — email is verified
        setStatus("verified");
        await refresh();
      } else if (event === "INITIAL_SESSION" && !session) {
        // No session — show the "check your email" pending state
        setStatus("pending");
      }
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      setStatus(prev => (prev === "loading" ? "pending" : prev));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResendEmail = async () => {
    if (!email) {
      toast.error("No email address to resend to");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email resent!");
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Checking verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setLocation("/")}
          >
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-accent-foreground" />
            </div>
            <span className="text-2xl font-bold text-accent">BorrowBox</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-8">
          {status === "verified" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Email Verified!
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Your email has been verified successfully. You're all set to
                start using BorrowBox.
              </p>
              <Button
                onClick={() => setLocation("/marketplace")}
                className="w-full bg-accent"
              >
                Go to Marketplace
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Check Your Email
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                {email ? (
                  <>
                    We sent a verification link to{" "}
                    <strong className="text-foreground">{email}</strong>. Click
                    the link in the email to verify your account.
                  </>
                ) : (
                  <>
                    We sent a verification link to your email. Click the link to
                    verify your account.
                  </>
                )}
              </p>

              <div className="bg-muted/50 border border-border/50 p-4 rounded-lg text-xs text-muted-foreground text-left mb-6 space-y-2">
                <p>• The email may take a minute to arrive</p>
                <p>• Check your spam/junk folder if you don't see it</p>
                <p>• The link expires after 24 hours</p>
              </div>

              {email && (
                <Button
                  variant="outline"
                  className="w-full mb-3"
                  onClick={handleResendEmail}
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              )}

              <p className="text-center text-sm text-muted-foreground mt-4">
                Wrong email?{" "}
                <button
                  className="text-accent font-medium hover:underline bg-transparent border-none p-0 cursor-pointer"
                  onClick={() => setLocation("/register")}
                >
                  Back to Sign Up
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
