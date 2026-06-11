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
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG as QRCode } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealChat } from "@/components/DealChat";
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

function getCategoryMeta(category?: string) {
  const normalized = category || "Other";
  return categoryMetadata[normalized] || categoryMetadata["Other"];
}

export default function Dashboard() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

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
    Shipped: "Finalized",
    DELIVERED: "Delivered",
    CONFIRMED: "Confirmed",
    PAID: "Delivered & Paid",
    CANCELLED: "Cancelled",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome, {user?.name}!
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your listings and purchases
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/profile")} variant="outline">
                Edit Profile
              </Button>
              <Button
                onClick={() => setLocation("/create-post")}
                className="bg-accent"
              >
                <Plus className="w-4 h-4 mr-2" />
                Post New Item
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-muted/20 border-b border-border py-6">
        <div className="container grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                Total Listings
              </p>
              <h4 className="text-xl font-bold text-foreground">
                {itemsListed}
              </h4>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                Active Sales
              </p>
              <h4 className="text-xl font-bold text-foreground">
                {activeDeals}
              </h4>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                Active Purchases
              </p>
              <h4 className="text-xl font-bold text-foreground">
                {buyerDeals?.length || 0}
              </h4>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">
                Completed Deals
              </p>
              <h4 className="text-xl font-bold text-foreground">
                {deals?.filter(d => d.status === "PAID").length || 0}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-12">
        <Tabs defaultValue="listings" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger
              value="listings"
              className="flex items-center gap-2 rounded-lg py-2 data-[state=active]:bg-background"
            >
              <Store className="w-4 h-4" />
              My Listings
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="flex items-center gap-2 rounded-lg py-2 data-[state=active]:bg-background"
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
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    You haven't posted any items yet.
                  </p>
                  <Button onClick={() => setLocation("/create-post")}>
                    Post Your First Item
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sellerItems.map(item => {
                    const { icon: CategoryIcon, gradient } = getCategoryMeta(
                      item.category ?? undefined
                    );
                    return (
                      <div
                        key={item.id}
                        className="bg-card border border-border rounded-xl p-4 hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Thumbnail / Placeholder */}
                          <div className="w-full h-36 bg-muted rounded-lg overflow-hidden relative mb-4">
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
                                <span className="text-[10px] font-semibold opacity-90 tracking-wide uppercase">
                                  {item.category || "Other"}
                                </span>
                              </div>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xl font-bold text-accent">
                              ₹{item.amount}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.status === "OPEN"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setLocation(`/item/${item.id}`)}
                            >
                              View
                            </Button>
                            {item.status === "OPEN" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setLocation(`/edit-post/${item.id}`)
                                }
                                title="Edit Listing"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  disabled={deleteItemMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Listing
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete **"
                                    {item.title}"**? This action cannot be
                                    undone and will remove the item from the
                                    marketplace.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteItemMutation.mutate({ id: item.id })
                                    }
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Delete
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
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No active deals on your listed items yet.
                  </p>
                  <Button onClick={() => setLocation("/create-post")}>
                    Post Your First Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {deals
                    .filter(d => d.status !== "CANCELLED")
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
                      />
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Purchases Tab */}
          <TabsContent value="purchases" className="space-y-6 outline-none">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Your Purchases & Expressed Interests
              </h2>

              {!buyerDeals || buyerDeals.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    You haven't expressed interest in any items yet.
                  </p>
                  <Button onClick={() => setLocation("/marketplace")}>
                    Browse Marketplace
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {buyerDeals.map(deal => (
                    <PurchasedDealCard
                      key={deal.id}
                      deal={deal}
                      onCancel={() =>
                        cancelDealMutation.mutate({ dealId: deal.id })
                      }
                      isCancelling={cancelDealMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Profile Section */}
        <div className="bg-card border border-border rounded-lg p-8 mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Your Profile
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="text-foreground font-semibold">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Name</p>
              <p className="text-foreground font-semibold">{user?.name}</p>
            </div>
          </div>
          <Button onClick={() => setLocation("/profile")} className="bg-accent">
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
}: {
  deal: any;
  isBuyer?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

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
}: {
  deal: any;
  statusFlow: string[];
  statusLabels: Record<string, string>;
  onStatusUpdate: (status: string) => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  const currentStatusIndex = statusFlow.indexOf(deal.status);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Deal #{deal.id} {deal.item && `— ${deal.item.title}`}
          </h3>
          <p className="text-muted-foreground">
            Amount:{" "}
            <span className="text-accent font-bold">₹{deal.amount}</span>
          </p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            deal.status === "OPEN"
              ? "bg-green-100 text-green-800"
              : deal.status === "DELIVERED"
                ? "bg-blue-100 text-blue-800"
                : deal.status === "CONFIRMED"
                  ? "bg-purple-100 text-purple-800"
                  : deal.status === "CANCELLED"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {statusLabels[deal.status] || deal.status}
        </span>
      </div>

      <div className="mb-6 flex gap-3 flex-wrap">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat In-App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none">
            <DealChat
              dealId={deal.id}
              otherPartyName={`Buyer #${deal.buyerId || "Unknown"}`}
            />
          </DialogContent>
        </Dialog>

        {deal.status !== "PAID" && deal.status !== "CANCELLED" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isUpdating}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Cancel Deal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Deal</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this deal? This will mark the
                  deal as CANCELLED and put the item back on the marketplace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancel}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Cancel Deal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Status Flow */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-3">Update Status:</p>
        <div className="flex gap-2 flex-wrap">
          {statusFlow.map((status, index) => (
            <button
              key={status}
              onClick={() => onStatusUpdate(status)}
              disabled={isUpdating || index <= currentStatusIndex}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                index <= currentStatusIndex
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
            >
              {statusLabels[status] || status}
            </button>
          ))}
        </div>
      </div>

      {/* Deal completion statuses */}
      {deal.status === "PAID" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
          <p className="text-green-900 font-semibold">
            ✅ Deal Complete — Delivered & Paid!
          </p>
          <ReviewModal deal={deal} />
        </div>
      )}

      {deal.status === "CONFIRMED" && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <p className="text-purple-900">
            ✓ Buyer has confirmed delivery. Waiting for buyer to complete
            payment...
          </p>
        </div>
      )}

      {/* Buyer Confirmation Status */}
      {deal.status === "DELIVERED" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-900">
            {deal.buyerConfirmed
              ? "✓ Buyer has confirmed delivery. UPI QR code is ready!"
              : "Waiting for buyer to confirm delivery..."}
          </p>
        </div>
      )}

      {/* UPI QR Code */}
      {deal.buyerConfirmed && deal.upiQrCode && deal.status !== "PAID" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-900 font-semibold mb-3">
            Payment Ready - UPI QR Code:
          </p>
          <div className="bg-white p-4 rounded-lg inline-block">
            <QRCode
              value={deal.upiQrCode}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-xs text-green-800 mt-2">Amount: ₹{deal.amount}</p>
        </div>
      )}
    </div>
  );
}

