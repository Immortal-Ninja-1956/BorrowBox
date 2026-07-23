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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
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
