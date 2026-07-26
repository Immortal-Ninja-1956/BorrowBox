import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Store, ShoppingBag, CheckCircle2, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePageMetadata } from "@/_core/hooks/usePageMetadata";
import { URGENT_STATES } from "@/components/dashboard/Shared";

/** Animated counter — counts from 0 to value over 600ms with ease-out cubic */
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 600;
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

const MyListings = React.lazy(() => import("@/components/dashboard/MyListings"));
const SellerDeals = React.lazy(() => import("@/components/dashboard/SellerDeals"));
const BuyerDeals = React.lazy(() => import("@/components/dashboard/BuyerDeals"));

export default function Dashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  usePageMetadata("My Dashboard", "Manage your listed items, active trade deals, and purchase confirmations on CampusCart.");

  const [openReviewDealId, setOpenReviewDealId] = useState<number | null>(null);

  const {
    data: deals,
    isLoading,
    refetch: refetchDeals,
  } = trpc.deals.getBySeller.useQuery(undefined, { enabled: isAuthenticated });

  const {
    data: buyerDeals,
    isLoading: isBuyerLoading,
    refetch: refetchBuyerDeals,
  } = trpc.deals.getByBuyer.useQuery(undefined, { enabled: isAuthenticated });

  const { data: sellerItems, refetch: refetchItems } =
    trpc.items.getBySeller.useQuery(
      { sellerId: user?.id || 0 },
      { enabled: isAuthenticated && !!user?.id }
    );

  // Proactive review nudge for PAID deals
  useEffect(() => {
    if (!buyerDeals && !deals) return;

    // Find any PAID deal where the user is buyer or seller that hasn't been nudged yet
    const paidBuyerDeal = buyerDeals?.find(d => d.status === "PAID");
    const paidSellerDeal = deals?.find(d => d.status === "PAID");

    const dealToNudge = paidBuyerDeal || paidSellerDeal;
    if (dealToNudge) {
      const storageKey = `nudged-review-${dealToNudge.id}`;
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, "true");
        toast.custom((t) => (
          <div className="bg-card border border-border/85 rounded-2xl p-5 shadow-xl max-w-sm flex flex-col gap-3.5 border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground">Deal Complete! 🎉</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  You completed the deal for "{dealToNudge.item?.title || `Item #${dealToNudge.itemId}`}". Leave a review to help build campus trust!
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
              <Button
                variant="ghost"
                onClick={() => toast.dismiss(t)}
                className="text-xs font-semibold rounded-lg h-8 px-3"
              >
                Dismiss
              </Button>
              <Button
                onClick={() => {
                  toast.dismiss(t);
                  setOpenReviewDealId(dealToNudge.id);
                }}
                className="bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-lg h-8 px-4"
              >
                Write Review
              </Button>
            </div>
          </div>
        ), { duration: 8000 });
      }
    }
  }, [buyerDeals, deals]);

  const itemsListed = sellerItems?.length || 0;
  const activeDeals =
    deals?.filter(d => d.status !== "PAID" && d.status !== "CANCELLED")
      .length || 0;

  if (authLoading || isLoading || isBuyerLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Skeleton Header */}
        <div className="border-b border-border/40 bg-card/50 backdrop-blur-xs">
          <div className="container py-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="w-64 h-9 skeleton-shimmer mb-2" />
                <div className="w-48 h-5 skeleton-shimmer" />
              </div>
              <div className="flex gap-3">
                <div className="w-28 h-10 skeleton-shimmer rounded-xl" />
                <div className="w-36 h-10 skeleton-shimmer rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        {/* Skeleton Stats */}
        <div className="bg-muted/20 border-b border-border/40 py-8">
          <div className="container grid grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/40 p-5 flex items-center gap-4 bg-card/75">
                <div className="w-11 h-11 skeleton-shimmer rounded-xl" />
                <div>
                  <div className="w-20 h-3 skeleton-shimmer mb-2" />
                  <div className="w-10 h-7 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Skeleton Tabs + Cards */}
        <div className="container py-12">
          <div className="w-full max-w-md h-12 skeleton-shimmer rounded-2xl mb-8" />
          <div className="space-y-6">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/40 p-6 bg-card/75">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="w-48 h-5 skeleton-shimmer mb-2" />
                    <div className="w-24 h-4 skeleton-shimmer" />
                  </div>
                  <div className="w-20 h-6 skeleton-shimmer rounded-full" />
                </div>
                <div className="w-full h-16 skeleton-shimmer rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Sign in to access your dashboard
          </h2>
          <Button onClick={() => setLocation("/")} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const urgentCount = (deals ? deals.filter(d => URGENT_STATES.includes(d.status)).length : 0) + 
                      (buyerDeals ? buyerDeals.filter(d => URGENT_STATES.includes(d.status)).length : 0);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Glowing Blobs */}
      <div className="absolute top-1/4 right-1/4 -translate-y-1/2 -z-10 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-y-1/2 -z-10 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xs relative z-10">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Welcome, {user?.name}!
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Manage your listings, sales, and purchases
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setLocation("/profile")} 
                variant="outline"
                className="rounded-xl border-border px-5 hover:bg-muted/50 font-semibold transition-all"
              >
                Edit Profile
              </Button>
              <Button
                onClick={() => setLocation("/create-post")}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 rounded-xl px-5 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post New Item
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Action Banner — Visual Weight with pulse animation & attention icon */}
      {urgentCount > 0 && (
        <div className="bg-amber-500/15 border-l-4 border-l-amber-500 border-y border-r border-amber-500/30 text-amber-900 dark:text-amber-200 px-6 py-3.5 relative z-20 shadow-lg backdrop-blur-md container my-4 rounded-xl flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="font-extrabold text-sm tracking-tight">
                {urgentCount} deal(s) require your immediate action!
              </p>
              <p className="text-xs opacity-90">
                Please check your active sales and purchases below to confirm handover or submit payment.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider bg-amber-500 text-amber-950 px-3 py-1 rounded-full shadow-xs">
            Action Required
          </span>
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-muted/20 border-b border-border/40 py-8 relative z-10">
        <div className="container grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-5 flex items-center gap-4 transition-all">
            <div className="w-11 h-11 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Total Listings
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5 font-tabular">
                <AnimatedNumber value={itemsListed} />
              </h4>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex items-center gap-4 transition-all">
            <div className="w-11 h-11 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Active Sales
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5 font-tabular">
                <AnimatedNumber value={activeDeals} />
              </h4>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex items-center gap-4 transition-all">
            <div className="w-11 h-11 bg-secondary/15 border border-secondary/35 text-secondary rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Active Purchases
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5 font-tabular">
                <AnimatedNumber value={buyerDeals?.length || 0} />
              </h4>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 flex items-center gap-4 transition-all">
            <div className="w-11 h-11 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                Completed Deals
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5 font-tabular">
                <AnimatedNumber value={(deals?.filter(d => d.status === "PAID").length || 0) + 
                 (buyerDeals?.filter(d => d.status === "PAID").length || 0)} />
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12 relative z-10">
        <Tabs defaultValue="listings" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-card border border-border/40 p-1 rounded-2xl">
            <TabsTrigger
              value="listings"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
            >
              <Store className="w-4 h-4" />
              My Listings
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              My Purchases
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-12 outline-none">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Listed Items
              </h2>
              <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                <MyListings sellerItems={sellerItems || []} refetchItems={refetchItems} />
              </Suspense>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Active Listings Deals
              </h2>
              <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                <SellerDeals 
                  deals={deals || []} 
                  sellerItems={sellerItems || []}
                  refetchDeals={refetchDeals}
                  refetchItems={refetchItems}
                  openReviewDealId={openReviewDealId}
                  setOpenReviewDealId={setOpenReviewDealId}
                />
              </Suspense>
            </div>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6 outline-none">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Purchases & Interests
              </h2>
              <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
                <BuyerDeals 
                  buyerDeals={buyerDeals || []} 
                  refetchBuyerDeals={refetchBuyerDeals}
                  openReviewDealId={openReviewDealId}
                  setOpenReviewDealId={setOpenReviewDealId}
                />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>

        {/* Profile Card Section */}
        <div className="glass-card border border-border/40 rounded-2xl p-8 mt-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Your Profile & Payment Details
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-muted/30 border border-border/30 rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Email Address</p>
              <p className="text-foreground font-bold mt-1">{user?.email}</p>
            </div>
            <div className="bg-muted/30 border border-border/30 rounded-xl p-4">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Full Name</p>
              <p className="text-foreground font-bold mt-1">{user?.name}</p>
            </div>
          </div>
          <Button 
            onClick={() => setLocation("/profile")} 
            className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl px-6"
          >
            Edit Profile & Payment Details
          </Button>
        </div>
      </div>
    </div>
  );
}
