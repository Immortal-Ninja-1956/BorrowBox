import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ShoppingBag,
  Store,
  LayoutDashboard,
  PlusCircle,
  User,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Shield,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Marketplace", path: "/marketplace", icon: Store },
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Post Item", path: "/create-post", icon: PlusCircle },
  { label: "Profile", path: "/profile", icon: User },
];

export default function Navbar() {
  const { isAuthenticated, user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Don't render on Home, Login, Register, Forgot Password, or Reset Password pages — those have their own headers
  if (
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/reset-password"
  ) {
    return null;
  }

  // Don't render while loading or if not authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

  const handleNav = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    setLocation("/");
  };

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        {/* Brand */}
        <button
          onClick={() => handleNav("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-accent rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="text-xl font-bold text-accent hidden sm:inline">
            BorrowBox
          </span>
        </button>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {[
            ...navLinks,
            ...(user?.role === "admin"
              ? [{ label: "Admin", path: "/admin", icon: Shield }]
              : []),
          ].map(link => {
            const isActive = location === link.path;
            return (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Desktop User Menu */}
        <div className="hidden md:flex items-center gap-3">
          {toggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              title={
                theme === "dark"
                  ? "Switch to Light Mode"
                  : "Switch to Dark Mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">{user?.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {mobileOpen ? (
            <X className="w-5 h-5 text-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card animate-in slide-in-from-top-2 duration-200">
          <div className="container py-3 space-y-1">
            {[
              ...navLinks,
              ...(user?.role === "admin"
                ? [{ label: "Admin", path: "/admin", icon: Shield }]
                : []),
            ].map(link => {
              const isActive = location === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => handleNav(link.path)}
                  className={`
                    flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-all
                    ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }
                  `}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
            <div className="border-t border-border pt-2 mt-2">
              {toggleTheme && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="w-4 h-4 mr-1" />
                        Light Mode
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 mr-1" />
                        Dark Mode
                      </>
                    )}
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border mt-1 pt-1">
                <span className="text-sm text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap max-w-[180px]">
                  Signed in as{" "}
                  <span className="font-medium text-foreground">
                    {user?.name}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
