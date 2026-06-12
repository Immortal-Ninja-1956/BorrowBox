import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const { refresh } = useAuth();
  const [otp, setOtp] = useState("");
  
  // Extract email from query params
  const [email, setEmail] = useState("");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // If no email in URL, redirect back to login
      setLocation("/login");
    }
  }, [location, setLocation]);

  const verifyMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Email verified successfully!");
      setLocation("/marketplace");
    },
    onError: e => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit verification code");
      return;
    }
    verifyMutation.mutate({
      email,
      otp,
    });
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

        <div className="bg-card border border-border rounded-xl p-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Verify your email
          </h1>
          <p className="text-muted-foreground mb-6">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Verification Code
              </label>
              <Input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="text-center tracking-widest text-lg"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={verifyMutation.isPending || otp.length !== 6}
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Entered the wrong email?{" "}
            <button
              className="text-accent font-medium hover:underline"
              onClick={() => setLocation("/register")}
            >
              Back to Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
