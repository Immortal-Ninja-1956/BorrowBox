import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Upload,
  X,
  ImagePlus,
  Loader2,
  BookOpen,
  Laptop,
  Sofa,
  Shirt,
  Trophy,
  Package,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const categoryMetadata = [
  { name: "Books", icon: BookOpen, desc: "Textbooks, novels, notes" },
  { name: "Electronics", icon: Laptop, desc: "Gadgets, accessories, chargers" },
  { name: "Furniture", icon: Sofa, desc: "Chairs, study tables, lamps" },
  { name: "Clothing", icon: Shirt, desc: "Lab coats, jerseys, casuals" },
  { name: "Sports", icon: Trophy, desc: "Rackets, balls, gym gear" },
  { name: "Other", icon: Package, desc: "Miscellaneous campus items" },
];

const conditionMetadata = [
  { name: "New", desc: "Unused in original packaging" },
  { name: "Like New", desc: "Excellent condition, barely used" },
  { name: "Good", desc: "Fully functional, minor wear & tear" },
  { name: "Fair", desc: "Shows sign of use, works completely" },
];

const BANNED_KEYWORDS = [
  "maggi",
  "noodle",
  "noodles",
  "kettle",
  "harmful",
  "substance",
  "substances",
  "weapon",
  "drug",
  "drugs",
  "cigarette",
  "alcohol",
  "liquor",
  "vape",
  "gun",
  "knife",
];

function containsBannedKeywords(text: string | undefined): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BANNED_KEYWORDS.some((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(lowerText);
  });
}

export interface ItemFormData {
  title: string;
  description: string;
  amount: string;
  category: string;
  condition: "New" | "Like New" | "Good" | "Fair";
  imageUrl?: string;
}

