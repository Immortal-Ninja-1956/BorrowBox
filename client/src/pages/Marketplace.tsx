import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  MessageCircle,
  Search,
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
  SlidersHorizontal,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { usePageMetadata } from "@/_core/hooks/usePageMetadata";

export default function Marketplace() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  usePageMetadata("Marketplace", "Explore active item listings for buying, renting, or sharing on campus.");
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

  useEffect(() => {
    setOffset(0);
    setAccumulatedItems([]);
  }, [searchQuery, selectedCategory, showMyListings, sortBy]);

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

  // Removed authLoading early return so skeletons can render immediately

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
      {/* Clean, Structured Header */}
      <div className="bg-card border-b border-border sticky top-16 z-30 shadow-sm">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
                Discover
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Find exactly what you need on campus. Borrow, buy, or share items with your peers.
              </p>
            </div>
            <Button
              onClick={() => setLocation("/create-post")}
              size="lg"
              className="bg-primary text-primary-foreground font-semibold rounded-xl w-full md:w-auto"
            >
              Post an Item
            </Button>
          </div>

          {/* Minimal Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-1" ref={searchContainerRef}>
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                placeholder="Search items, categories, or keywords..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                className="w-full pl-12 h-14 bg-background border-border hover:border-muted-foreground/30 focus:border-primary rounded-xl text-base transition-colors"
              />
              
              {showSuggestions &&
                searchQuery.length >= 2 &&
                suggestionsData?.items &&
                suggestionsData.items.length > 0 && (
                  <div className="absolute z-50 top-full left-0 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-200">
                    <ul className="max-h-64 overflow-y-auto divide-y divide-border/50">
                      {suggestionsData.items.map(item => (
                         <li
                         key={item.id}
                         className="px-4 py-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                         onClick={() => {
                           setSearchQuery(item.title);
                           if (item.category && item.category !== selectedCategory) {
                             setSelectedCategory(item.category);
                           }
                           setShowSuggestions(false);
                         }}
                       >
                         <div className="flex flex-col">
                           <span className="font-medium text-foreground text-sm">
                             {item.title}
                           </span>
                           <span className="text-xs text-muted-foreground">
                             {item.category || "Other"}
                           </span>
                         </div>
                         <span className="text-sm font-semibold text-foreground">₹{item.amount}</span>
                       </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full h-14 pl-10 pr-10 appearance-none bg-background border border-border hover:border-muted-foreground/30 focus:border-primary rounded-xl text-sm font-medium text-foreground cursor-pointer transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Clean Category Navigation */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? "bg-foreground text-background"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat === "all" ? "All Categories" : cat}
              </button>
            ))}
            
            {isAuthenticated && user && (
              <>
                <div className="w-px h-6 bg-border mx-2 flex-shrink-0" />
                <button
                  onClick={() => setShowMyListings(!showMyListings)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    showMyListings
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  My Listings
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Structured Grid Layout */}
      <div className="container py-10">
        {isLoading && accumulatedItems.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : accumulatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            {searchQuery || selectedCategory !== "all" ? (
              <>
                <SearchX className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  We couldn't find anything matching {searchQuery ? <span className="font-bold text-foreground">"{searchQuery}"</span> : "your filters"}. Try adjusting your keywords or categories.
                </p>
                <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}>
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <PackageOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Marketplace is empty</h3>
                <p className="text-muted-foreground max-w-md mb-6">
                  There are no items listed yet. Be the first to list something!
                </p>
                <Button onClick={() => isAuthenticated ? setLocation("/create-post") : setLocation("/login")}>
                  List an Item
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  size="lg"
                  className="rounded-xl w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Show more items"
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

// Minimal, Premium Card Design
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
      {/* Image Area */}
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
        
        {/* Simple Status Badge */}
        {item.status !== "OPEN" && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-background/90 text-foreground backdrop-blur-sm shadow-sm border border-border/50">
              {item.status}
            </span>
          </div>
        )}
      </div>

      {/* Content Area */}
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

        <h3 
          className="text-base font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors"
          title={item.title}
        >
          {item.title}
        </h3>
        
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4 flex-1">
          {item.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <div className="text-xl font-bold text-foreground">
            ₹{item.amount}
          </div>
          
          <div className="flex gap-2">
            {isOwner ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation(`/edit-post/${item.id}`);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden h-full flex flex-col animate-pulse">
      <div className="aspect-[4/3] w-full bg-muted/50" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex gap-2 mb-3">
          <div className="w-12 h-3 bg-muted rounded" />
          <div className="w-16 h-3 bg-muted rounded" />
        </div>
        <div className="w-3/4 h-5 bg-muted rounded mb-2" />
        <div className="w-full h-4 bg-muted/60 rounded mb-1" />
        <div className="w-5/6 h-4 bg-muted/60 rounded mb-4" />
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <div className="w-20 h-6 bg-muted rounded" />
          <div className="w-8 h-8 bg-muted rounded-full" />
        </div>
      </div>
    </div>
  );
}
