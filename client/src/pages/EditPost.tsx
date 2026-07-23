import { useAuth } from "@/_core/hooks/useAuth";
import { usePageMetadata } from "@/_core/hooks/usePageMetadata";
import ItemForm, { ItemFormData } from "@/components/ItemForm";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function EditPost() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const itemId = parseInt(id || "0");

  const {
    data: item,
    isLoading: itemLoading,
    error,
  } = trpc.items.getById.useQuery({ id: itemId });

  usePageMetadata(
    item ? `Edit "${item.title}"` : "Edit Listing",
    "Modify the details, price, condition, or image for your active campus listing."
  );

  const updateItemMutation = trpc.items.update.useMutation({
    onSuccess: () => {
      toast.success("Listing updated successfully!");
      setLocation(`/item/${itemId}`);
    },
    onError: (err) => {
      toast.error("Failed to update listing: " + err.message);
    },
  });

  const handleSubmit = async (formData: ItemFormData) => {
    updateItemMutation.mutate({
      id: itemId,
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      condition: formData.condition,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  if (authLoading || itemLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center p-8 bg-card border border-border rounded-xl">
          <h2 className="text-xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The item you are trying to edit does not exist or has been removed.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (user && item.sellerId !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center p-8 bg-card border border-border rounded-xl">
          <h2 className="text-xl font-bold mb-2">Unauthorized</h2>
          <p className="text-muted-foreground mb-4">
            You do not have permission to edit this listing.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <ItemForm
      mode="edit"
      initialData={{
        title: item.title,
        description: item.description || "",
        amount: String(item.amount),
        category: item.category || "Other",
        condition: item.condition as any,
        imageUrl: item.imageUrl || "",
      }}
      onSubmit={handleSubmit}
      isSubmitting={updateItemMutation.isPending}
    />
  );
}
