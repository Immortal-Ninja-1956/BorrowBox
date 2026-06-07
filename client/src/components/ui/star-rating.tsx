import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  maxRating?: number;
  className?: string;
  size?: number;
  disabled?: boolean;
}

export function StarRating({
  rating,
  onRatingChange,
  maxRating = 5,
  className,
  size = 20,
  disabled = false,
}: StarRatingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={index}
            type="button"
            disabled={disabled || !onRatingChange}
            onClick={() => onRatingChange?.(starValue)}
            className={cn(
              "transition-colors",
              !disabled && onRatingChange && "hover:scale-110",
              disabled && "cursor-default"
            )}
          >
            <Star
              size={size}
              className={cn(
                isFilled ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
                !isFilled && "opacity-50"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
