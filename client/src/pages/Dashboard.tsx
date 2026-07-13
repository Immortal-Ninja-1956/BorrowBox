import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  Store,
  ShoppingBag,
  BookOpen,
  Laptop,
  Sofa,
  Shirt,
  Trophy,
  Package,
  CheckCircle2,
  MessageCircle,
  Star,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealChat } from "@/components/DealChat";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
const categoryMetadata: Record<string, { icon: any; gradient: string }> = {
  Books: {
    icon: BookOpen,
    gradient: "from-amber-400 to-orange-600",
  },
  Electronics: {
    icon: Laptop,
    gradient: "from-blue-400 to-indigo-600",
  },
  Furniture: {
    icon: Sofa,
    gradient: "from-emerald-400 to-teal-600",
  },
  Clothing: {
    icon: Shirt,
    gradient: "from-pink-400 to-rose-600",
  },
  Sports: {
    icon: Trophy,
    gradient: "from-yellow-400 to-amber-600",
  },
  Other: {
    icon: Package,
    gradient: "from-purple-400 to-violet-600",
  },
};

import { usePageMetadata } from "@/_core/hooks/usePageMetadata";

function getCategoryMeta(category?: string) {
  const normalized = category || "Other";
  return categoryMetadata[normalized] || categoryMetadata["Other"];
}

