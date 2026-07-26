import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  MessageCircle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Share2,
  BookOpen,
  Laptop,
  Sofa,
  Shirt,
  Trophy,
  Package,
  Check,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/star-rating";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DealChat } from "@/components/DealChat";
import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function ItemDetail() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const itemId = parseInt(id || "0");

  const [copied, setCopied] = useState(false);
  const [showWhatsAppConfirm, setShowWhatsAppConfirm] = useState(false);

  const {
    data: item,
    isLoading,
    refetch: refetchItem,
  } = trpc.items.getById.useQuery({ id: itemId });

  usePageMetadata(
    item ? item.title : "Item Detail",
    item ? `${item.title} - Condition: ${item.condition}. ${item.description || ""}`.substring(0, 155) + "..." : undefined
  );
  const { data: deals, refetch: refetchDeals } = trpc.deals.getByItem.useQuery({
    itemId,
  });
  const { data: authenticatedSellerProfile } = trpc.user.getProfileById.useQuery(
    { userId: item?.sellerId ?? 0 },
    { enabled: !!item?.sellerId && isAuthenticated }
  );
  const { data: publicSellerProfile } = trpc.user.getPublicProfileById.useQuery(
    { userId: item?.sellerId ?? 0 },
    { enabled: !!item?.sellerId && !isAuthenticated }
  );
  const sellerProfile = isAuthenticated ? authenticatedSellerProfile : publicSellerProfile;

  const createDealMutation = trpc.deals.create.useMutation({
    onSuccess: () => {
      toast.success(
        "Interest expressed successfully! Redirecting to your dashboard..."
      );
      refetchDeals();
      setLocation("/dashboard");
    },
    onError: err => {
      toast.error("Failed to start deal: " + err.message);
    },
  });

  const handleShare = () => {
    const url = window.location.href;
    const onSuccess = () => {
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(onSuccess)
        .catch(() => toast.error("Failed to copy link."));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        onSuccess();
      } catch (err) {
        toast.error("Failed to copy link.");
      }
      document.body.removeChild(textArea);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card">
          <div className="container py-4 flex items-center gap-4">
            <div className="w-8 h-8 skeleton-shimmer rounded-lg" />
            <div className="w-32 h-7 skeleton-shimmer" />
          </div>
        </div>
        <div className="container py-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-square w-full skeleton-shimmer rounded-xl" />
            <div>
              <div className="w-3/4 h-10 skeleton-shimmer mb-4" />
              <div className="w-24 h-8 skeleton-shimmer mb-2" />
              <div className="flex gap-2 mb-6">
                <div className="w-24 h-8 skeleton-shimmer rounded-full" />
                <div className="w-32 h-8 skeleton-shimmer rounded-full" />
              </div>
              <div className="border border-border rounded-lg p-6 mb-8">
                <div className="w-28 h-5 skeleton-shimmer mb-4" />
                <div className="w-full h-4 skeleton-shimmer mb-2" />
                <div className="w-full h-4 skeleton-shimmer mb-2" />
                <div className="w-2/3 h-4 skeleton-shimmer" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 h-12 skeleton-shimmer rounded-xl" />
                <div className="flex-1 h-12 skeleton-shimmer rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Item not found
          </h2>
          <Button onClick={() => setLocation("/marketplace")} variant="outline">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const handleWhatsAppContact = () => {
    const profile = sellerProfile as { whatsapp?: string | null };
    if (!profile?.whatsapp) {
      toast.error(
        "Seller hasn't added a WhatsApp number yet. Try contacting them another way."
      );
      return;
    }
    const message = `Hi, I saw your listing for "${item.title}" priced at ₹${item.amount} on BorrowBox. Is it still available?\nLink: ${window.location.href}`;
    const encodedMessage = encodeURIComponent(message);
    const number = profile.whatsapp
      .replace(/\s+/g, "")
      .replace(/^\+/, "");
    window.open(`https://wa.me/${number}?text=${encodedMessage}`, "_blank");
  };

  const isSeller = user?.id === item.sellerId;
  const existingDeal = deals?.find(d => d.buyerId === user?.id);
  const hasExistingDeal = !!existingDeal;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/marketplace")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Item Details</h1>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Image */}
          <div>
            {item.imageUrl ? (
              <div className="w-full aspect-square bg-muted rounded-xl overflow-hidden relative">
                <BlurUpDetailImage
                  src={item.imageUrl}
                  alt={item.title}
                />
              </div>
            ) : (
              (() => {
                const { icon: CategoryIcon, gradient } = getCategoryMeta(
                  item.category ?? undefined
                );
                return (
                  <div
                    className={`w-full aspect-square bg-gradient-to-br ${gradient} rounded-xl flex flex-col items-center justify-center text-white p-6 shadow-md`}
                  >
                    <CategoryIcon className="w-24 h-24 opacity-80 mb-4" />
                    <span className="text-sm font-semibold opacity-90 tracking-widest uppercase">
                      {item.category || "Other"}
                    </span>
                  </div>
                );
              })()
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-4xl font-bold text-foreground">
                {item.title}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className={`flex items-center gap-2 border-border/50 rounded-xl transition-all duration-200 ${
                  copied ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : ""
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500 animate-in zoom-in-50 duration-200" />
                    Link Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share Link
                  </>
                )}
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-3xl font-bold text-accent mb-2">
                ₹{item.amount}
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                    item.status === "OPEN"
                      ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                  }`}
                >
                  {item.status === "OPEN" ? "Available" : "Sold"}
                </span>
                <span
                  className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                    (
                      {
                        New: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30",
                        "Like New":
                          "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/30",
                        Good: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30",
                        Fair: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/30",
                        Poor: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/30",
                      } as Record<string, string>
                    )[item.condition] || "bg-muted text-muted-foreground"
                  }`}
                >
                  Condition: {item.condition || "Good"}
                </span>
              </div>
            </div>

            {item.category && (
              <p className="text-muted-foreground mb-6">
                <strong>Category:</strong> {item.category}
              </p>
            )}

            <div className="bg-card border border-border rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Description
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.description || "No description provided"}
              </p>
            </div>

            {/* Seller Profile & Campus Verification — Social Proof Badge */}
            {sellerProfile && (
              <div 
                onClick={() => setLocation(`/user/${item.sellerId}`)}
                className="glass-card rounded-2xl p-5 mb-8 flex items-center justify-between flex-wrap gap-4 cursor-pointer transition-all duration-300 group hover:-translate-y-0.5 border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-extrabold text-lg group-hover:scale-105 transition-transform shadow-md"
                    style={{
                      backgroundColor: `hsl(${(item.sellerId * 137) % 360}, 65%, 45%)`
                    }}
                  >
                    {sellerProfile.name ? sellerProfile.name[0].toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                        {sellerProfile.name}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5 stroke-[3]" /> Campus Verified
                      </span>
                      {Number(sellerProfile.trustScore?.averageRating || 0) >= 4.0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          <BadgeCheck className="w-3.5 h-3.5" /> Trusted Seller
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      VIT Student Member • Click to view full profile & active listings
                    </p>
                  </div>
                </div>

                {sellerProfile.trustScore && (
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end mb-0.5">
                      <span className="font-extrabold text-base font-tabular text-foreground">
                        {sellerProfile.trustScore.averageRating}
                      </span>
                      <StarRating
                        rating={Math.round(
                          Number(sellerProfile.trustScore.averageRating)
                        )}
                        disabled
                        size={14}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground font-tabular font-medium">
                      {sellerProfile.trustScore.totalReviews} reviews
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons — only for buyers */}
            {!isSeller && isAuthenticated && (
              <>
                {hasExistingDeal ? (
                  <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
                    <Button
                      onClick={() => setLocation(`/confirm/${existingDeal.id}`)}
                      className="flex-1 bg-accent text-accent-foreground font-semibold"
                    >
                      View Active Deal
                    </Button>
                    <Button
                      onClick={() => setShowWhatsAppConfirm(true)}
                      variant="outline"
                      className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1 border-accent text-accent hover:bg-accent/10"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Chat In-App
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none">
                        <DealChat
                          dealId={existingDeal.id}
                          otherPartyName={`Seller #${item.sellerId}`}
                          dealStatus={existingDeal.status}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : item.status === "OPEN" ? (
                  <div className="flex flex-col sm:flex-row gap-4 w-full mb-8">
                    <Button
                      onClick={() => createDealMutation.mutate({ itemId })}
                      disabled={createDealMutation.isPending}
                      className="flex-1 bg-accent text-accent-foreground font-semibold"
                    >
                      {createDealMutation.isPending
                        ? "Processing..."
                        : "I'm Interested"}
                    </Button>
                    <Button
                      onClick={() => setShowWhatsAppConfirm(true)}
                      variant="outline"
                      className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact on WhatsApp
                    </Button>
                  </div>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                    <p className="text-red-900 font-semibold">
                      This item is no longer available — it has been sold to
                      another buyer.
                    </p>
                  </div>
                )}
              </>
            )}

            {isSeller && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <p className="text-blue-900">
                  This is your item. You can manage it from your dashboard.
                </p>
              </div>
            )}

            {!isSeller && isAuthenticated && (
              <div className="mb-8 flex justify-end">
                <ReportListingModal itemId={itemId} itemTitle={item.title} />
              </div>
            )}

            {!isAuthenticated && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                <p className="text-yellow-900 mb-4">
                  Sign in to contact the seller and make a purchase.
                </p>
                <Button onClick={() => {
                  sessionStorage.setItem("redirect_after_login", location);
                  setLocation("/login");
                }} className="w-full">
                  Sign In
                </Button>
              </div>
            )}

            {/* Deal Status */}
            {deals && deals.length > 0 && (
              <div className="mt-8 bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">
                  Active Deals
                </h3>
                {deals.map(deal => (
                  <div key={deal.id} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Deal #{deal.id}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          deal.status === "OPEN"
                            ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
                            : deal.status === "DELIVERED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                              : deal.status === "CONFIRMED"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400"
                                : deal.status === "PAID"
                                  ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400"
                                  : deal.status === "CANCELLED"
                                    ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400"
                        }`}
                      >
                        {deal.status === "OPEN" ? "Open" :
                         deal.status === "Shipped" ? "Meetup Arranged" :
                         deal.status === "DELIVERED" ? "Waiting for Buyer" :
                         deal.status === "CONFIRMED" ? "Awaiting Payment" :
                         deal.status === "PAID" ? "Delivered & Paid" :
                         deal.status === "CANCELLED" ? "Cancelled" :
                         deal.status === "DISPUTED" ? "Disputed" :
                         deal.status === "NEEDS_ATTENTION" ? "Needs Attention" : deal.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showWhatsAppConfirm} onOpenChange={setShowWhatsAppConfirm}>
        <AlertDialogContent className="rounded-2xl border-border/40 glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bold text-xl text-foreground">Opening WhatsApp</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
              You are leaving BorrowBox to chat with the seller on WhatsApp. 
              <br/><br/>
              After your chat, make sure to <strong>return to BorrowBox</strong> to complete the deal securely!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowWhatsAppConfirm(false);
                handleWhatsAppContact();
              }}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              Continue to WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReportListingModal({ itemId, itemTitle }: { itemId: number; itemTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const reportMutation = trpc.items.report.useMutation({
    onSuccess: () => {
      toast.success("Listing reported successfully. Our team will review it.");
      setIsOpen(false);
      setReason("");
      setDescription("");
    },
    onError: (err) => {
      toast.error("Failed to report listing: " + err.message);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Report Listing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report Listing: {itemTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for reporting</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fake">Fake or misleading</SelectItem>
                <SelectItem value="scam">Suspected scam</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional details (optional)</label>
            <Textarea
              placeholder="Provide more context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={!reason || reportMutation.isPending}
            onClick={() => reportMutation.mutate({ itemId, reason, description })}
          >
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Blur-up image — starts blurred/zoomed, sharpens on load */
function BlurUpDetailImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);

  return (
    <>
      <div className={`absolute inset-0 bg-muted ${loaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 pointer-events-none z-10`} />
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 ${loaded ? 'scale-100 blur-0' : 'scale-105 blur-sm'}`}
        onLoad={onLoad}
      />
    </>
  );
}
