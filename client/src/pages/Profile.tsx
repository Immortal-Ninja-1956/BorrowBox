import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { StarRating } from "@/components/ui/star-rating";

export default function Profile() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    upiId: "",
    upiName: "",
    whatsapp: "",
  });

  // Fetch full profile from server (auth.me doesn't always include upiId etc on first load)
  const { data: serverProfile, isLoading: profileLoading } = trpc.user.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: userReviewsData } = trpc.reviews.getByUser.useQuery(
    { userId: user?.id || 0 },
    { enabled: !!user?.id }
  );

  // Populate form once server profile loads
  useEffect(() => {
    if (serverProfile) {
      setFormData({
        upiId: serverProfile.upiId ?? "",
        upiName: serverProfile.upiName ?? "",
        whatsapp: serverProfile.whatsapp ? serverProfile.whatsapp.replace("+91", "") : "",
      });
    }
  }, [serverProfile]);

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update profile: " + error.message);
    },
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-foreground">
            Sign in to update your profile
          </h2>
          <Button onClick={() => setLocation("/")} variant="outline">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.upiId.trim()) {
      toast.error("Please enter your UPI ID");
      return;
    }

    if (!formData.upiName.trim()) {
      toast.error("Please enter your UPI name");
      return;
    }

    if (!formData.whatsapp.trim()) {
      toast.error("Please enter your WhatsApp number");
      return;
    }

    const cleanPhone = "+91" + formData.whatsapp.replace(/\s+/g, "");
    const phoneRegex = /^\+\d{10,15}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      toast.error("WhatsApp number must be valid");
      return;
    }

    updateProfileMutation.mutate({
      ...formData,
      whatsapp: cleanPhone,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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
          <h1 className="text-2xl font-bold text-foreground">Update Profile</h1>
        </div>
      </div>

      {/* Form */}
      <div className="container max-w-2xl py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Account Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Name
                </label>
                <Input
                  value={user?.name || ""}
                  disabled
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Email
                </label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="w-full"
                />
              </div>
            </div>

            {/* Trust Score Section */}
            {userReviewsData && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  Your Trust Score
                </h4>
                <div className="flex items-center gap-3 bg-muted p-4 rounded-lg">
                  <div className="text-3xl font-bold text-foreground">
                    {userReviewsData.trustScore.averageRating}
                  </div>
                  <div>
                    <StarRating rating={Math.round(Number(userReviewsData.trustScore.averageRating))} disabled size={16} />
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {userReviewsData.trustScore.totalReviews} reviews
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300 mb-4">
              Payment Details (Required for Sellers)
            </h3>
            <p className="text-blue-800 dark:text-blue-400 text-sm mb-4">
              These details are used to generate UPI QR codes for payment collection after delivery confirmation.
            </p>

            <div className="space-y-4">
              {/* UPI ID */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  UPI ID *
                </label>
                <Input
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  placeholder="e.g., yourname@upi"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your UPI ID for receiving payments
                </p>
              </div>

              {/* UPI Name */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  UPI Name *
                </label>
                <Input
                  name="upiName"
                  value={formData.upiName}
                  onChange={handleChange}
                  placeholder="e.g., Your Name"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Name associated with your UPI account
                </p>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-green-900 dark:text-green-300 mb-4">
              Contact Details (Required for Sellers)
            </h3>
            <p className="text-green-800 dark:text-green-400 text-sm mb-4">
              Buyers will use this WhatsApp number to contact you about your listings.
            </p>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                WhatsApp Number *
              </label>
              <div className="flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground sm:text-sm font-semibold">
                  +91
                </span>
                <Input
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="98765 43210"
                  className="w-full rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Local 10-digit number
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 bg-accent hover:bg-accent/90"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
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

        {/* Recent Reviews List */}
        {userReviewsData && userReviewsData.reviews.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6 mt-8">
            <h3 className="text-lg font-bold text-foreground mb-4">
              Recent Reviews
            </h3>
            <div className="space-y-4">
              {userReviewsData.reviews.map((review) => (
                <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <StarRating rating={review.rating} disabled size={14} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-foreground italic">"{review.comment}"</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    From {review.role === "buyer" ? "Buyer" : "Seller"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
