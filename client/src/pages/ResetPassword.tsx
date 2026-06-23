import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing password reset token");
      return;
    }
    if (!passwords.password) {
      toast.error("Please enter a new password");
      return;
    }
    if (passwords.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (passwords.password !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwords.password
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset successfully! Log in with your new credentials.");
      setLocation("/login");
    }
  };

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

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          {!token ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Invalid Reset Link
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                This password reset link is invalid, incomplete, or has expired.
                Please request a new link.
              </p>
              <Button
                onClick={() => setLocation("/forgot-password")}
                className="w-full bg-accent"
              >
                Request New Link
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Create New Password
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Choose a strong new password that is at least 8 characters long.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.password}
                      onChange={e =>
                        setPasswords(p => ({ ...p, password: e.target.value }))
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
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwords.confirm}
                      onChange={e =>
                        setPasswords(p => ({ ...p, confirm: e.target.value }))
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                    >
                      {showConfirm ? (
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
                  {isLoading
                    ? "Resetting..."
                    : "Reset Password"}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 border-t border-border pt-4 text-center">
            <button
              onClick={() => setLocation("/login")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 bg-transparent border-none cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
