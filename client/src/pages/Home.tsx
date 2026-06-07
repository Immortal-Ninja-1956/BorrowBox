import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ShoppingBag, Users, Zap, ArrowRight, CheckCircle, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (isAuthenticated && location === "/") {
      setLocation("/marketplace");
    }
  }, [isAuthenticated, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">

      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-accent">BorrowBox</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-2"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="font-medium text-foreground">Welcome, {user?.name}</span>
                <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setLocation("/login")}>Login</Button>
                <Button onClick={() => setLocation("/register")}>Sign Up</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 md:py-32">
        <div className="container max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Borrow. Share. <span className="text-accent">Repeat.</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The ultimate peer-to-peer marketplace for college students. Buy and sell items securely with trusted payment verification after delivery confirmation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Button size="lg" className="text-lg" onClick={() => setLocation("/marketplace")}>
                  Explore Marketplace <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg" onClick={() => setLocation("/create-post")}>
                  Post an Item
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" className="text-lg" onClick={() => setLocation("/marketplace")}>
                  Explore Marketplace <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg" onClick={() => setLocation("/login")}>
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card border-y border-border">
        <div className="container">
          <h3 className="text-4xl font-bold text-center mb-16 text-foreground">Why Choose BorrowBox?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl bg-background border border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-xl font-bold mb-3 text-foreground">Instant Connections</h4>
              <p className="text-muted-foreground">Connect with sellers directly via WhatsApp. No middleman, just direct communication.</p>
            </div>
            <div className="p-8 rounded-xl bg-background border border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-secondary" />
              </div>
              <h4 className="text-xl font-bold mb-3 text-foreground">Secure Payments</h4>
              <p className="text-muted-foreground">UPI QR codes generated only after delivery confirmation. Pay when you're satisfied.</p>
            </div>
            <div className="p-8 rounded-xl bg-background border border-border hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-xl font-bold mb-3 text-foreground">Student Community</h4>
              <p className="text-muted-foreground">Built for college students, by college students. Trusted by university users.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl">
          <h3 className="text-4xl font-bold text-center mb-16 text-foreground">How It Works</h3>
          <div className="space-y-8">
            {[
              { n: 1, title: "Post or Browse", desc: "Sellers list items with photos and prices. Buyers browse the marketplace." },
              { n: 2, title: "Connect via WhatsApp", desc: "Interested buyers contact sellers directly. Negotiate and arrange pickup/delivery." },
              { n: 3, title: "Track Status", desc: "Sellers update deal status: OPEN → Finalized → DELIVERED." },
              { n: 4, title: "Confirm & Pay", desc: "Buyer confirms delivery. Seller's UPI QR code appears. Buyer scans and pays." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">{n}</div>
                <div>
                  <h4 className="text-xl font-bold mb-2 text-foreground">{title}</h4>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-accent text-accent-foreground">
        <div className="container text-center">
          <h3 className="text-4xl font-bold mb-6">Ready to Join the BorrowBox Community?</h3>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Start buying and selling with your college friends today.
          </p>
          {!isAuthenticated && (
            <Button size="lg" className="bg-accent-foreground text-accent hover:bg-accent-foreground/90 text-lg" onClick={() => setLocation("/register")}>
              Sign Up Now
            </Button>
          )}
        </div>
      </section>

      <footer className="border-t border-border bg-card py-8 px-4">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2026 BorrowBox. Built for college students, by college students.</p>
        </div>
      </footer>
    </div>
  );
}
