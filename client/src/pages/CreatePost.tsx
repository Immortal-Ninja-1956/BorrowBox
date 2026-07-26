import { useAuth } from "@/_core/hooks/useAuth";
import { usePageMetadata } from "@/_core/hooks/usePageMetadata";
import ItemForm, { ItemFormData } from "@/components/ItemForm";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CreatePost() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  usePageMetadata(
    "Post an Item",
    "Create a new listing to buy, sell, rent, or share items with other students on campus."
  );

  const { data: serverProfile } = trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: userItems } = trpc.items.getBySeller.useQuery(
    { sellerId: user?.id as number },
    { enabled: !!user?.id }
  );

  const isUnverified =
    serverProfile && !(serverProfile as any).whatsappVerified;
  const hasReachedUnverifiedLimit =
    isUnverified && userItems && userItems.length >= 1;

  const createItemMutation = trpc.items.create.useMutation({
    onSuccess: () => {
      toast.success("Item posted successfully!");
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error("Failed to post item: " + error.message);
    },
  });

  const handleSubmit = async (formData: ItemFormData) => {
    if (hasReachedUnverifiedLimit) {
      toast.error(
        "You have reached the limit of 1 unverified listing. Please verify your WhatsApp number."
      );
      return;
    }

    createItemMutation.mutate({
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      condition: formData.condition,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 auth-bg">
        <div className="max-w-3xl mx-auto">
          <div className="w-32 h-6 skeleton-shimmer rounded-lg mb-6" />
          <div className="rounded-2xl border border-border/40 bg-card/80 p-8">
            <div className="w-48 h-8 skeleton-shimmer rounded-xl mb-3" />
            <div className="w-64 h-4 skeleton-shimmer rounded-md mb-8" />
            <div className="w-full h-12 skeleton-shimmer rounded-xl mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="h-20 skeleton-shimmer rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ItemForm
      mode="create"
      onSubmit={handleSubmit}
      isSubmitting={createItemMutation.isPending}
    />
  );
}
