import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  ShoppingBag,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
  Sun,
  Moon,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Laptop,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { usePageMetadata } from "@/_core/hooks/usePageMetadata";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const { isAuthenticated, user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  usePageMetadata("Home", "BorrowBox is a peer-to-peer campus marketplace for students to buy, sell, rent, or share items with in-person meetups and secure UPI payments.");

  useEffect(() => {
    if (isAuthenticated && location === "/") {
      setLocation("/marketplace");
    }
  }, [isAuthenticated, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6">
        <div className="w-64 h-10 skeleton-shimmer rounded-xl mb-4" />
        <div className="w-48 h-6 skeleton-shimmer rounded-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-between">
      {/* Background Glowing Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[550px] h-[550px] rounded-full bg-primary/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 -translate-y-1/2 -z-10 w-[350px] h-[350px] rounded-full bg-secondary/10 blur-[120px] pointer-events-none" />

      {/* Main Content Container */}
      <div className="flex-grow">
        {/* Hero */}
        <section className="py-16 px-4 md:py-28">
          <div className="container max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
                <Zap className="w-3.5 h-3.5" />
                <span>Exclusively for VIT Chennai Students</span>
              </div>

              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-foreground leading-[1.1]">
                Borrow. Share. <span className="gradient-text-animated">Repeat.</span>
              </h2>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                The ultimate peer-to-peer campus marketplace. Rent lab coats, sell engineering books, or borrow a scientific calculator — all within your hostel block.
              </p>

              {/* Campus Social Proof Badges */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-10 text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-3.5 py-1.5 rounded-full font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Built for VIT Chennai</span>
                </div>
                {/* 
                <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-tabular font-bold text-foreground">200+</span>
                  <span>students</span>
                </div>
                <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-tabular font-bold text-foreground">₹50k+</span>
                  <span>traded</span>
                </div>
                */}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
                {isAuthenticated ? (
                  <>
                    <Button
                      size="lg"
                      className="text-base font-semibold px-8 py-6 h-auto bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-300 rounded-xl w-full sm:w-auto"
                      onClick={() => setLocation("/marketplace")}
                    >
                      Explore Marketplace <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-base font-semibold px-8 py-6 h-auto border-border hover:bg-muted/50 rounded-xl w-full sm:w-auto"
                      onClick={() => setLocation("/create-post")}
                    >
                      Post an Item
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="text-base font-semibold px-8 py-6 h-auto bg-primary hover:bg-primary/95 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-300 rounded-xl w-full sm:w-auto"
                      onClick={() => setLocation("/marketplace")}
                    >
                      Explore Marketplace <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-base font-semibold px-8 py-6 h-auto border-border hover:bg-muted/50 rounded-xl w-full sm:w-auto"
                      onClick={() => setLocation("/login")}
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Right Visual Floating Showcase Cards */}
            <div className="lg:col-span-5 relative flex justify-center items-center">
              <div className="w-full max-w-sm relative space-y-4">
                {/* Floating Card 1 */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                  className="glass-card rounded-2xl p-4 border-primary/20 shadow-xl bg-card/85 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Casio fx-991EX Calculator</h4>
                      <p className="text-xs text-muted-foreground">Engineering • D-Block Hostel</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Available</span>
                    <span className="text-base font-black text-foreground font-tabular">₹350</span>
                  </div>
                </motion.div>

                {/* Floating Card 2 */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, delay: 0.5 }}
                  className="glass-card rounded-2xl p-4 border-border/60 shadow-xl ml-6 bg-card/90 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Lab Coat (Size L)</h4>
                      <p className="text-xs text-muted-foreground">Chemistry • C-Block</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[11px] font-semibold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">Handshake PIN</span>
                    <span className="text-base font-black text-foreground font-tabular">₹200</span>
                  </div>
                </motion.div>

                {/* Floating Card 3 */}
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 6, ease: "easeInOut", repeat: Infinity, delay: 1 }}
                  className="glass-card rounded-2xl p-4 border-border/60 shadow-xl -ml-2 bg-card/85 backdrop-blur-md hidden sm:block"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Sony WH-1000XM4 Noise Cancelling</h4>
                      <p className="text-xs text-muted-foreground">Electronics • A-Block</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Available</span>
                    <span className="text-base font-black text-foreground font-tabular">₹1,200</span>
                  </div>
                </motion.div>
              </div>
            </div>

          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-4 bg-muted/30 border-y border-border/40 relative">
          <div className="container relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                Why Choose BorrowBox?
              </h3>
              <p className="text-muted-foreground text-lg">
                We've built a trust-first marketplace tailored to campus needs.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl glass-card premium-hover-card">
                <div className="w-12 h-12 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-foreground">
                  Direct Chats
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  Chat in real-time right inside the app or hop on WhatsApp. Arrange pickups directly with your peers.
                </p>
              </div>
              <div className="p-8 rounded-2xl glass-card premium-hover-card">
                <div className="w-12 h-12 bg-secondary/15 border border-secondary/35 rounded-xl flex items-center justify-center mb-6">
                  <CheckCircle className="w-6 h-6 text-secondary" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-foreground">
                  Satisfied Then Paid
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  The seller's UPI QR code unlocks only after you confirm delivery. Complete trust, zero friction.
                </p>
              </div>
              <div className="p-8 rounded-2xl glass-card premium-hover-card">
                <div className="w-12 h-12 bg-primary/10 border border-primary/25 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-foreground">
                  Verified Students
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  Restricted to college community members. Trade books, electronics, calculators, and furniture safely.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 px-4 relative">
          <div className="container max-w-4xl relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h3 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
                How It Works
              </h3>
              <p className="text-muted-foreground text-lg">
                Four simple steps to buy, sell, borrow, or share on your campus.
              </p>
            </div>
            <div className="relative border-l border-border/60 pl-8 ml-6 space-y-12">
              {[
                {
                  n: 1,
                  title: "Post or Browse Listings",
                  desc: "Create an item listing with photos, category, and price in seconds. Or explore the marketplace using search and filters.",
                },
                {
                  n: 2,
                  title: "Connect & Negotiate",
                  desc: "Chat securely via the in-app chat or use WhatsApp to details about the handover location and timing.",
                },
                {
                  n: 3,
                  title: "Meet & Confirm Handover",
                  desc: "Meet on campus. The seller marks the handover as arranged, keeping both parties in sync.",
                },
                {
                  n: 4,
                  title: "UPI QR Payment Release",
                  desc: "Confirm delivery on your dashboard. This automatically reveals the seller's UPI QR code to scan and complete payment.",
                },
              ].map(({ n, title, desc }) => (
                <div key={n} className="relative group">
                  {/* Step Number Dot */}
                  <div className="absolute -left-[50px] top-1 w-9 h-9 rounded-full bg-background border border-border group-hover:border-primary/50 text-foreground group-hover:text-primary flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-xs">
                    {n}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-2 text-foreground transition-colors group-hover:text-primary">
                      {title}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-4 relative bg-gradient-to-br from-primary/95 to-primary text-primary-foreground overflow-hidden">
          <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-secondary/20 blur-[100px] pointer-events-none" />
          <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full bg-background/10 blur-[80px] pointer-events-none" />

          <div className="container text-center relative z-10">
            <h3 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">
              Ready to Join the BorrowBox Community?
            </h3>
            <p className="text-lg md:text-xl mb-10 opacity-90 max-w-2xl mx-auto leading-relaxed">
              Start trading books, items, and gear safely with your college mates today.
            </p>
            {!isAuthenticated && (
              <Button
                size="lg"
                className="bg-background text-primary hover:bg-background/90 text-base font-semibold px-8 py-6 h-auto shadow-xl rounded-xl transition-all duration-300 hover:scale-105"
                onClick={() => setLocation("/register")}
              >
                Create Free Account
              </Button>
            )}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card py-10 px-4 relative">
        <div className="container text-center text-muted-foreground">
          <p className="text-sm font-medium">
            &copy; 2026 BorrowBox. Built for college students, by college students.
          </p>
        </div>
      </footer>
    </div>
  );
}
