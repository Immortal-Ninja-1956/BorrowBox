import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { DealChat } from "@/components/DealChat";
import { useAuth } from "@/_core/hooks/useAuth";
import DealTimeline from "./DealTimeline";
import { CheckCircle2, MessageCircle, ShoppingBag, BookOpen, Laptop, Sofa, Shirt, Trophy, Package, ShieldCheck } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export const categoryMetadata: Record<string, { icon: any; gradient: string }> = {
  Books: { icon: BookOpen, gradient: "from-amber-400 to-orange-600" },
  Electronics: { icon: Laptop, gradient: "from-blue-400 to-indigo-600" },
  Furniture: { icon: Sofa, gradient: "from-emerald-400 to-teal-600" },
  Clothing: { icon: Shirt, gradient: "from-pink-400 to-rose-600" },
  Sports: { icon: Trophy, gradient: "from-yellow-400 to-amber-600" },
  Other: { icon: Package, gradient: "from-purple-400 to-violet-600" },
};

export function getCategoryMeta(category?: string) {
  const normalized = category || "Other";
  return categoryMetadata[normalized] || categoryMetadata["Other"];
}

export const statusFlow = ["OPEN", "Shipped", "DELIVERED"];
export const statusLabels: Record<string, string> = {
  OPEN: "Open",
  Shipped: "Meetup Arranged",
  DELIVERED: "Waiting for Buyer",
  CONFIRMED: "Awaiting Payment",
  PAID: "Delivered & Paid",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
  NEEDS_ATTENTION: "Needs Attention",
};
export const URGENT_STATES = ["DISPUTED", "NEEDS_ATTENTION", "DELIVERED", "CONFIRMED"];

