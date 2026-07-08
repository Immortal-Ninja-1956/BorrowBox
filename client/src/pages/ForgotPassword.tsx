import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { ShoppingBag, ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      setSubmitted(true);
      toast.success("Password reset link sent to your email!");
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
          {!submitted ? (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
                Reset Password
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                Enter your email address and we'll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="you@vitstudent.ac.in"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Sending link..."
                    : "Send Reset Link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Check Your Email
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                We've sent a password reset link to{" "}
                <strong className="text-foreground">{email}</strong>. Click the
                link in the email to choose a new password.
              </p>
              <div className="bg-muted/50 border border-border/50 p-4 rounded-lg text-xs text-muted-foreground text-left mb-6 space-y-2">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-accent shrink-0" />
                  <span>
                    The email may take a minute to arrive. Check your spam folder
                    if you don't see it.
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
              >
                Try Another Email
              </Button>
            </div>
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
