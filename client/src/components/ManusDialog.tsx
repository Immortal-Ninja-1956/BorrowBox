import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface AuthDialogProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
}

export function ManusDialog({
  isOpen,
  onClose,
  title = "Sign in required",
  description = "You need to be logged in to continue.",
}: AuthDialogProps) {
  const [, setLocation] = useLocation();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => setLocation("/login")}>
            Sign In
          </Button>
          {onClose && (
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
