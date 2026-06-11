import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    category: "Other",
    condition: "Good",
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        description: item.description || "",
        amount: item.amount.toString(),
        category: item.category || "Other",
        condition: item.condition || "Good",
        imageUrl: item.imageUrl || "",
      });
    }
  }, [item]);

  const updateItemMutation = trpc.items.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated successfully!");
      setLocation("/dashboard");
    },
    onError: error => {
      toast.error("Failed to update item: " + error.message);
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5 MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.imageUrl || null;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      return data.imageUrl;
    } catch (err: any) {
      toast.error("Image upload failed: " + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.amount.trim()) {
      toast.error("Please enter a price");
      return;
    }

    const priceNum = Number(formData.amount);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    const imageUrl = await uploadImage();

    updateItemMutation.mutate({
      id: itemId,
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      condition: formData.condition as any,
      imageUrl: imageUrl || undefined,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (authLoading || itemLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 text-accent mx-auto mb-4" />
          <p className="text-foreground">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Sign in to edit this item
          </h2>
          <Button onClick={() => setLocation("/")} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!item || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Item not found
          </h2>
          <Button onClick={() => setLocation("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === item.sellerId;
  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Unauthorized
          </h2>
          <p className="text-muted-foreground mb-4">
            You can only edit items that you own.
          </p>
          <Button onClick={() => setLocation("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (item.status !== "OPEN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Cannot Edit Item
          </h2>
          <p className="text-muted-foreground mb-4">
            This item has been finalized or sold and can no longer be edited.
          </p>
          <Button onClick={() => setLocation("/dashboard")} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isSubmitting = uploading || updateItemMutation.isPending;

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
          <h1 className="text-2xl font-bold text-foreground">Edit Item</h1>
        </div>
      </div>

      {/* Form */}
      <div className="container max-w-2xl py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Item Title *
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Used Textbook - Physics 101"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the item condition, features, etc..."
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Price (₹) *
            </label>
            <Input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="e.g., 500"
              className="w-full"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option>Books</option>
              <option>Electronics</option>
              <option>Furniture</option>
              <option>Clothing</option>
              <option>Sports</option>
              <option>Other</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Condition *
            </label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option>New</option>
              <option>Like New</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
            </select>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Item Image
            </label>

            {!imagePreview && !formData.imageUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                  transition-all duration-200 ease-in-out
                  ${
                    isDragging
                      ? "border-accent bg-accent/10 scale-[1.02]"
                      : "border-border hover:border-accent/50 hover:bg-muted/50"
                  }
                `}
              >
                <ImagePlus
                  className={`w-12 h-12 mx-auto mb-3 transition-colors ${
                    isDragging ? "text-accent" : "text-muted-foreground"
                  }`}
                />
                <p className="text-sm font-medium text-foreground mb-1">
                  {isDragging
                    ? "Drop your image here"
                    : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF, or WebP · Max 5 MB
                </p>
              </div>
            ) : (
              <div className="relative w-full rounded-xl overflow-hidden border border-border bg-muted">
                <img
                  src={imagePreview || formData.imageUrl}
                  alt="Preview"
                  className="w-full h-64 object-cover"
                  onError={() => {
                    setImagePreview(null);
                    setFormData(prev => ({ ...prev, imageUrl: "" }));
                    toast.error("Failed to load image");
                  }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                  <p className="text-white text-sm font-medium truncate">
                    {imageFile?.name || "Image preview"}
                  </p>
                  {imageFile && (
                    <p className="text-white/70 text-xs">
                      {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Make sure your UPI ID and WhatsApp number
              are updated in your profile. Buyers will contact you via WhatsApp,
              and payment will be collected via UPI after delivery confirmation.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 bg-accent hover:bg-accent/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? "Uploading image..." : "Saving..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/dashboard")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