export default function Dashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  usePageMetadata("My Dashboard", "Manage your listed items, active trade deals, and purchase confirmations on BorrowBox.");

  const [openReviewDealId, setOpenReviewDealId] = useState<number | null>(null);

  const {
    data: deals,
    isLoading,
    refetch,
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

  const updateStatusMutation = trpc.deals.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Deal status updated!");
      refetch();
    },
    onError: error => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const cancelDealMutation = trpc.deals.cancel.useMutation({
    onSuccess: () => {
      toast.success("Deal cancelled successfully!");
      refetch();
      refetchBuyerDeals();
      refetchItems();
    },
    onError: error => {
      toast.error("Failed to cancel deal: " + error.message);
    },
  });

  const deleteItemMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted.");
      refetchItems();
    },
    onError: error => {
      toast.error("Failed to delete item: " + error.message);
    },
  });

  if (authLoading || isLoading || isBuyerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground">Loading dashboard...</p>
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

  const statusFlow = ["OPEN", "Shipped", "DELIVERED"];
  const statusLabels: Record<string, string> = {
    OPEN: "Open",
    Shipped: "Meetup Arranged",
    DELIVERED: "Waiting for Buyer",
    CONFIRMED: "Awaiting Payment",
    PAID: "Delivered & Paid",
    CANCELLED: "Cancelled",
    DISPUTED: "Disputed",
    NEEDS_ATTENTION: "Needs Attention",
  };
  const URGENT_STATES = ["DISPUTED", "NEEDS_ATTENTION", "DELIVERED", "CONFIRMED"];
  const sortDeals = (dealList: any[]) => {
    return [...dealList].sort((a, b) => {
      const aUrgent = URGENT_STATES.includes(a.status) ? 1 : 0;
      const bUrgent = URGENT_STATES.includes(b.status) ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      if (a.status === "PAID" && b.status !== "PAID") return 1;
      if (b.status === "PAID" && a.status !== "PAID") return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

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

      {/* Urgent Action Banner */}
      {urgentCount > 0 && (
        <div className="bg-yellow-500 text-yellow-950 px-4 py-3 text-center font-bold relative z-20 shadow-md">
          {urgentCount} deal(s) need your immediate attention. Please check your active sales and purchases below.
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
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {itemsListed}
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
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {activeDeals}
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
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {buyerDeals?.length || 0}
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
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {(deals?.filter(d => d.status === "PAID").length || 0) + 
                 (buyerDeals?.filter(d => d.status === "PAID").length || 0)}
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

          {/* Listings Tab */}
          <TabsContent value="listings" className="space-y-12 outline-none">
            {/* Your Items Section */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Listed Items
              </h2>

              {!sellerItems || sellerItems.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center max-w-lg mx-auto">
                  <p className="text-muted-foreground mb-6 text-sm">
                    You haven't posted any items on the marketplace yet.
                  </p>
                  <Button 
                    onClick={() => setLocation("/create-post")}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl"
                  >
                    Post Your First Item
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sellerItems.map(item => {
                    const { icon: CategoryIcon, gradient } = getCategoryMeta(
                      item.category ?? undefined
                    );
                    return (
                      <div
                        key={item.id}
                        className="glass-card premium-hover-card rounded-2xl p-5 flex flex-col justify-between h-[360px]"
                      >
                        <div>
                          {/* Image Thumbnail / Placeholder */}
                          <div className="w-full h-36 bg-muted rounded-xl overflow-hidden relative mb-4">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white p-3`}
                              >
                                <CategoryIcon className="w-8 h-8 opacity-80 mb-1" />
                                <span className="text-[10px] font-bold opacity-90 tracking-wider uppercase bg-black/15 backdrop-blur-xs px-2 py-0.5 rounded-full">
                                  {item.category || "Other"}
                                </span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-base font-bold text-foreground mb-1.5 line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xl font-black text-foreground">
                              ₹{item.amount}
                            </span>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                item.status === "OPEN"
                                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {item.status === "OPEN" ? "Available" : item.status}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl font-semibold border-border hover:bg-muted text-xs h-9"
                              onClick={() => setLocation(`/item/${item.id}`)}
                            >
                              View
                            </Button>
                            {item.status === "OPEN" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-border hover:border-primary hover:text-primary transition-colors h-9 w-9 p-0"
                                onClick={() =>
                                  setLocation(`/edit-post/${item.id}`)
                                }
                                title="Edit Listing"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl border-border text-destructive hover:bg-destructive hover:text-destructive-foreground h-9 w-9 p-0"
                                  disabled={deleteItemMutation.isPending}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-2xl border-border/40 glass-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="font-bold text-xl text-foreground">
                                    Delete Listing
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
                                    Are you sure you want to delete **"{item.title}"**? This action cannot be undone and will remove the item from the marketplace.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="mt-4 gap-2">
                                  <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteItemMutation.mutate({ id: item.id })
                                    }
                                    className="bg-destructive hover:bg-destructive/95 text-destructive-foreground rounded-xl"
                                  >
                                    Delete Listing
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deals Section */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Active Listings Deals
              </h2>

              {!deals ||
              deals.filter(d => d.status !== "CANCELLED").length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center max-w-lg mx-auto">
                  <p className="text-muted-foreground text-sm">
                    No active deals on your listed items yet.
                  </p>
                  {(!sellerItems || sellerItems.length === 0) && (
                    <Button 
                      onClick={() => setLocation("/create-post")}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl mt-6"
                    >
                      Post Your First Item
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {sortDeals(deals.filter(d => d.status !== "CANCELLED" && d.status !== "PAID"))
                    .map(deal => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        statusFlow={statusFlow}
                        statusLabels={statusLabels}
                        onStatusUpdate={status => {
                          updateStatusMutation.mutate({
                            dealId: deal.id,
                            status: status as any,
                          });
                        }}
                        onCancel={() =>
                          cancelDealMutation.mutate({ dealId: deal.id })
                        }
                        isUpdating={
                          updateStatusMutation.isPending ||
                          cancelDealMutation.isPending
                        }
                        triggerReviewOpen={openReviewDealId === deal.id}
                        onTriggerReviewOpenHandled={() => setOpenReviewDealId(null)}
                      />
                    ))}

                  {deals.filter(d => d.status === "PAID").length > 0 && (
                    <details className="group border border-border/40 rounded-xl overflow-hidden bg-card/20 mt-8">
                      <summary className="px-6 py-4 font-bold cursor-pointer flex items-center justify-between text-muted-foreground hover:bg-card/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                        Completed Sales
                        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">{deals.filter(d => d.status === "PAID").length}</span>
                      </summary>
                      <div className="p-4 space-y-4 border-t border-border/40">
                        {sortDeals(deals.filter(d => d.status === "PAID"))
                          .map(deal => (
                            <DealCard
                              key={deal.id}
                              deal={deal}
                              statusFlow={statusFlow}
                              statusLabels={statusLabels}
                              onStatusUpdate={status => {
                                updateStatusMutation.mutate({
                                  dealId: deal.id,
                                  status: status as any,
                                });
                              }}
                              onCancel={() =>
                                cancelDealMutation.mutate({ dealId: deal.id })
                              }
                              isUpdating={
                                updateStatusMutation.isPending ||
                                cancelDealMutation.isPending
                              }
                              triggerReviewOpen={openReviewDealId === deal.id}
                              onTriggerReviewOpenHandled={() => setOpenReviewDealId(null)}
                            />
                          ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-6 outline-none">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Purchases & Interests
              </h2>

              {!buyerDeals || buyerDeals.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center max-w-lg mx-auto">
                  <p className="text-muted-foreground mb-6 text-sm">
                    You haven't expressed interest in any items yet.
                  </p>
                  <Button 
                    onClick={() => setLocation("/marketplace")}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl"
                  >
                    Browse Marketplace
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortDeals(buyerDeals.filter(d => d.status !== "CANCELLED" && d.status !== "PAID")).map(deal => (
                    <PurchasedDealCard
                      key={deal.id}
                      deal={deal}
                      onCancel={() =>
                        cancelDealMutation.mutate({ dealId: deal.id })
                      }
                      isCancelling={cancelDealMutation.isPending}
                      triggerReviewOpen={openReviewDealId === deal.id}
                      onTriggerReviewOpenHandled={() => setOpenReviewDealId(null)}
                    />
                  ))}

                  {buyerDeals.filter(d => d.status === "PAID").length > 0 && (
                    <details className="group border border-border/40 rounded-xl overflow-hidden bg-card/20 mt-8">
                      <summary className="px-6 py-4 font-bold cursor-pointer flex items-center justify-between text-muted-foreground hover:bg-card/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
                        Completed Purchases
                        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">{buyerDeals.filter(d => d.status === "PAID").length}</span>
                      </summary>
                      <div className="p-4 space-y-4 border-t border-border/40">
                        {sortDeals(buyerDeals.filter(d => d.status === "PAID")).map(deal => (
                          <PurchasedDealCard
                            key={deal.id}
                            deal={deal}
                            onCancel={() =>
                              cancelDealMutation.mutate({ dealId: deal.id })
                            }
                            isCancelling={cancelDealMutation.isPending}
                            triggerReviewOpen={openReviewDealId === deal.id}
                            onTriggerReviewOpenHandled={() => setOpenReviewDealId(null)}
                          />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
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

function ReviewModal({
  deal,
  isBuyer = false,
  triggerOpen = false,
  onTriggerOpenHandled,
}: {
  deal: any;
  isBuyer?: boolean;
  triggerOpen?: boolean;
  onTriggerOpenHandled?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (triggerOpen) {
      setIsOpen(true);
      if (onTriggerOpenHandled) onTriggerOpenHandled();
    }
  }, [triggerOpen, onTriggerOpenHandled]);

  const { data: reviews, refetch } = trpc.reviews.getByDeal.useQuery(
    { dealId: deal.id },
    { enabled: deal.status === "PAID" }
  );
  const { user } = useAuth();

  const createReviewMutation = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      setIsOpen(false);
      refetch();
    },
    onError: err => {
      toast.error("Failed to submit review: " + err.message);
    },
  });

  if (deal.status !== "PAID") return null;

  const hasReviewed = reviews?.some((r: any) => r.reviewerId === user?.id);

  if (hasReviewed) {
    return (
      <div className="bg-muted text-muted-foreground px-3 py-1.5 rounded text-sm font-medium inline-flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        You left a review
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-amber-400 text-amber-600 hover:bg-amber-50"
        >
          Leave a Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review {isBuyer ? "Seller" : "Buyer"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Rate your experience
            </p>
            <StarRating rating={rating} onRatingChange={setRating} size={32} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Comments (Optional)</p>
            <Textarea
              placeholder="How was your experience?"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            className="w-full bg-accent"
            disabled={rating === 0 || createReviewMutation.isPending}
            onClick={() =>
              createReviewMutation.mutate({ dealId: deal.id, rating, comment })
            }
          >
            {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DealCard({
  deal,
  statusFlow,
  statusLabels,
  onStatusUpdate,
  onCancel,
  isUpdating,
  triggerReviewOpen = false,
  onTriggerReviewOpenHandled,
}: {
  deal: any;
  statusFlow: string[];
  statusLabels: Record<string, string>;
  onStatusUpdate: (status: string) => void;
  onCancel: () => void;
  isUpdating: boolean;
  triggerReviewOpen?: boolean;
  onTriggerReviewOpenHandled?: () => void;
}) {
  const currentStatusIndex = statusFlow.indexOf(deal.status);
  const [pin, setPin] = useState("");
  
  const trpcContext = trpc.useContext();
  
  const confirmWithPinMutation = trpc.deals.confirmWithPin.useMutation({
    onSuccess: () => {
      toast.success("Deal completed successfully!");
      trpcContext.deals.getBySeller.invalidate();
    },
    onError: err => {
      toast.error(err.message);
    }
  });

  const raiseDisputeMutation = trpc.deals.raiseDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute raised. The deal is now frozen.");
      trpcContext.deals.getBySeller.invalidate();
    },
    onError: err => {
      toast.error(err.message);
    }
  });

  const isLocked = deal.pinLockedAt !== null;
  const isDisputed = deal.status === "DISPUTED";
  const needsAttention = deal.status === "NEEDS_ATTENTION";

  return (
    <div className="glass-card rounded-2xl p-6 border-border/40 shadow-xs">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-1.5">
            Deal #{deal.id} {deal.item && `— ${deal.item.title}`}
          </h3>
          <p className="text-sm text-muted-foreground">
            Transaction Amount:{" "}
            <span className="text-primary font-black text-base ml-1">₹{deal.amount}</span>
          </p>
        </div>
        <span
          className={`px-3.5 py-1 rounded-full text-xs font-bold border ${
            deal.status === "OPEN"
              ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
              : deal.status === "DELIVERED"
                ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                : deal.status === "CONFIRMED"
                  ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400"
                  : deal.status === "CANCELLED"
                    ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
                    : isDisputed || needsAttention
                      ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          }`}
        >
          {statusLabels[deal.status] || deal.status}
        </span>
        {(() => {
          const statusNextSteps: Record<string, {text: string, color: string}> = {
            OPEN: {text: "Next step: Arrange a meetup.", color: "text-green-600 dark:text-green-400"},
            Shipped: {text: "Next step: Meet buyer on campus.", color: "text-amber-600 dark:text-amber-400"},
            DELIVERED: {text: "Next step: Wait for buyer confirmation.", color: "text-blue-600 dark:text-blue-400"},
            CONFIRMED: {text: "Next step: Enter buyer's PIN.", color: "text-purple-600 dark:text-purple-400"},
          };
          return statusNextSteps[deal.status] ? (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${statusNextSteps[deal.status].color}`}>
              {statusNextSteps[deal.status].text}
            </span>
          ) : null;
        })()}
      </div>

      <div className="mb-6 flex gap-3 flex-wrap">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-xl border-primary/30 text-primary hover:bg-primary/5 px-5 h-10 font-semibold"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat In-App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none">
            <DealChat
              dealId={deal.id}
              otherPartyName={`Buyer #${deal.buyerId || "Unknown"}`}
              dealStatus={deal.status}
            />
          </DialogContent>
        </Dialog>

        {deal.status !== "PAID" && deal.status !== "CANCELLED" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isUpdating}
                className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground px-5 h-10 font-semibold"
              >
                Cancel Deal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/40 glass-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold text-xl text-foreground">Cancel Deal</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Are you sure you want to cancel this deal? This will mark the
                  deal as CANCELLED and put the item back on the marketplace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="rounded-xl border-border">Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancel}
                  className="bg-destructive hover:bg-destructive/95 text-destructive-foreground rounded-xl"
                >
                  Cancel Deal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {deal.status !== "PAID" && deal.status !== "CANCELLED" && (
           <AlertDialog>
           <AlertDialogTrigger asChild>
             <Button
               variant="outline"
               disabled={raiseDisputeMutation.isPending}
               className="rounded-xl border-orange-500/30 text-orange-600 hover:bg-orange-500/10 px-5 h-10 font-semibold"
             >
               Raise a Problem
             </Button>
           </AlertDialogTrigger>
           <AlertDialogContent className="rounded-2xl border-border/40 glass-card">
             <AlertDialogHeader>
               <AlertDialogTitle className="font-bold text-xl text-foreground">Raise a Dispute</AlertDialogTitle>
               <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
                 Are you sure you want to dispute this deal? This will freeze the deal and invalidate any active PINs.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter className="mt-4 gap-2">
               <AlertDialogCancel className="rounded-xl border-border">Go Back</AlertDialogCancel>
               <AlertDialogAction
                 onClick={() => raiseDisputeMutation.mutate({ dealId: deal.id })}
                 className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl"
               >
                 Yes, Dispute
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
        )}
      </div>

      {/* Status Flow */}
      {deal.status !== "PAID" && deal.status !== "CANCELLED" && (
        <div className="mb-6 p-4 rounded-xl bg-muted/40 border border-border/30">
          <p className="text-xs text-muted-foreground mb-3 font-bold uppercase tracking-wider">Update Status Workflow:</p>
          <div className="flex gap-2.5 flex-wrap">
            {statusFlow.map((status, index) => (
              <button
                key={status}
                onClick={() => onStatusUpdate(status)}
                disabled={isUpdating || index <= currentStatusIndex}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  index <= currentStatusIndex
                    ? "bg-muted border-border/30 text-muted-foreground cursor-not-allowed"
                    : "bg-primary border-primary text-primary-foreground hover:bg-primary/95 shadow-xs shadow-primary/10 hover:scale-102"
                }`}
              >
                Mark as {statusLabels[status] || status}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Badges for Disputed / Needs Attention */}
      {(isDisputed || needsAttention) && (
        <div className={`border rounded-xl p-4.5 mb-6 ${isDisputed ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`font-bold text-sm ${isDisputed ? 'text-red-800' : 'text-orange-800'}`}>
            {isDisputed ? "⚠️ This deal is disputed. Please coordinate with the buyer." : "⚠️ This deal needs your attention."}
          </p>
        </div>
      )}

      {/* Deal completion statuses */}
      {deal.status === "PAID" && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-4.5 mb-6 flex items-center justify-between flex-wrap gap-4">
          <p className="text-green-600 dark:text-green-400 font-bold text-sm">
            ✅ Deal Complete — Delivered & Paid!
          </p>
          <ReviewModal
            deal={deal}
            triggerOpen={triggerReviewOpen}
            onTriggerOpenHandled={onTriggerReviewOpenHandled}
          />
        </div>
      )}

      {deal.status === "CONFIRMED" && (
        <div className="bg-purple-500/10 border border-purple-500/25 rounded-xl p-4.5 mb-6">
          <p className="text-purple-600 dark:text-purple-400 font-bold text-sm">
            ✓ Buyer has confirmed delivery. Waiting for buyer to scan your QR code and release payment...
          </p>
        </div>
      )}


      {/* Seller PIN Input UI (Visible after delivery when buyer confirms/pays) */}
      {(deal.status === "DELIVERED" || deal.status === "CONFIRMED") && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mt-4">
          <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Complete the Deal (Secure Handshake)
          </h4>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            <strong>1.</strong> Check YOUR OWN banking app for a credit of <strong>₹{deal.amount}</strong> with the note <strong>BBX-{deal.id}</strong>. Never trust a screenshot. <br/>
            <strong>2.</strong> Once you've verified the payment, ask the buyer for their 6-digit PIN and enter it below to atomically complete the deal.
          </p>
          
          {isLocked ? (
             <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800 text-sm font-semibold">
                  PIN entry is locked due to too many failed attempts. Please use the "Raise a Problem" button above to dispute and reset the PIN.
                </p>
             </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <InputOTP 
                maxLength={6} 
                value={pin} 
                onChange={setPin}
                inputMode="numeric"
                pattern="[0-9]*"
              >
                <InputOTPGroup className="bg-background">
                  <InputOTPSlot index={0} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={1} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={2} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={3} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={4} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                  <InputOTPSlot index={5} className="w-12 h-14 text-xl sm:w-14 sm:h-16 sm:text-2xl" />
                </InputOTPGroup>
              </InputOTP>
              <Button
                onClick={() => confirmWithPinMutation.mutate({ dealId: deal.id, pin })}
                disabled={pin.length !== 6 || confirmWithPinMutation.isPending}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-8 w-full sm:w-auto h-14 sm:h-16 rounded-xl"
              >
                {confirmWithPinMutation.isPending ? "Verifying..." : "Verify & Complete"}
              </Button>
            </div>
          )}
          
          {!isLocked && (
            <p className={`text-xs mt-3 font-semibold ${deal.pinAttempts > 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {5 - (deal.pinAttempts || 0)} attempt(s) remaining. Locks after 5 failed attempts.
            </p>
          )}
        </div>
      )}


    </div>
  );
}

function PurchasedDealCard({
  deal,
  onCancel,
  isCancelling,
  triggerReviewOpen = false,
  onTriggerReviewOpenHandled,
}: {
  deal: any;
  onCancel: () => void;
  isCancelling: boolean;
  triggerReviewOpen?: boolean;
  onTriggerReviewOpenHandled?: () => void;
}) {
  const [, setLocation] = useLocation();

  const statusColors: Record<string, string> = {
    OPEN: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
    Shipped:
      "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    DELIVERED:
      "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    CONFIRMED:
      "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
    PAID: "bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400",
    CANCELLED: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
  };

  const statusLabels: Record<string, string> = {
    OPEN: "Open",
    Shipped: "Meetup Arranged",
    DELIVERED: "Action Required: Confirm Handover",
    CONFIRMED: "Payment Ready",
    PAID: "Paid",
    CANCELLED: "Cancelled",
    DISPUTED: "Disputed",
    NEEDS_ATTENTION: "Needs Attention",
  };

  const isDelivered = deal.status === "DELIVERED";
  const isConfirmed = deal.buyerConfirmed === 1;

  return (
    <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
      <div className="flex gap-4 items-start md:items-center">
        {deal.item?.imageUrl ? (
          <img
            src={deal.item.imageUrl}
            alt={deal.item.title}
            className="w-20 h-20 object-cover rounded-xl border border-border/40"
          />
        ) : (
          <div className="w-20 h-20 bg-muted rounded-xl flex items-center justify-center text-muted-foreground border border-border/40">
            <ShoppingBag className="w-7 h-7 text-muted-foreground/60" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h3 className="text-base font-bold text-foreground">
              {deal.item?.title || `Item #${deal.itemId}`}
            </h3>
            <span
              className={`px-3 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                statusColors[deal.status] || (deal.status === "DISPUTED" ? "bg-red-50 text-red-600 border-red-200" : "bg-muted text-muted-foreground")
              }`}
            >
              {statusLabels[deal.status] || deal.status}
            </span>
            {(() => {
              const buyerNextSteps: Record<string, {text: string, color: string}> = {
                OPEN: {text: "Next step: Message seller to meet.", color: "text-green-600 dark:text-green-400"},
                Shipped: {text: "Next step: Meet seller on campus.", color: "text-amber-600 dark:text-amber-400"},
                DELIVERED: {text: "Next step: Confirm handover.", color: "text-blue-600 dark:text-blue-400"},
                CONFIRMED: {text: "Next step: Pay & show PIN.", color: "text-purple-600 dark:text-purple-400"},
              };
              return buyerNextSteps[deal.status] ? (
                <span className={`text-[10px] font-bold uppercase tracking-wider ${buyerNextSteps[deal.status].color}`}>
                  {buyerNextSteps[deal.status].text}
                </span>
              ) : null;
            })()}
            {isConfirmed && (
              <span className="bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 px-3 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider">
                ✓ Confirmed
              </span>
            )}
          </div>
          {deal.item?.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {deal.item.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Deal ID:{" "}
              <span className="font-bold text-foreground">#{deal.id}</span>
            </span>
            <span>•</span>
            <span>
              Price:{" "}
              <span className="font-black text-foreground">
                ₹{deal.amount}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
        {deal.status === "PAID" && (
          <ReviewModal
            deal={deal}
            isBuyer={true}
            triggerOpen={triggerReviewOpen}
            onTriggerOpenHandled={onTriggerReviewOpenHandled}
          />
        )}
        {isDelivered && !isConfirmed ? (
          <Button
            onClick={() => setLocation(`/confirm/${deal.id}`)}
            className="bg-green-600 hover:bg-green-700 text-white animate-pulse animate-duration-1000 rounded-xl px-5 h-10 font-bold text-xs"
          >
            Confirm Delivery
          </Button>
        ) : (
          deal.status !== "CANCELLED" && (
            <Button
              onClick={() => setLocation(`/confirm/${deal.id}`)}
              variant={isConfirmed ? "outline" : "secondary"}
              className="w-full md:w-auto rounded-xl px-5 h-10 font-bold text-xs border-border"
            >
              {isConfirmed ? "View Payment QR Code" : "Track Order / Confirm"}
            </Button>
          )
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/5 w-full md:w-auto rounded-xl px-5 h-10 font-bold text-xs"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat In-App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none">
            <DealChat
              dealId={deal.id}
              otherPartyName={`Seller #${deal.sellerId}`}
              dealStatus={deal.status}
            />
          </DialogContent>
        </Dialog>

        {deal.status !== "PAID" && deal.status !== "CANCELLED" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isCancelling}
                className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground w-full md:w-auto rounded-xl px-5 h-10 font-bold text-xs"
              >
                Cancel Deal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/40 glass-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold text-xl text-foreground">Cancel Deal</AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
                  Are you sure you want to cancel this deal? This will mark the
                  deal as CANCELLED and put the item back on the marketplace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 gap-2">
                <AlertDialogCancel className="rounded-xl border-border">Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancel}
                  className="bg-destructive hover:bg-destructive/95 text-destructive-foreground rounded-xl"
                >
                  Cancel Deal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
