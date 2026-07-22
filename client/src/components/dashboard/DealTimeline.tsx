import React from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";

interface DealTimelineProps {
  dealId: number;
  currentStatus: string;
  isBuyer?: boolean;
  pinAttempts?: number;
  pinLockedAt?: any;
}

interface Step {
  id: string;
  title: string;
  description: string;
  nextStepGuide: {
    buyer: string;
    seller: string;
  };
}

const STEPS: Step[] = [
  {
    id: "OPEN",
    title: "1. Initiated",
    description: "Deal created",
    nextStepGuide: {
      buyer: "Contact the seller via in-app chat or WhatsApp to arrange a campus meetup.",
      seller: "Coordinate with buyer to agree on a convenient campus location and time.",
    },
  },
  {
    id: "Shipped",
    title: "2. Meetup Arranged",
    description: "Meetup in progress",
    nextStepGuide: {
      buyer: "Meet seller at the agreed campus spot and inspect the item thoroughly.",
      seller: "Bring the item to the meetup spot and let the buyer inspect it.",
    },
  },
  {
    id: "DELIVERED",
    title: "3. Delivery & PIN",
    description: "Handshake & PIN code",
    nextStepGuide: {
      buyer: "Confirm delivery to view the secure UPI QR code and access your 6-digit PIN.",
      seller: "Verify UPI payment in your banking app, then ask buyer for their 6-digit PIN.",
    },
  },
  {
    id: "PAID",
    title: "4. Completed",
    description: "Delivered & Paid",
    nextStepGuide: {
      buyer: "Deal complete! Write a review to build campus trust.",
      seller: "Payment received & deal complete! Write a review for the buyer.",
    },
  },
];

export const DealTimeline: React.FC<DealTimelineProps> = ({
  dealId,
  currentStatus,
  isBuyer = false,
  pinAttempts = 0,
  pinLockedAt = null,
}) => {
  const { data: events } = trpc.deals.getEvents.useQuery(
    { dealId },
    { enabled: !!dealId, refetchInterval: 5000 }
  );

  // Map state to step index (0..3)
  const getStepIndex = (status: string) => {
    switch (status) {
      case "OPEN":
      case "Contacted":
        return 0;
      case "Shipped":
        return 1;
      case "DELIVERED":
      case "CONFIRMED":
        return 2;
      case "PAID":
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isFrozen = ["DISPUTED", "NEEDS_ATTENTION", "CANCELLED"].includes(currentStatus);

  // Helper to find event timestamp for a given status step
  const getTimestampForStep = (stepId: string) => {
    if (!events) return null;
    const match = events.find(
      (e) =>
        e.toStatus === stepId ||
        (stepId === "OPEN" && e.fromStatus === "OPEN") ||
        (stepId === "DELIVERED" && (e.toStatus === "DELIVERED" || e.toStatus === "CONFIRMED"))
    );
    if (!match) return null;
    return new Date(match.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  };

  const activeStep = STEPS[Math.min(currentIndex, STEPS.length - 1)];

  return (
    <div className="bg-card/70 border border-border/50 rounded-2xl p-5 my-4 backdrop-blur-xs">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Deal Progress & Security Timeline
        </h4>
        {isFrozen && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            {currentStatus === "CANCELLED" ? "Cancelled" : "Frozen / Disputed"}
          </span>
        )}
      </div>

      {/* Stepper Progress Pipeline */}
      <div className="relative flex items-center justify-between mb-6 px-2">
        {/* Connecting Line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-border/60 -z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-primary transition-all duration-500 -z-0"
          style={{
            width: `${(currentIndex / (STEPS.length - 1)) * 90}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex || currentStatus === "PAID";
          const isCurrent = idx === currentIndex && currentStatus !== "PAID" && !isFrozen;
          const timestamp = getTimestampForStep(step.id);

          return (
            <div key={step.id} className="relative flex flex-col items-center group z-10">
              {/* Step Node */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  isCompleted
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    : isCurrent
                    ? "bg-primary border-4 border-background text-primary-foreground ring-4 ring-primary/20 scale-110"
                    : "bg-muted text-muted-foreground border border-border/60"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>

              {/* Step Label */}
              <span
                className={`text-[11px] font-semibold mt-2 text-center max-w-[70px] sm:max-w-none ${
                  isCurrent
                    ? "text-primary font-bold"
                    : isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>

              {/* Timestamp */}
              {timestamp && (
                <span className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono">
                  {timestamp}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Next Step Guidance Callout Box */}
      {!isFrozen && activeStep && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <span className="font-bold text-primary uppercase tracking-wider block mb-0.5">
              What to do next ({isBuyer ? "Buyer" : "Seller"}):
            </span>
            <p className="text-foreground/90 leading-relaxed">
              {isBuyer ? activeStep.nextStepGuide.buyer : activeStep.nextStepGuide.seller}
            </p>

            {/* Special Guidance for PIN Handshake Step */}
            {currentIndex === 2 && (
              <div className="mt-2 pt-2 border-t border-primary/15 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  PIN Entry Status:
                </span>
                <span className={`font-bold ${pinAttempts > 0 ? "text-amber-500" : "text-primary"}`}>
                  {pinLockedAt ? "🚨 Locked" : `${3 - pinAttempts} attempt(s) left`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {isFrozen && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3.5 flex items-center gap-3 text-xs text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>
            {currentStatus === "CANCELLED"
              ? "This deal was cancelled and is no longer active."
              : "This deal is currently under dispute review. Automatic status updates are frozen."}
          </p>
        </div>
      )}
    </div>
  );
};

export default DealTimeline;