export const sortDeals = (dealList: any[]) => {
  return [...dealList].sort((a, b) => {
    const aUrgent = URGENT_STATES.includes(a.status) ? 1 : 0;
    const bUrgent = URGENT_STATES.includes(b.status) ? 1 : 0;
    if (aUrgent !== bUrgent) return bUrgent - aUrgent;
    if (a.status === "PAID" && b.status !== "PAID") return 1;
    if (b.status === "PAID" && a.status !== "PAID") return -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export function ReviewModal({
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
            <p className="text-sm text-muted-foreground">Rate your experience</p>
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

export function DealCard({
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  
  const trpcContext = trpc.useContext();
  
  const confirmWithPinMutation = trpc.deals.confirmWithPin.useMutation({
    onSuccess: () => {
      setIsSuccess(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#6366f1", "#f59e0b", "#3b82f6"],
      });
      toast.success("Deal completed successfully!");
      trpcContext.deals.getBySeller.invalidate();
    },
    onError: err => {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
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
      </div>

      <DealTimeline
        dealId={deal.id}
        currentStatus={deal.status}
        isBuyer={false}
        pinAttempts={deal.pinAttempts}
        pinLockedAt={deal.pinLockedAt}
      />

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

      {(isDisputed || needsAttention) && (
        <div className={`border rounded-xl p-4.5 mb-6 ${isDisputed ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`font-bold text-sm ${isDisputed ? 'text-red-800' : 'text-orange-800'}`}>
            {isDisputed ? "⚠️ This deal is disputed. Please coordinate with the buyer." : "⚠️ This deal needs your attention."}
          </p>
        </div>
      )}

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

      {(deal.status === "DELIVERED" || deal.status === "CONFIRMED") && (
        <div className={`relative overflow-hidden transition-all duration-500 rounded-2xl p-6 mt-4 border ${
          isSuccess 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-background border-primary/25 shadow-[inset_0_0_35px_rgba(99,102,241,0.06)]"
        }`}>
          {/* Subtle Shield Watermark */}
          <ShieldCheck className="absolute -right-6 -bottom-6 w-36 h-36 text-primary/5 pointer-events-none" />

          <h4 className="font-bold text-primary mb-2 flex items-center gap-2 text-base">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Complete the Deal (Secure Handshake)
          </h4>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed relative z-10">
            <strong>1.</strong> Check YOUR OWN banking app for a credit of <strong className="text-foreground font-tabular">₹{deal.amount}</strong> with the note <strong className="text-foreground">BBX-{deal.id}</strong>. Never trust a screenshot. <br/>
            <strong>2.</strong> Once you've verified the payment, ask the buyer for their 6-digit PIN and enter it below to atomically complete the deal.
          </p>
          
          {isLocked ? (
             <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <p className="text-red-600 dark:text-red-400 text-sm font-semibold">
                  PIN entry is locked due to too many failed attempts. Please use the "Raise a Problem" button above to dispute and reset the PIN.
                </p>
             </div>
          ) : isSuccess ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="py-6 flex flex-col items-center justify-center text-center space-y-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">PIN Verified & Deal Complete!</h3>
              <p className="text-xs text-muted-foreground">Funds transferred & transaction locked on blockchain ledger.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
              <motion.div
                animate={{ x: shakeError ? [-8, 8, -6, 6, -3, 3, 0] : 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full sm:w-auto"
              >
                <InputOTP 
                  maxLength={6} 
                  value={pin} 
                  onChange={setPin}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="6-digit security verification PIN"
                >
                  <InputOTPGroup className="bg-muted/30 p-1 rounded-xl border border-border/50">
                    <InputOTPSlot index={0} className="w-11 h-14 text-xl sm:w-13 sm:h-16 sm:text-2xl font-bold font-tabular rounded-lg transition-transform duration-100 focus:scale-105" />
                    <InputOTPSlot index={1} className="w-11 h-14 text-xl sm:w-13 sm:h-16 sm:text-2xl font-bold font-tabular rounded-lg transition-transform duration-100 focus:scale-105" />
                    <InputOTPSlot index={2} className="w-11 h-14 text-xl sm:w-13 sm:h-16 sm:text-2xl font-bold font-tabular rounded-lg transition-transform duration-100 focus:scale-105" />
                    <InputOTPSlot index={3} className="w-11 h-14 text-xl sm:w-13 sm:h-16 sm:text-2xl font-bold font-tabular rounded-lg transition-transform duration-100 focus:scale-105" />
                    <InputOTPSlot index={4} className="w-11 h-14 text-xl sm:w-13 sm:h-16 sm:text-2xl font-bold font-tabular rounded-lg transition-transform duration-100 focus:scale-105" />
                    <InputOTPSlot index={5} className="w-11 h-14 text-xl sm:w-13 sm:h-16 sm:text-2xl font-bold font-tabular rounded-lg transition-transform duration-100 focus:scale-105" />
                  </InputOTPGroup>
                </InputOTP>
              </motion.div>

              <motion.div
                animate={{ scale: pin.length === 6 ? [1, 1.04, 1] : 1 }}
                transition={{ duration: 0.3 }}
                className="w-full sm:w-auto"
              >
                <Button
                  onClick={() => confirmWithPinMutation.mutate({ dealId: deal.id, pin })}
                  disabled={pin.length !== 6 || confirmWithPinMutation.isPending}
                  className={`font-bold px-8 w-full sm:w-auto h-14 sm:h-16 rounded-xl transition-all duration-300 ${
                    pin.length === 6 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/40 animate-pulse" 
                      : "bg-primary/80 text-primary-foreground"
                  }`}
                >
                  {confirmWithPinMutation.isPending ? "Verifying..." : "Verify & Complete"}
                </Button>
              </motion.div>
            </div>
          )}
          
          {!isLocked && !isSuccess && (
            <div className={`mt-4 p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 relative z-10 ${
              (deal.pinAttempts || 0) >= 2
                ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                : (deal.pinAttempts || 0) > 0
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : "bg-muted/50 border-border/30 text-muted-foreground"
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider">
                  {(deal.pinAttempts || 0) >= 2 ? "⚠️ High Risk" : (deal.pinAttempts || 0) > 0 ? "⚠️ PIN Attempts" : "🛡️ PIN Security"}
                </span>
                <span className="text-xs font-semibold">
                  {3 - (deal.pinAttempts || 0)} of 3 remaining attempt(s)
                </span>
              </div>
              <span className="text-[11px] opacity-80">
                Locks automatically on 3rd failed attempt
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PurchasedDealCard({
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
    <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col gap-6">
      <DealTimeline
        dealId={deal.id}
        currentStatus={deal.status}
        isBuyer={true}
        pinAttempts={deal.pinAttempts}
        pinLockedAt={deal.pinLockedAt}
      />
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
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
  </div>
);
}
