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

export default function BuyerConfirmation() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { dealId } = useParams<{ dealId: string }>();
  const dealIdNum = parseInt(dealId || "0");

  const {
    data: deal,
    isLoading,
    refetch: refetchDeal,
  } = trpc.deals.getById.useQuery({ id: dealIdNum });
  const { data: qrData, refetch: refetchQr } = trpc.deals.getUpiQrCode.useQuery(
    { dealId: dealIdNum },
    { enabled: !!deal?.buyerConfirmed }
  );

  const confirmDeliveryMutation = trpc.deals.confirmDelivery.useMutation({
    onSuccess: () => {
      toast.success("Delivery confirmed! UPI QR code is ready for payment.");
      refetchDeal();
      refetchQr();
    },
    onError: error => {
      toast.error("Failed to confirm delivery: " + error.message);
    },
  });

  const markPaidMutation = trpc.deals.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Payment marked as complete! Deal is now closed.");
      refetchDeal();
    },
    onError: error => {
      toast.error("Failed to mark as paid: " + error.message);
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
            Only the buyer can confirm delivery
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-4 flex items-center gap-4">
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
      </div>

      {/* Content */}
      <div className="container max-w-2xl py-12">
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
                    ? "Confirmed"
                    : deal.status}
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
            <Button
              onClick={() => setLocation("/dashboard")}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        ) : !isDelivered && !isConfirmed ? (
          /* === STATE: Waiting for seller to mark as DELIVERED === */
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
            <h3 className="text-lg font-bold text-yellow-900 mb-4">
              Waiting for Seller
            </h3>
            <p className="text-yellow-800">
              The seller has not marked this item as DELIVERED yet. Once they
              do, you'll be able to confirm delivery and proceed with payment.
            </p>
          </div>
        ) : isConfirmed ? (
          /* === STATE: Confirmed delivery, show QR + Mark as Paid === */
          <div className="space-y-8">
            {/* Confirmed Banner */}
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
                <div className="bg-white p-8 rounded-lg border border-border flex flex-col items-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code to pay:
                  </p>
                  {qrData?.qrCode ? (
                    <div className="bg-white p-4 rounded-lg border-2 border-accent">
                      <QRCode
                        value={qrData.qrCode}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  ) : (
                    <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-center text-muted-foreground">
                        Generating QR code...
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Or use the UPI link above to complete payment
                  </p>
                </div>

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    How to Pay:
                  </h4>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>
                      Open your UPI app (Google Pay, PhonePe, Paytm, etc.)
                    </li>
                    <li>Scan the QR code or tap the UPI link</li>
                    <li>Verify the amount and seller details</li>
                    <li>Enter your UPI PIN to complete payment</li>
                    <li>
                      Come back here and click "I've Completed Payment" below
                    </li>
                  </ol>
                </div>

                {/* Mark as Paid Button */}
                <div className="bg-accent/5 border-2 border-accent rounded-lg p-6">
                  <h4 className="font-bold text-foreground mb-3">
                    Done paying? Complete the deal:
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    After you've successfully paid via UPI, click the button
                    below to mark this deal as complete. Both you and the seller
                    will see it as <strong>"Delivered & Paid"</strong>.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6 font-semibold"
                        disabled={markPaidMutation.isPending}
                      >
                        {markPaidMutation.isPending
                          ? "Processing..."
                          : "✓ I've Completed Payment"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you've completed the UPI payment? This
                          action cannot be undone and will mark the deal as
                          complete.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            markPaidMutation.mutate({ dealId: dealIdNum })
                          }
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Confirm
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
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

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Only confirm delivery if you have
                received and inspected the item. Once confirmed, the seller's
                UPI QR code will be generated for payment.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
