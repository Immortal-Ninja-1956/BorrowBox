import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
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
  ChevronLeft
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

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
  { name: "Poor", desc: "Heavily used, might need minor fixes" },
];

import { usePageMetadata } from "@/_core/hooks/usePageMetadata";

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
  "knife"
];

function containsBannedKeywords(text: string | undefined): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return BANNED_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    return regex.test(lowerText);
  });
}

export default function CreatePost() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  usePageMetadata("Post an Item", "Create a new listing to buy, sell, rent, or share items with other students on campus.");

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

  const [currentStep, setCurrentStep] = useState(1);
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: priceSuggestion } = trpc.items.getPriceSuggestion.useQuery(
    {
      category: formData.category,
      title: formData.title,
    },
    {
      enabled: !!formData.category || (!!formData.title && formData.title.trim().length >= 2),
      staleTime: 10 * 1000,
    }
  );

  const createItemMutation = trpc.items.create.useMutation({
    onSuccess: () => {
      toast.success("Item posted successfully!");
      setLocation("/dashboard");
    },
    onError: error => {
      toast.error("Failed to post item: " + error.message);
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
    setUploadProgress(10);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 100);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append("image", imageFile);
      const res = await fetch("/api/upload", { 
        method: "POST", 
        body: fd,
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();

      clearInterval(progressInterval);
      setUploadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));
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
        toast.error("Your title contains restricted keywords (e.g. Maggi, noodles, kettle) which are not allowed.");
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
        toast.error("Your description contains restricted keywords (e.g. Maggi, noodles, kettle) which are not allowed.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasReachedUnverifiedLimit) {
      toast.error(
        "You have reached the limit of 1 unverified listing. Please verify your WhatsApp number."
      );
      return;
    }

    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    const imageUrl = await uploadImage();

    // If the user selected an image but upload failed, don't create the item
    if (imageFile && !imageUrl) {
      return;
    }

    createItemMutation.mutate({
      title: formData.title,
      description: formData.description,
      amount: formData.amount,
      category: formData.category,
      condition: formData.condition as any,
      imageUrl: imageUrl || undefined,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-sm font-semibold">Loading post wizard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Sign in to post an item
          </h2>
          <Button onClick={() => setLocation("/")} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const isSubmitting = uploading || createItemMutation.isPending;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Mesh blobs */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 -z-10 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 -translate-y-1/2 -z-10 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-30">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/marketplace")}
              className="rounded-full h-9 w-9 border border-border/40 hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Post a New Listing</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">List your gear for the campus community</p>
            </div>
          </div>

          {/* Steps indicators */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === step
                      ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20 scale-105"
                      : currentStep > step
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground border border-border/40"
                  }`}
                >
                  {currentStep > step ? <Check className="w-3.5 h-3.5" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-6 sm:w-10 h-0.5 mx-0.5 sm:mx-1 transition-colors ${
                      currentStep > step ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-2xl py-12 relative z-10">

        {/* Wizard Form */}
        <div className="glass-card rounded-2xl border border-border/40 p-6 md:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* STEP 1: Details */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-border/30 pb-4">
                  <h3 className="text-lg font-bold text-foreground">Basic Information</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Let buyers know the name and category of your listing.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Item Title *
                  </label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Used Physics 101 Textbook"
                    className="h-11 bg-card/40 border-border/50 focus:border-primary/50 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Price (₹) *
                  </label>
                  <Input
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="e.g., 450"
                    className="h-11 bg-card/40 border-border/50 focus:border-primary/50 rounded-xl"
                    inputMode="decimal"
                  />
                  {priceSuggestion?.suggestedPrice && (
                    <div className="mt-2.5 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between flex-wrap gap-2 text-xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💡</span>
                        <div>
                          <span className="font-bold text-primary">
                            Suggested Price: ₹{priceSuggestion.suggestedPrice}
                          </span>
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            (based on {priceSuggestion.sampleCount} past {priceSuggestion.sampleCount === 1 ? "sale" : "sales"}
                            {priceSuggestion.matchedBy === "title_and_category"
                              ? " for similar items"
                              : priceSuggestion.matchedBy === "title"
                              ? " matching title"
                              : ` in ${formData.category}`}
                            )
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setFormData(prev => ({ ...prev, amount: priceSuggestion.suggestedPrice! }))}
                        className="h-7 text-[11px] font-bold border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors"
                      >
                        Apply ₹{priceSuggestion.suggestedPrice}
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Category *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryMetadata.map(cat => {
                      const CatIcon = cat.icon;
                      const isSelected = formData.category === cat.name;
                      return (
                        <div
                          key={cat.name}
                          onClick={() => setFormData(prev => ({ ...prev, category: cat.name }))}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-xs shadow-primary/10"
                              : "bg-card/30 border-border/50 hover:bg-muted/40 hover:border-border/80"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{cat.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{cat.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Specs */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-border/30 pb-4">
                  <h3 className="text-lg font-bold text-foreground">Item Specifications</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Describe your item's condition and other specific details.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                    Condition *
                  </label>
                  <div className="space-y-2">
                    {conditionMetadata.map(cond => {
                      const isSelected = formData.condition === cond.name;
                      return (
                        <div
                          key={cond.name}
                          onClick={() => setFormData(prev => ({ ...prev, condition: cond.name }))}
                          className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                            isSelected
                              ? "bg-primary/5 border-primary shadow-xs shadow-primary/10"
                              : "bg-card/30 border-border/50 hover:bg-muted/40 hover:border-border/80"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-foreground">{cond.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{cond.desc}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-background" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Provide details about size, condition details, pickup location, or rental timeframe..."
                    rows={6}
                    className="w-full px-4.5 py-3 border border-border/50 rounded-xl bg-card/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-sm placeholder:text-muted-foreground/60 transition-all"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: Media & Review */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="border-b border-border/30 pb-4">
                  <h3 className="text-lg font-bold text-foreground">Media & Review</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a photo and review your listing configuration.</p>
                </div>

                {/* Upload Section */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Upload Photo
                  </label>

                  {!imagePreview && !formData.imageUrl ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                        transition-all duration-200 ease-in-out
                        ${
                          isDragging
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-border/50 hover:border-primary/50 hover:bg-muted/40"
                        }
                      `}
                    >
                      <ImagePlus
                        className={`w-10 h-10 mx-auto mb-3 transition-colors ${
                          isDragging ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, GIF, or WebP (Max 5 MB)
                      </p>
                    </div>
                  ) : (
                    <div className="relative w-full rounded-2xl overflow-hidden border border-border/40 bg-muted">
                      <img
                        src={imagePreview || formData.imageUrl}
                        alt="Preview"
                        className="w-full h-64 object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4.5 py-4">
                        <p className="text-white text-sm font-bold truncate">
                          {imageFile?.name || "Selected Image"}
                        </p>
                        {imageFile && (
                          <p className="text-white/80 text-xs mt-0.5">
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

                {/* Simulated Upload progress bar */}
                {uploading && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <span>Uploading Image...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Review Panel */}
                <div className="bg-muted/30 border border-border/40 rounded-xl p-4.5 space-y-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Listing Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-muted-foreground block">Title</span>
                      <span className="font-semibold text-foreground line-clamp-1">{formData.title}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Price</span>
                      <span className="font-semibold text-foreground text-primary">₹{formData.amount}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Category</span>
                      <span className="font-semibold text-foreground">{formData.category}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Condition</span>
                      <span className="font-semibold text-foreground">{formData.condition}</span>
                    </div>
                  </div>
                </div>

                {/* Notice Box */}
                {hasReachedUnverifiedLimit ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-600 dark:text-red-400">
                    <strong>Action Required:</strong> You must verify your WhatsApp number to create more than one listing.
                    <Button
                      variant="link"
                      onClick={() => setLocation("/profile")}
                      className="text-red-500 hover:text-red-600 font-bold p-0 ml-1.5 h-auto text-xs"
                    >
                      Go to Profile to Verify
                    </Button>
                  </div>
                ) : isUnverified ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-600 dark:text-amber-400">
                    <strong>Notice:</strong> Your WhatsApp is unverified. You can create <strong>one</strong> listing until verified.
                    <Button
                      variant="link"
                      onClick={() => setLocation("/profile")}
                      className="text-amber-500 hover:text-amber-600 font-bold p-0 ml-1.5 h-auto text-xs"
                    >
                      Verify Now
                    </Button>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-600 dark:text-blue-400">
                    <strong>Note:</strong> UPI ID and WhatsApp must be updated in your profile to complete transactions.
                  </div>
                )}
              </div>
            )}

            {/* Stepper Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-border/40 gap-4">
              {currentStep > 1 ? (
                <Button
                  key="back-btn"
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="rounded-xl px-5 h-11 font-semibold border-border/50"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <Button
                  key="cancel-btn"
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/marketplace")}
                  className="rounded-xl px-5 h-11 font-semibold border-border/50"
                >
                  Cancel
                </Button>
              )}

              {currentStep < 3 ? (
                <Button
                  key="next-btn"
                  type="button"
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-6 h-11 font-semibold ml-auto"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  key="submit-btn"
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !!hasReachedUnverifiedLimit}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl px-6 h-11 font-semibold ml-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploading ? `Uploading (${uploadProgress}%)` : "Posting..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Post Item
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
