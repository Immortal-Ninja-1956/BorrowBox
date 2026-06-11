import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ShoppingBag, ArrowLeft, CheckCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Reset link generated! Check server console logs.");
    },
    onError: e => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    forgotPasswordMutation.mutate({ email });
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
                Enter the email address associated with your account and we will
                log the password reset link directly to your server console.
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
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending
                    ? "Generating link..."
                    : "Request Reset Link"}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Reset Request Sent
              </h1>
              <p className="text-muted-foreground mb-6 text-sm">
                We've generated a password reset token. Because this is a
                development server, you will find the reset link inside your
                **server backend console logs**.
              </p>
              <div className="bg-muted p-3 rounded-lg text-xs font-mono text-left mb-6 break-all">
                Check server stdout/stderr logs for: <br />
                <span className="text-accent">
                  http://localhost:5173/reset-password?token=...
                </span>
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