interface ItemFormProps {
  mode: "create" | "edit";
  initialData?: ItemFormData;
  onSubmit: (data: ItemFormData) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function ItemForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting = false,
}: ItemFormProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ItemFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    amount: initialData?.amount || "",
    category: initialData?.category || "Other",
    condition: (initialData?.condition as any) || "Good",
    imageUrl: initialData?.imageUrl || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        amount: initialData.amount || "",
        category: initialData.category || "Other",
        condition: initialData.condition || "Good",
        imageUrl: initialData.imageUrl || "",
      });
      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    }
  }, [initialData]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.imageUrl || null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: priceSuggestion } = trpc.items.getPriceSuggestion.useQuery(
    {
      category: formData.category,
      title: formData.title,
    },
    {
      enabled:
        !!formData.category ||
        (!!formData.title && formData.title.trim().length >= 2),
      staleTime: 10 * 1000,
    }
  );

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
    reader.onload = (e) => {
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
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.imageUrl || null;
    setUploading(true);
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 100);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        headers: session
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();

      clearInterval(progressInterval);
      setUploadProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return data.imageUrl;
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error("Image upload failed: " + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.title.trim()) {
        toast.error("Please enter an item title");
        return false;
      }
      if (containsBannedKeywords(formData.title)) {
        toast.error(
          "Your title contains restricted keywords (e.g. Maggi, noodles, kettle) which are not allowed."
        );
        return false;
      }
      if (!formData.amount.trim()) {
        toast.error("Please enter a price");
        return false;
      }
      const priceNum = Number(formData.amount);
      if (isNaN(priceNum) || priceNum <= 0) {
        toast.error("Price must be a positive number");
        return false;
      }
    }
    if (step === 2) {
      if (!formData.description.trim()) {
        toast.error("Please enter a description for your item");
        return false;
      }
      if (containsBannedKeywords(formData.description)) {
        toast.error(
          "Your description contains restricted keywords (e.g. Maggi, noodles, kettle) which are not allowed."
        );
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    const imageUrl = await uploadImage();

    if (imageFile && !imageUrl) {
      return;
    }

    await onSubmit({
      ...formData,
      imageUrl: imageUrl || undefined,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border bg-muted/30">
            <h1 className="text-2xl font-bold text-foreground">
              {mode === "create" ? "Post a New Item" : "Edit Listing"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "create"
                ? "List your item for buying, selling, or borrowing on campus"
                : "Update your item listing details, price, or image"}
            </p>

            {/* Stepper Progress Bar */}
            <div className="flex items-center justify-between mt-6">
              {[
                { step: 1, label: "Item Details" },
                { step: 2, label: "Description & Photo" },
                { step: 3, label: "Review & Publish" },
              ].map((s) => (
                <div key={s.step} className="flex items-center flex-1">
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                        currentStep === s.step
                          ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                          : currentStep > s.step
                          ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentStep > s.step ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        s.step
                      )}
                    </div>
                    <span
                      className={`ml-2 text-xs font-medium hidden sm:inline ${
                        currentStep === s.step
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {s.step < 3 && (
                    <div
                      className={`flex-1 h-0.5 mx-3 transition-colors ${
                        currentStep > s.step ? "bg-accent" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* STEP 1: Basic Info & Category */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Select Category *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categoryMetadata.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.name;
                      return (
                        <div
                          key={cat.name}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              category: cat.name,
                            }))
                          }
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                              : "border-border hover:border-accent/40 bg-card"
                          }`}
                        >
                          <div className="flex items-center space-x-3 mb-1">
                            <div
                              className={`p-2 rounded-lg ${
                                isSelected
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-foreground text-sm">
                              {cat.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {cat.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Item Title *
                  </label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. Engineering Physics Textbook 3rd Edition"
                    className="bg-card text-foreground border-border text-base py-3"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Condition *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {conditionMetadata.map((cond) => {
                      const isSelected = formData.condition === cond.name;
                      return (
                        <div
                          key={cond.name}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              condition: cond.name as any,
                            }))
                          }
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? "border-accent bg-accent/10 ring-2 ring-accent/30"
                              : "border-border hover:border-accent/40 bg-card"
                          }`}
                        >
                          <span className="font-medium text-foreground text-sm block">
                            {cond.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {cond.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-foreground">
                      Price (₹) *
                    </label>
                    {priceSuggestion?.suggestedPrice && (
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Suggested: ₹{priceSuggestion.suggestedPrice} (based on {priceSuggestion.sampleCount} sold items)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                      ₹
                    </span>
                    <Input
                      name="amount"
                      type="number"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="pl-8 bg-card text-foreground border-border text-base py-3"
                      min="1"
                    />
                  </div>
                  {priceSuggestion?.suggestedPrice && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: priceSuggestion.suggestedPrice || prev.amount,
                        }))
                      }
                      className="mt-2 text-xs text-accent hover:underline flex items-center gap-1 font-medium"
                    >
                      Use suggested price (₹{priceSuggestion.suggestedPrice})
                    </button>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
                  >
                    Next: Photo & Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Photo & Description */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Item Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe the item's condition, age, reasons for selling/borrowing, or pickup locations on campus..."
                    className="w-full rounded-md border border-border bg-card p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Photo (Optional but Recommended)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30 aspect-video max-h-64 flex items-center justify-center">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50 bg-muted/10"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                        <ImagePlus className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Click to upload or drag & drop photo
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, WEBP up to 5 MB
                      </p>
                    </div>
                  )}

                  {uploading && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Uploading image...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-accent h-1.5 transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 px-6"
                  >
                    Next: Review
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent/20 text-accent uppercase tracking-wider">
                        {formData.category}
                      </span>
                      <h3 className="text-lg font-bold text-foreground mt-1">
                        {formData.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                        {formData.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-accent">
                        ₹{formData.amount}
                      </span>
                      <span className="text-xs block text-muted-foreground mt-0.5">
                        Condition: {formData.condition}
                      </span>
                    </div>
                  </div>

                  {imagePreview && (
                    <div className="mt-4 rounded-lg overflow-hidden border border-border max-h-48 flex justify-center bg-muted/20">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="border-border text-foreground hover:bg-muted"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || uploading}
                    className="bg-accent text-accent-foreground hover:bg-accent/90 px-8"
                  >
                    {isSubmitting || uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {mode === "create" ? "Publishing..." : "Saving..."}
                      </>
                    ) : (
                      <>{mode === "create" ? "Publish Listing" : "Save Changes"}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
