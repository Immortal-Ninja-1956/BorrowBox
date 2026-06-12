import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  MessageCircle,
  Search,
  MapPin,
  Loader2,
  BookOpen,
  Laptop,
  Sofa,
  Shirt,
  Trophy,
  Package,
  Edit2,
  SearchX,
  PackageOpen,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function Marketplace() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showMyListings, setShowMyListings] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: suggestionsData } = trpc.items.getAll.useQuery(
    {
      limit: 5,
      offset: 0,
      search: searchQuery || undefined,
    },
    {
      enabled: searchQuery.length >= 2,
    }
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [offset, setOffset] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<any[]>([]);
  const limit = 12;

  const { data, isLoading } = trpc.items.getAll.useQuery(
    {
      limit,
      offset,
      search: searchQuery || undefined,
      category: selectedCategory,
      sellerId: showMyListings ? user?.id : undefined,
      sortBy,
    },
    {
      placeholderData: prev => prev,
    }
  );

  // Whenever filters or sorting options change, reset pagination
  useEffect(() => {
    setOffset(0);
    setAccumulatedItems([]);
  }, [searchQuery, selectedCategory, showMyListings, sortBy]);

  // Accumulate pages of items
  useEffect(() => {
    if (data?.items) {
      if (offset === 0) {
        setAccumulatedItems(data.items);
      } else {
        setAccumulatedItems(prev => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = data.items.filter(i => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data?.items, offset]);

  if (authLoading || (isLoading && accumulatedItems.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-foreground">Loading marketplace...</p>
        </div>
      </div>
    );
  }



  // Sorting and filtering are handled server-side now.

  const categories = [
    "all",
    "Books",
    "Electronics",
    "Furniture",
    "Clothing",
    "Sports",
    "Other",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
            <Button
              onClick={() => setLocation("/create-post")}
              className="bg-accent"
            >
              Post an Item
            </Button>
          </div>

          {/* Search & Sort Bar */}
          <div className="flex gap-4 mb-6 flex-col sm:flex-row">
            <div className="relative flex-1" ref={searchContainerRef}>
              <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground z-10" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                className="pl-10 w-full relative z-0"
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions &&
                searchQuery.length >= 2 &&
                suggestionsData?.items &&
                suggestionsData.items.length > 0 && (
                  <div className="absolute z-50 top-full left-0 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    <ul className="max-h-60 overflow-y-auto py-1">
                      {suggestionsData.items.map(item => (
                        <li
                          key={item.id}
                          className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center justify-between group"
                          onClick={() => {
                            setSearchQuery(item.title);
                            if (
                              item.category &&
                              item.category !== selectedCategory
                            ) {
                              setSelectedCategory(item.category);
                            }
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground group-hover:text-accent transition-colors">
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.category || "Other"}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent min-w-[160px] h-10 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 items-center">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
            {isAuthenticated && user && (
              <>
                <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />
                <button
                  onClick={() => setShowMyListings(!showMyListings)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold border transition-all ${
                    showMyListings
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border hover:bg-muted text-foreground"
                  }`}
                >
                  My Listings
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="container py-12">
        {accumulatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            {searchQuery || selectedCategory !== "all" ? (
              <>
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <SearchX className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No matches found</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  We couldn't find any items matching your current search or category filters. Try adjusting them!
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <PackageOpen className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">The marketplace is empty</h3>
                <p className="text-muted-foreground mb-6 max-w-sm">
                  Be the very first to list an item on the campus peer-to-peer marketplace!
                </p>
                <Button
                  className="bg-accent text-accent-foreground"
                  onClick={() => isAuthenticated ? setLocation("/create-post") : setLocation("/login")}
                >
                  Post an Item
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accumulatedItems.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>

            {data?.nextOffset && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={() => setOffset(data.nextOffset!)}
                  disabled={isLoading}
                  variant="outline"
                  className="px-8 bg-card border-border hover:bg-muted text-foreground"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const categoryMetadata: Record<string, { icon: any; gradient: string }> = {
  Books: {
    icon: BookOpen,
    gradient: "from-amber-400 to-orange-600",
  },
  Electronics: {
    icon: Laptop,
    gradient: "from-blue-400 to-indigo-600",
  },
  Furniture: {
    icon: Sofa,
    gradient: "from-emerald-400 to-teal-600",
  },
  Clothing: {
    icon: Shirt,
    gradient: "from-pink-400 to-rose-600",
  },
  Sports: {
    icon: Trophy,
    gradient: "from-yellow-400 to-amber-600",
  },
  Other: {
    icon: Package,
    gradient: "from-purple-400 to-violet-600",
  },
};

function getCategoryMeta(category?: string) {
  const normalized = category || "Other";
  return categoryMetadata[normalized] || categoryMetadata["Other"];
}

function ItemCard({ item }: { item: any }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isOwner = user?.id === item.sellerId;

  const handleContact = () => {
    // WhatsApp redirect
    const message = `Hi, I'm interested in your item: ${item.title}`;
    const encodedMessage = encodeURIComponent(message);
    // This would need the seller's WhatsApp number from the item data
    // For now, we'll navigate to the item detail page
    setLocation(`/item/${item.id}`);
  };

  const { icon: CategoryIcon, gradient } = getCategoryMeta(item.category);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all hover:scale-105">
      {/* Image / Placeholder */}
      <div className="w-full h-48 bg-muted overflow-hidden relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white p-4`}
          >
            <CategoryIcon className="w-12 h-12 opacity-80 mb-2" />
            <span className="text-xs font-semibold opacity-90 tracking-wide uppercase">
              {item.category || "Other"}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
          {item.title}
        </h3>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {item.description}
        </p>

        {/* Price and Status */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-2xl font-bold text-accent">₹{item.amount}</div>
          <div className="flex gap-1.5 items-center">
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                (
                  {
                    New: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/30",
                    "Like New":
                      "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/30",
                    Good: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/30",
                    Fair: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/30",
                    Poor: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/30",
                  } as Record<string, string>
                )[item.condition] || "bg-muted text-muted-foreground"
              }`}
            >
              {item.condition || "Good"}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                item.status === "OPEN"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {item.status === "OPEN" ? "Available" : item.status}
            </span>
          </div>
        </div>

        {/* Category */}
        {item.category && (
          <p className="text-xs text-muted-foreground mb-4">
            Category: {item.category}
          </p>
        )}

        {/* Action Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleContact}
            className="flex-1 bg-accent hover:bg-accent/90"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            View Details
          </Button>
          {isOwner && (
            <Button
              variant="outline"
              onClick={e => {
                e.stopPropagation();
                setLocation(`/edit-post/${item.id}`);
              }}
              title="Edit Listing"
              className="hover:border-accent hover:text-accent transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
