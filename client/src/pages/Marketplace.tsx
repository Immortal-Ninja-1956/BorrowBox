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

  if (authLoading) {
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Glowing Blobs */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 -z-10 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 -translate-y-1/2 -z-10 w-[300px] h-[300px] rounded-full bg-secondary/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-xs relative z-10">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Marketplace
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Discover, borrow, buy, or share items within your college campus
              </p>
            </div>
            <Button
              onClick={() => setLocation("/create-post")}
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 rounded-xl px-6 py-5.5 h-auto transition-all"
            >
              Post an Item
            </Button>
          </div>

          {/* Search & Sort Bar */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <div className="relative flex-1" ref={searchContainerRef}>
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Search items by title, desc..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                className="pl-10 w-full relative z-0 h-11 bg-card/60 border-border/50 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions &&
                searchQuery.length >= 2 &&
                suggestionsData?.items &&
                suggestionsData.items.length > 0 && (
                  <div className="absolute z-50 top-full left-0 w-full mt-2 glass-card border border-border/40 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <ul className="max-h-60 overflow-y-auto py-1.5 divide-y divide-border/20">
                      {suggestionsData.items.map(item => (
                        <li
                          key={item.id}
                          className="px-4 py-3 hover:bg-muted/50 cursor-pointer flex items-center justify-between group"
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
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">
                              {item.title}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {item.category || "Other"}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">₹{item.amount}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2 border border-border/50 rounded-xl bg-card/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 min-w-[170px] h-11 cursor-pointer text-sm font-medium transition-all"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {/* Quick Search Chips */}
          <div className="flex gap-2 flex-wrap items-center mt-3.5 mb-6 text-xs">
            <span className="text-muted-foreground font-semibold">Try searching:</span>
            {["Physics 101", "Lab Coat", "Study Lamp", "Keyboard", "Water Bottle", "Chair"].map(term => (
              <button
                key={term}
                onClick={() => {
                  setSearchQuery(term);
                  setShowSuggestions(false);
                }}
                className="px-2.5 py-1 bg-card/30 border border-border/30 hover:border-primary/40 hover:bg-muted/50 rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer font-medium"
              >
                {term}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 items-center no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4.5 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 border ${
                  selectedCategory === cat
                    ? "bg-primary border-primary text-primary-foreground shadow-xs shadow-primary/20"
                    : "bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
            {isAuthenticated && user && (
              <>
                <div className="h-5 w-px bg-border/60 mx-2 flex-shrink-0" />
                <button
                  onClick={() => setShowMyListings(!showMyListings)}
                  className={`px-4.5 py-2 rounded-full whitespace-nowrap text-sm font-semibold border transition-all duration-200 ${
                    showMyListings
                      ? "bg-secondary border-secondary text-secondary-foreground shadow-xs shadow-secondary/25"
                      : "bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
      <div className="container py-12 relative z-10">
        {isLoading && accumulatedItems.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <SkeletonCard key={i} />
              ))}
          </div>
        ) : accumulatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-in fade-in zoom-in-95 duration-500 glass-card rounded-2xl p-10 max-w-2xl mx-auto">
            {searchQuery || selectedCategory !== "all" ? (
              <>
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-6 border border-border/30">
                  <SearchX className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">No matches found</h3>
                <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed text-sm">
                  We couldn't find any items matching your current filters. Try refining your search query or category.
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl border-border px-6 hover:bg-muted/50 font-semibold"
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
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
                  <PackageOpen className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">The marketplace is empty</h3>
                <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed text-sm">
                  Be the first to list something in this category! Gear, books, notes, or furniture.
                </p>
                <Button
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-md shadow-primary/20 rounded-xl px-6 py-5 h-auto transition-all"
                  onClick={() => isAuthenticated ? setLocation("/create-post") : setLocation("/login")}
                >
                  Post an Item
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {accumulatedItems.map(item => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>

            {data?.nextOffset && (
              <div className="flex justify-center mt-14">
                <Button
                  onClick={() => setOffset(data.nextOffset!)}
                  disabled={isLoading}
                  variant="outline"
                  className="px-8 py-5 h-auto bg-card border-border/50 hover:bg-muted text-foreground font-semibold rounded-xl shadow-xs transition-all hover:scale-102"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                      Loading...
                    </>
                  ) : (
                    "Load More Items"
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
    gradient: "from-amber-400/90 to-orange-600/90",
  },
  Electronics: {
    icon: Laptop,
    gradient: "from-blue-400/90 to-indigo-600/90",
  },
  Furniture: {
    icon: Sofa,
    gradient: "from-emerald-400/90 to-teal-600/90",
  },
  Clothing: {
    icon: Shirt,
    gradient: "from-pink-400/90 to-rose-600/90",
  },
  Sports: {
    icon: Trophy,
    gradient: "from-yellow-400/90 to-amber-600/90",
  },
  Other: {
    icon: Package,
    gradient: "from-purple-400/90 to-violet-600/90",
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
    setLocation(`/item/${item.id}`);
  };

  const { icon: CategoryIcon, gradient } = getCategoryMeta(item.category);

  return (
    <div 
      className="glass-card premium-hover-card rounded-2xl overflow-hidden flex flex-col justify-between h-[420px] group cursor-pointer"
      onClick={handleContact}
    >
      <div>
        {/* Image / Placeholder */}
        <div className="w-full h-48 bg-muted overflow-hidden relative">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white p-4 transition-transform duration-500 group-hover:scale-102`}
            >
              <CategoryIcon className="w-12 h-12 opacity-80 mb-2 drop-shadow-sm" />
              <span className="text-[10px] font-bold opacity-90 tracking-wider uppercase bg-black/15 backdrop-blur-xs px-2 py-0.5 rounded-full">
                {item.category || "Other"}
              </span>
            </div>
          )}
          {/* Availability Badge Overlay */}
          <div className="absolute top-3 right-3 z-10">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${
                item.status === "OPEN"
                  ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
              }`}
            >
              {item.status === "OPEN" ? "Available" : item.status}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex gap-1.5 items-center mb-3">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                (
                  {
                    New: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                    "Like New":
                      "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
                    Good: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                    Fair: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
                    Poor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  } as Record<string, string>
                )[item.condition] || "bg-muted/50 border-border/40 text-muted-foreground"
              }`}
            >
              {item.condition || "Good"}
            </span>
            {item.category && (
              <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider bg-muted/40 border border-border/20 px-2 py-0.5 rounded-md">
                {item.category}
              </span>
            )}
          </div>

          <h3 className="text-base font-bold text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      <div className="p-5 pt-0">
        {/* Price and Actions */}
        <div className="flex items-center justify-between mb-4 mt-auto">
          <div className="text-2xl font-black text-foreground">₹{item.amount}</div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={e => {
              e.stopPropagation();
              handleContact();
            }}
            className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl shadow-xs transition-all hover:shadow-md hover:shadow-primary/10 h-10 text-xs"
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
              className="hover:border-primary hover:text-primary transition-colors border-border/50 rounded-xl h-10 w-10 p-0"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden h-[420px] border border-border/40 p-5 flex flex-col justify-between animate-pulse">
      <div>
        <div className="w-full h-48 bg-muted/60 rounded-xl mb-4" />
        <div className="flex gap-2 mb-3">
          <div className="w-16 h-4 bg-muted/60 rounded" />
          <div className="w-16 h-4 bg-muted/60 rounded" />
        </div>
        <div className="w-3/4 h-5 bg-muted/80 rounded mb-2.5" />
        <div className="w-full h-4 bg-muted/40 rounded mb-1.5" />
        <div className="w-5/6 h-4 bg-muted/40 rounded" />
      </div>
      <div>
        <div className="w-24 h-7 bg-muted/80 rounded mb-4" />
        <div className="w-full h-10 bg-muted/60 rounded-xl" />
      </div>
    </div>
  );
}
