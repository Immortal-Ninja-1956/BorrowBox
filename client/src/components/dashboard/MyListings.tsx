import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getCategoryMeta } from "./Shared";
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

export default function MyListings({ sellerItems, refetchItems }: { sellerItems: any[], refetchItems: () => void }) {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;
  
  const deleteItemMutation = trpc.items.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted.");
      refetchItems();
    },
    onError: error => {
      toast.error("Failed to delete item: " + error.message);
    },
  });

  if (!sellerItems || sellerItems.length === 0) {
    return (
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
    );
  }

  const paginatedItems = sellerItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(sellerItems.length / itemsPerPage);

  return (
    <div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedItems.map(item => {
          const { icon: CategoryIcon, gradient } = getCategoryMeta(item.category ?? undefined);
          return (
            <div
              key={item.id}
              className="glass-card premium-hover-card rounded-2xl p-5 flex flex-col justify-between h-[360px]"
            >
              <div>
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
                      onClick={() => setLocation(`/edit-post/${item.id}`)}
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
                          onClick={() => deleteItemMutation.mutate({ id: item.id })}
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
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="flex items-center text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
      )}
    </div>
  );
}
