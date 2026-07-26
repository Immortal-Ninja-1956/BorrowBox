import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { usePageMetadata } from "@/_core/hooks/usePageMetadata";

export default function Login() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  
  usePageMetadata("Sign In", "Sign in to your BorrowBox account to buy, sell, rent, or borrow items on campus.");

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // Only show warning once per session to avoid annoying the user
    const hasSeen = sessionStorage.getItem("seen-vit-warning");
    if (!hasSeen) {
      setShowWarning(true);
    }
  }, []);

  const handleCloseWarning = () => {
    sessionStorage.setItem("seen-vit-warning", "true");
    setShowWarning(false);
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Fill in all fields");
      return;
    }
    if (!form.email.toLowerCase().endsWith("@vitstudent.ac.in")) {
      toast.error("Only @vitstudent.ac.in college emails are allowed");
      return;
    }
    
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      // Wait for auth state to fully sync before navigating
      try {
        await refresh();
      } catch {
        // refresh may fail transiently; the onAuthStateChange listener
        // in useAuth will retry via invalidation
      }
      toast.success("Logged in!");
      const redirectTo = sessionStorage.getItem("redirect_after_login");
      if (redirectTo) {
        sessionStorage.removeItem("redirect_after_login");
        setLocation(redirectTo);
      } else {
        setLocation("/marketplace");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background auth-bg px-4">
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
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="you@vitstudent.ac.in"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-xs font-semibold text-accent hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e =>
                    setForm(p => ({ ...p, password: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-accent"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-border hover:bg-muted/50 cursor-pointer mb-6"
            onClick={async () => {
              try {
                setIsLoading(true);
                const savedRedirect = sessionStorage.getItem("redirect_after_login");
                const redirectTarget = savedRedirect 
                  ? `${window.location.origin}${savedRedirect}` 
                  : `${window.location.origin}/marketplace`;

                if (savedRedirect) {
                  sessionStorage.removeItem("redirect_after_login");
                }

                const { error } = await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: redirectTarget,
                    queryParams: {
                      hd: "vitstudent.ac.in",
                    },
                  },
                });
                if (error) throw error;
              } catch (err: any) {
                toast.error(err.message || "Failed to sign in with Google");
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button
              className="text-accent font-medium hover:underline bg-transparent border-none p-0 cursor-pointer"
              onClick={() => setLocation("/register")}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>

      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="max-w-md border border-border bg-card/95 backdrop-blur-md p-6 rounded-xl shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-2">
              <GraduationCap className="w-6 h-6 text-amber-500" />
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              VIT Chennai Students Only
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed mt-2">
              This service is <strong>ONLY</strong> available to the students of VIT Chennai. 
              To access the marketplace, please make sure to sign up or sign in using your official college email ID ending with <strong>@vitstudent.ac.in</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/50 text-xs text-muted-foreground flex gap-2 items-start text-left">
            <span className="text-amber-500 font-bold shrink-0">Note:</span>
            <span>Personal Google accounts or non-college emails will not be registered or allowed to access the platform.</span>
          </div>
          <DialogFooter className="mt-6 w-full flex justify-center sm:justify-center">
            <Button
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-lg py-2.5"
              onClick={handleCloseWarning}
            >
              I understand, proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
