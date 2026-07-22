import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { DealCard, statusFlow, statusLabels, sortDeals } from "./Shared";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SellerDeals({ deals, sellerItems, refetchDeals, refetchItems, openReviewDealId, setOpenReviewDealId }: { deals: any[], sellerItems: any[], refetchDeals: () => void, refetchItems: () => void, openReviewDealId: number | null, setOpenReviewDealId: (id: number | null) => void }) {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  const trpcContext = trpc.useUtils();

  const updateStatusMutation = trpc.deals.updateStatus.useMutation({
    onMutate: async (newVar) => {
      await trpcContext.deals.getBySeller.cancel();
      const previousDeals = trpcContext.deals.getBySeller.getData();
      trpcContext.deals.getBySeller.setData(undefined, (old: any) => {
        if (!old) return [];
        return old.map((d: any) => (d.id === newVar.dealId ? { ...d, status: newVar.status } : d));
      });
      return { previousDeals };
    },
    onSuccess: () => {
      toast.success("Deal status updated!");
    },
    onError: (error, _newVar, context) => {
      if (context?.previousDeals) {
        trpcContext.deals.getBySeller.setData(undefined, context.previousDeals);
      }
      toast.error("Failed to update status: " + error.message);
    },
    onSettled: () => {
      trpcContext.deals.getBySeller.invalidate();
      refetchDeals();
    },
  });

  const cancelDealMutation = trpc.deals.cancel.useMutation({
    onMutate: async (newVar) => {
      await trpcContext.deals.getBySeller.cancel();
      const previousDeals = trpcContext.deals.getBySeller.getData();
      trpcContext.deals.getBySeller.setData(undefined, (old: any) => {
        if (!old) return [];
        return old.map((d: any) => (d.id === newVar.dealId ? { ...d, status: "CANCELLED" } : d));
      });
      return { previousDeals };
    },
    onSuccess: () => {
      toast.success("Deal cancelled successfully!");
    },
    onError: (error, _newVar, context) => {
      if (context?.previousDeals) {
        trpcContext.deals.getBySeller.setData(undefined, context.previousDeals);
      }
      toast.error("Failed to cancel deal: " + error.message);
    },
    onSettled: () => {
      trpcContext.deals.getBySeller.invalidate();
      refetchDeals();
      refetchItems();
    },
  });

  if (!deals || deals.filter(d => d.status !== "CANCELLED").length === 0) {
    return (
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
    );
  }

  const activeDealsList = sortDeals(deals.filter(d => d.status !== "CANCELLED" && d.status !== "PAID"));
  const paginatedActiveDeals = activeDealsList.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(activeDealsList.length / itemsPerPage);

  const completedDealsList = sortDeals(deals.filter(d => d.status === "PAID"));

  return (
    <div className="space-y-6">
      {paginatedActiveDeals.map(deal => (
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
          onCancel={() => cancelDealMutation.mutate({ dealId: deal.id })}
          isUpdating={updateStatusMutation.isPending || cancelDealMutation.isPending}
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
            Completed Sales
            <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full">{completedDealsList.length}</span>
          </summary>
          <div className="p-4 space-y-4 border-t border-border/40">
            {completedDealsList.map(deal => (
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
                  onCancel={() => cancelDealMutation.mutate({ dealId: deal.id })}
                  isUpdating={updateStatusMutation.isPending || cancelDealMutation.isPending}
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