function PurchasedDealCard({
  deal,
  onCancel,
  isCancelling,
}: {
  deal: any;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const [, setLocation] = useLocation();

  const statusColors: Record<string, string> = {
    OPEN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Shipped:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    DELIVERED:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    CONFIRMED:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
    PAID: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusLabels: Record<string, string> = {
    OPEN: "Open",
    Shipped: "Finalized",
    DELIVERED: "Delivered",
    CONFIRMED: "Confirmed",
    PAID: "Paid",
    CANCELLED: "Cancelled",
  };

  const isDelivered = deal.status === "DELIVERED";
  const isConfirmed = deal.buyerConfirmed === 1;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
      <div className="flex gap-4 items-start md:items-center">
        {deal.item?.imageUrl ? (
          <img
            src={deal.item.imageUrl}
            alt={deal.item.title}
            className="w-20 h-20 object-cover rounded-lg border border-border"
          />
        ) : (
          <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-muted-foreground border border-border">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-bold text-foreground">
              {deal.item?.title || `Item #${deal.itemId}`}
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                statusColors[deal.status] || "bg-muted text-muted-foreground"
              }`}
            >
              {statusLabels[deal.status] || deal.status}
            </span>
            {isConfirmed && (
              <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                ✓ Confirmed
              </span>
            )}
          </div>
          {deal.item?.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {deal.item.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Deal ID:{" "}
              <span className="font-semibold text-foreground">#{deal.id}</span>
            </span>
            <span>•</span>
            <span>
              Amount:{" "}
              <span className="font-bold text-accent text-sm">
                ₹{deal.amount}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
        {deal.status === "PAID" && <ReviewModal deal={deal} isBuyer={true} />}
        {isDelivered && !isConfirmed ? (
          <Button
            onClick={() => setLocation(`/confirm/${deal.id}`)}
            className="bg-green-600 hover:bg-green-700 text-white animate-pulse animate-duration-1000"
          >
            Confirm Delivery
          </Button>
        ) : (
          deal.status !== "CANCELLED" && (
            <Button
              onClick={() => setLocation(`/confirm/${deal.id}`)}
              variant={isConfirmed ? "outline" : "secondary"}
              className="w-full md:w-auto"
            >
              {isConfirmed ? "View Payment QR Code" : "Track Order / Confirm"}
            </Button>
          )
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10 w-full md:w-auto"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat In-App
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none">
            <DealChat
              dealId={deal.id}
              otherPartyName={`Seller #${deal.sellerId}`}
            />
          </DialogContent>
        </Dialog>

        {deal.status !== "PAID" && deal.status !== "CANCELLED" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isCancelling}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground w-full md:w-auto"
              >
                Cancel Deal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Deal</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel this deal? This will mark the
                  deal as CANCELLED and put the item back on the marketplace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onCancel}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
