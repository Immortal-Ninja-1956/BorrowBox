import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { useLocation } from "wouter";

export function AboutUsButton() {
  const [location, setLocation] = useLocation();

  if (location === "/" || location === "/about") {
    return null;
  }

  return (
    <Button
      onClick={() => setLocation("/about")}
      className="fixed bottom-6 right-6 rounded-full shadow-lg z-50 bg-foreground text-background hover:bg-foreground/90 px-6 py-6 font-semibold"
    >
      <Info className="w-5 h-5 mr-2" />
      About Us
    </Button>
  );
}
