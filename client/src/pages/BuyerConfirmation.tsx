import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG as QRCode } from "qrcode.react";
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
import { Input } from "@/components/ui/input";

import { usePageMetadata } from "@/_core/hooks/usePageMetadata";
import DealTimeline from "@/components/dashboard/DealTimeline";

export default function BuyerConfirmation() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { dealId } = useParams<{ dealId: string }>();
  const dealIdNum = parseInt(dealId || "0");
  
  const [pinVisible, setPinVisible] = useState(false);
  const [utr, setUtr] = useState("");

  const {
    data: deal,
    isLoading,
    refetch: refetchDeal,
  } = trpc.deals.getById.useQuery(
    { id: dealIdNum },
    {
      staleTime: 0,
      refetchInterval: (query) => {
        const currentDeal = query.state?.data;
        if (currentDeal && ["PAID", "CANCELLED"].includes(currentDeal.status)) {
          return false;
        }
        // Exponential backoff: start at 3s, step up to 5s -> 10s -> max 30s for long open/shipped deals
        const updates = query.state?.dataUpdateCount ?? 0;
        if (updates <= 3) return 3000;
        if (updates <= 8) return 5000;
        if (updates <= 15) return 10000;
        return 30000;
      },
      refetchIntervalInBackground: false,
    }
  );

  usePageMetadata(
    deal ? `Deal #${deal.id} - ${deal.item?.title || "Confirmation"}` : "Delivery Confirmation",
    "Confirm item delivery, access the secure UPI QR code, and complete your purchase handshake."
  );
  const { data: qrData, refetch: refetchQr } = trpc.deals.getUpiQrCode.useQuery(
    { dealId: dealIdNum },
    { enabled: !!deal?.buyerConfirmed }
  );

  const { data: pinData, refetch: refetchPin } = trpc.deals.getMyDealPin.useQuery(
    { dealId: dealIdNum },
    { enabled: !!deal && !["CANCELLED", "PAID"].includes(deal.status) }
  );

  const confirmDeliveryMutation = trpc.deals.confirmDelivery.useMutation({
    onSuccess: () => {
      toast.success("Delivery confirmed! UPI QR code is ready for payment.");
      refetchDeal();
      refetchQr();
      refetchPin();
    },
    onError: error => {
      toast.error("Failed to confirm delivery: " + error.message);
    },
  });

  const raiseDisputeMutation = trpc.deals.raiseDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute raised. The PIN has been regenerated.");
      refetchDeal();
      refetchPin();
    },
    onError: error => {
      toast.error("Failed to raise dispute: " + error.message);
    },
  });

  const submitUtrMutation = trpc.deals.submitUtr.useMutation({
    onSuccess: () => {
      toast.success("UTR submitted successfully. Thank you!");
      refetchDeal();
    },
    onError: error => {
      toast.error("Failed to submit UTR: " + error.message);
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Deal not found
          </h2>
          <Button onClick={() => setLocation("/marketplace")} variant="outline">
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.id !== deal.buyerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Only the buyer can view this page
          </h2>
          <Button onClick={() => setLocation("/")} variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const isDelivered = deal.status === "DELIVERED";
  const isConfirmed = deal.buyerConfirmed === 1;
  const isPaid = deal.status === "PAID";
  const isDisputed = deal.status === "DISPUTED";
  const needsAttention = deal.status === "NEEDS_ATTENTION";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              Delivery Confirmation
            </h1>
          </div>
          {!isPaid && deal.status !== "CANCELLED" && (
             <AlertDialog>
             <AlertDialogTrigger asChild>
               <Button variant="destructive" size="sm" disabled={raiseDisputeMutation.isPending}>
                 Raise a Problem
               </Button>
             </AlertDialogTrigger>
             <AlertDialogContent>
               <AlertDialogHeader>
                 <AlertDialogTitle>Raise a Dispute</AlertDialogTitle>
                 <AlertDialogDescription>
                   Are you sure you want to raise a dispute for this deal? This will freeze the deal and regenerate the PIN. Use this if there's an issue with the item or payment.
                 </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                 <AlertDialogAction onClick={() => raiseDisputeMutation.mutate({ dealId: dealIdNum })}>
                   Yes, Raise Dispute
                 </AlertDialogAction>
               </AlertDialogFooter>
             </AlertDialogContent>
           </AlertDialog>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-2xl py-12">
        <DealTimeline
          dealId={deal.id}
          currentStatus={deal.status}
          isBuyer={true}
          pinAttempts={deal.pinAttempts}
          pinLockedAt={deal.pinLockedAt}
        />
        {/* Status Banners */}
        {isDisputed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-red-900 mb-1">Deal Disputed</h3>
              <p className="text-red-800 text-sm">
                This deal is currently disputed. The PIN has been regenerated. If you've already paid, please submit your UTR reference below.
              </p>
            </div>
          </div>
        )}
        {needsAttention && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-orange-900 mb-1">Needs Attention</h3>
              <p className="text-orange-800 text-sm">
                This deal has been idle for a while but cannot be auto-cancelled. Please complete or dispute the deal.
              </p>
            </div>
          </div>
        )}

        {/* Deal Info */}
        <div className="bg-card border border-border rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Deal Details
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Deal ID:</span>
              <span className="font-semibold text-foreground">#{deal.id}</span>
            </div>
            {deal.item && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-semibold text-foreground">
                  {deal.item.title}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount:</span>
              <span className="text-2xl font-bold text-accent">
                ₹{deal.amount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current Status:</span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  isPaid
                    ? "bg-green-100 text-green-800"
                    : isDisputed
                    ? "bg-red-100 text-red-800"
                    : deal.status === "CONFIRMED"
                      ? "bg-purple-100 text-purple-800"
                      : deal.status === "DELIVERED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {isPaid
                  ? "Delivered & Paid"
                  : deal.status === "CONFIRMED"
                    ? "Payment Ready"
                    : deal.status === "DELIVERED"
                      ? "Action Required: Confirm Handover"
                      : deal.status === "Shipped"
                        ? "Meetup Arranged"
                        : deal.status === "CANCELLED"
                          ? "Cancelled"
                          : deal.status === "DISPUTED"
                            ? "Disputed"
                            : deal.status === "NEEDS_ATTENTION"
                              ? "Needs Attention"
                              : "Open"}
              </span>
            </div>
          </div>
        </div>

        {/* === STATE: PAID (Final) === */}
        {isPaid ? (
          <div className="space-y-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-8">
              <div className="flex items-center gap-3 mb-4">
                <BadgeCheck className="w-10 h-10 text-green-600" />
                <h3 className="text-xl font-bold text-green-900">
                  Deal Complete — Delivered & Paid!
                </h3>
              </div>
              <p className="text-green-800">
                This deal has been successfully completed. The item has been
                delivered and payment has been made. Thank you for using
                BorrowBox!
              </p>
            </div>
            
            {/* Optional UTR Submission post-payment */}
            {!deal.utr && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="font-semibold text-foreground mb-2">Optional: Add Payment Reference (UTR)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your 12-digit UPI reference number from your payment app. Takes 10 seconds, protects you if this deal is ever disputed.
                </p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="12-digit UTR number" 
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    maxLength={12}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <Button 
                    onClick={() => submitUtrMutation.mutate({ dealId: dealIdNum, utr })}
                    disabled={utr.length !== 12 || submitUtrMutation.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
            {deal.utr && (
               <div className="bg-card border border-border rounded-lg p-6 flex justify-between items-center">
                 <span className="font-semibold text-foreground">Payment Reference (UTR):</span>
                 <span className="text-muted-foreground">{deal.utr}</span>
               </div>
            )}

            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        ) : !isDelivered && !isConfirmed && deal.status !== "CONFIRMED" ? (
          /* === STATE: Waiting for seller to mark as DELIVERED === */
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center gap-2">
              Waiting for Seller
              <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
            </h3>
            <p className="text-yellow-800">
              The seller has not marked this item as DELIVERED yet. Once they
              do, you'll be able to confirm delivery and proceed with payment.
            </p>
          </div>
        ) : isConfirmed || deal.status === "CONFIRMED" || isDisputed || needsAttention ? (
          /* === STATE: Confirmed delivery/Payment ready, show QR + Reveal PIN === */
          <div className="space-y-8">
            {/* Confirmed Banner — only show if the buyer has explicitly tapped the confirm button (buyerConfirmed === 1) */}
            {isConfirmed && !isDisputed && !needsAttention && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <h3 className="text-lg font-bold text-green-900">
                    Delivery Confirmed!
                  </h3>
                </div>
                <p className="text-green-800">
                  You've confirmed delivery. The seller's UPI QR code is now ready
                  for payment.
                </p>
              </div>
            )}

            {/* UPI QR Code */}
            <div className="bg-card border border-border rounded-lg p-8">
              <h3 className="text-lg font-bold text-foreground mb-6">
                Payment Instructions
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    UPI Payment Details:
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-foreground">
                      <strong>Amount:</strong> ₹{deal.amount}
                    </p>
                    <p className="text-sm text-foreground mt-2">
                      <strong>UPI Link:</strong>
                    </p>
                    <p className="text-xs text-accent font-mono mt-1 break-all">
                      {qrData?.qrCode || "Generating UPI link..."}
                    </p>
                  </div>
                </div>

                {/* QR Code Display */}
                <div 
                  className="bg-white p-8 rounded-lg border border-border flex flex-col items-center"
                  onClick={() => (window.screen.orientation as any)?.lock?.('portrait').catch(() => {})}
                >
                  <p className="text-sm text-muted-foreground mb-4 font-semibold">
                    Scan this QR code to pay:
                  </p>
                  {qrData?.qrCode ? (
                    <div className="flex flex-col items-center w-full">
                      <div className="bg-white p-4 rounded-xl border-2 border-accent shadow-md inline-block w-full max-w-[320px] mb-6">
                        <QRCode
                          value={qrData.qrCode}
                          size={100}
                          style={{ width: "100%", height: "auto", minWidth: "200px" }}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <Button asChild className="w-full max-w-[320px] bg-green-600 hover:bg-green-700 text-white font-bold h-12 text-base rounded-xl">
                        <a href={qrData.qrCode}>Open in UPI App</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full max-w-[320px] aspect-square bg-muted rounded-xl border-2 border-border flex items-center justify-center">
                      <div className="text-center text-muted-foreground flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/50" />
                        <p className="font-medium text-sm">Generating secure QR code...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* PIN Reveal Action */}
                <div className="bg-accent/5 border-2 border-accent rounded-lg p-6 text-center">
                  <h4 className="font-bold text-foreground mb-3">
                    Complete the deal
                  </h4>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    Read this PIN to the seller <strong>ONLY</strong> after you have paid AND have the item in hand.
                  </p>
                  
                  {!pinVisible ? (
                    <Button 
                      size="lg" 
                      onClick={() => setPinVisible(true)}
                      className="w-full md:w-auto font-semibold"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Reveal my PIN
                    </Button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                      <div className="text-6xl font-mono font-bold tracking-widest text-accent bg-background py-6 rounded-lg border-2 border-dashed border-accent">
                        {pinData?.pin || "------"}
                      </div>
                      <p className="text-sm font-semibold text-destructive">
                        Do not show this to the seller until payment is successful.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Dispute UTR Submission */}
                {isDisputed && !deal.utr && (
                   <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-4">
                     <h3 className="font-semibold text-red-900 mb-2">Submit Payment Evidence</h3>
                     <p className="text-sm text-red-800 mb-4">
                       Since this deal is disputed, if you have already transferred money, please provide the 12-digit UTR from your bank app.
                     </p>
                     <div className="flex gap-2">
                       <Input 
                         placeholder="12-digit UTR number" 
                         value={utr}
                         onChange={(e) => setUtr(e.target.value)}
                         maxLength={12}
                         className="bg-white"
                       />
                       <Button 
                         variant="destructive"
                         onClick={() => submitUtrMutation.mutate({ dealId: dealIdNum, utr })}
                         disabled={utr.length !== 12 || submitUtrMutation.isPending}
                       >
                         Submit UTR
                       </Button>
                     </div>
                   </div>
                )}
                 {deal.utr && (
                   <div className="bg-card border border-border rounded-lg p-6 flex justify-between items-center mt-4">
                     <span className="font-semibold text-foreground">Submitted UTR:</span>
                     <span className="text-muted-foreground font-mono">{deal.utr}</span>
                   </div>
                 )}
              </div>
            </div>
          </div>
        ) : (
          /* === STATE: DELIVERED but not confirmed yet === */
          <div className="space-y-6">
            {/* Confirmation Prompt */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
              <h3 className="text-lg font-bold text-blue-900 mb-4">
                Confirm Delivery
              </h3>
              <p className="text-blue-800 mb-6">
                Have you received the item in good condition? Please confirm
                delivery to proceed with payment.
              </p>
              <Button
                onClick={() =>
                  confirmDeliveryMutation.mutate({ dealId: dealIdNum })
                }
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={confirmDeliveryMutation.isPending}
              >
                {confirmDeliveryMutation.isPending
                  ? "Confirming..."
                  : "Confirm Delivery"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
