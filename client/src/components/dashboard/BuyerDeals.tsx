import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { PurchasedDealCard, sortDeals } from "./Shared";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function BuyerDeals({ buyerDeals, refetchBuyerDeals, openReviewDealId, setOpenReviewDealId }: { buyerDeals: any[], refetchBuyerDeals: () => void, openReviewDealId: number | null, setOpenReviewDealId: (id: number | null) => void }) {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const cancelDealMutation = trpc.deals.cancel.useMutation({
    onSuccess: () => {
      toast.success("Deal cancelled successfully!");
      refetchBuyerDeals();
    },
    onError: error => {
      toast.error("Failed to cancel deal: " + error.message);
    },
  });

  if (!buyerDeals || buyerDeals.length === 0) {
    return (
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
    );
  }

  const activeDealsList = sortDeals(buyerDeals.filter(d => d.status !== "CANCELLED" && d.status !== "PAID"));
  const paginatedActiveDeals = activeDealsList.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(activeDealsList.length / itemsPerPage);

  const completedDealsList = sortDeals(buyerDeals.filter(d => d.status === "PAID"));

  return (
    <div className="space-y-6">
      {paginatedActiveDeals.map(deal => (
        <PurchasedDealCard
          key={deal.id}
          deal={deal}
          onCancel={() => cancelDealMutation.mutate({ dealId: deal.id })}
          isCancelling={cancelDealMutation.isPending}
          triggerReviewOpen={openReviewDealId === deal.id}
          onTriggerReviewOpenHandled={() => setOpenReviewDealId(null)}
        />
      ))}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}

      {completedDealsList.length > 0 && (
        <details className="group border border-border/40 rounded-xl overflow-hidden bg-card/20 mt-8">
          <summary className="px-6 py-4 font-bold cursor-pointer flex items-center justify-between text-muted-foreground hover:bg-card/40 transition-colors list-none [&::-webkit-details-marker]:hidden">
            Completed Purchases
            <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">{completedDealsList.length}</span>
          </summary>
          <div className="p-4 space-y-4 border-t border-border/40">
            {completedDealsList.map(deal => (
              <PurchasedDealCard
                key={deal.id}
                deal={deal}
                onCancel={() => cancelDealMutation.mutate({ dealId: deal.id })}
                isCancelling={cancelDealMutation.isPending}
                triggerReviewOpen={openReviewDealId === deal.id}
                onTriggerReviewOpenHandled={() => setOpenReviewDealId(null)}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
