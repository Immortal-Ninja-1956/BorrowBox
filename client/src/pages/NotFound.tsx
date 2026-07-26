import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

import { usePageMetadata } from "@/_core/hooks/usePageMetadata";

export default function NotFound() {
  const [, setLocation] = useLocation();

  usePageMetadata("404 Page Not Found", "The requested page could not be found.");

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background auth-bg relative overflow-hidden">
      {/* Giant background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
        <span className="text-[180px] md:text-[280px] font-black text-foreground/[0.03] leading-none tracking-tighter">
          404
        </span>
      </div>

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Floating box illustration */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
          className="mb-8 inline-block"
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
            {/* Open box body */}
            <rect x="20" y="50" width="80" height="50" rx="6" className="fill-muted stroke-border" strokeWidth="2" />
            {/* Left flap */}
            <path d="M20 50 L35 30 L60 38 L60 50 Z" className="fill-muted/60 stroke-border" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Right flap */}
            <path d="M100 50 L85 30 L60 38 L60 50 Z" className="fill-muted/80 stroke-border" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Question mark */}
            <text x="60" y="88" textAnchor="middle" className="fill-primary" fontSize="32" fontWeight="800" fontFamily="Outfit, sans-serif">?</text>
            {/* Floating sparkle dots */}
            <circle cx="30" cy="25" r="2" className="fill-primary/40">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="95" cy="20" r="1.5" className="fill-secondary/50">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="75" cy="15" r="2.5" className="fill-primary/30">
              <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
            </circle>
          </svg>
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-foreground mb-3 tracking-tight">
          Page not found
        </h1>

        <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-md mx-auto">
          Looks like this page got traded away on the marketplace.
          <br />
          Let's get you back to campus.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
          <Button
            onClick={() => setLocation("/marketplace")}
            variant="outline"
            className="border-border hover:bg-muted/50 px-6 py-2.5 rounded-xl font-semibold transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
        </div>
      </div>
    </div>
  );
}
