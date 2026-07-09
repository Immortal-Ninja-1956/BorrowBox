import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, User, CheckCircle2, AlertCircle, ShieldCheck, BookOpen, Laptop, Sofa, Shirt, Trophy, Package } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { format } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

const categoryMetadata: Record<string, { icon: any }> = {
  Books: { icon: BookOpen },
  Electronics: { icon: Laptop },
  Furniture: { icon: Sofa },
  Clothing: { icon: Shirt },
  Sports: { icon: Trophy },
  Other: { icon: Package },
};

function getCategoryMeta(category?: string) {
  const normalized = category || "Other";
  return categoryMetadata[normalized] || categoryMetadata["Other"];
}

function ItemCard({ item }: { item: any }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isOwner = user?.id === item.sellerId;
  const { icon: CategoryIcon } = getCategoryMeta(item.category);

  return (
    <div 
      onClick={() => setLocation(`/item/${item.id}`)}
      className="group flex flex-col bg-card rounded-2xl border border-border hover:border-primary/50 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg dark:hover:shadow-primary/5 h-full"
    >
      <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/50 transition-transform duration-500 group-hover:scale-105">
            <CategoryIcon className="w-10 h-10 mb-2 opacity-50" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-60">
              {item.category || "Other"}
            </span>
          </div>
        )}
        
        {item.status !== "OPEN" && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-background/90 text-foreground backdrop-blur-sm shadow-sm border border-border/50">
              {item.status}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {item.condition || "Good"}
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {item.category || "Other"}
          </span>
        </div>

        <h3 className="text-base font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
          {item.title}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <div className="text-xl font-bold text-foreground">
            ₹{item.amount}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const userId = parseInt(id || "0", 10);

  const { data: profile, isLoading, error } = trpc.user.getPublicProfileById.useQuery(
    { userId },
    { enabled: !!userId }
  );

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center bg-background text-center px-4">
        <AlertCircle className="w-16 h-16 text-destructive mb-4 opacity-80" />
        <h2 className="text-3xl font-bold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          The profile you are looking for does not exist or has been removed from BorrowBox.
        </p>
        <Button onClick={() => setLocation("/marketplace")} variant="default" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Button>
      </div>
    );
  }

  // Get Initials for Avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Back Button */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/marketplace")}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </div>
      </div>

      <div className="container py-12 max-w-6xl mx-auto space-y-12">
        {/* Profile Header Block */}
        <div className="bg-card border border-border/50 rounded-3xl p-8 sm:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner flex-shrink-0">
              <span className="text-4xl font-extrabold text-primary/80 tracking-tighter">
                {getInitials(profile.name)}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight mb-2">
                  {profile.name}
                </h1>
                <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
                  <User className="w-4 h-4" />
                  Member since {format(new Date(profile.joinedAt), "MMMM yyyy")}
                </p>
              </div>

              {/* Verifications */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${profile.isEmailVerified ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Email {profile.isEmailVerified ? "Verified" : "Unverified"}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${profile.whatsappVerified ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  WhatsApp {profile.whatsappVerified ? "Verified" : "Unverified"}
                </div>
              </div>
            </div>

            {/* Trust Score Widget */}
            <div className="bg-background border border-border/60 rounded-2xl p-6 text-center min-w-[200px] shadow-sm flex flex-col items-center justify-center">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">Trust Score</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-5xl font-black text-foreground tracking-tighter">
                  {profile.trustScore.averageRating}
                </span>
                <span className="text-xl text-muted-foreground font-semibold">/ 5</span>
              </div>
              <StarRating rating={Math.round(Number(profile.trustScore.averageRating))} disabled size={20} className="mb-2" />
              <p className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {profile.trustScore.totalReviews} Reviews • {profile.completedDealsCount} Deals
              </p>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Active Listings */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              Active Listings <span className="bg-primary/10 text-primary text-sm px-2.5 py-0.5 rounded-full">{profile.activeListings.length}</span>
            </h3>
            
            {profile.activeListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {profile.activeListings.map((item: any) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">This user currently has no active listings.</p>
              </div>
            )}
          </div>

          {/* Reviews Sidebar */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              Reviews <span className="bg-muted text-muted-foreground text-sm px-2.5 py-0.5 rounded-full">{profile.reviews.length}</span>
            </h3>
            
            {profile.reviews.length > 0 ? (
              <div className="space-y-4">
                {profile.reviews.map((review) => (
                  <div key={review.id} className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-foreground text-sm">{review.reviewerName}</p>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{review.role}</p>
                      </div>
                      <StarRating rating={review.rating} disabled size={12} />
                    </div>
                    {review.comment ? (
                      <p className="text-sm text-foreground/90 leading-relaxed italic">"{review.comment}"</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No written feedback provided.</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-3 font-medium">
                      {format(new Date(review.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
                <StarRating rating={0} disabled size={16} className="justify-center mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground font-medium">No reviews yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
