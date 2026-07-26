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
import { motion } from "framer-motion";

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

  const handleNav = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    setLocation("/");
  };

  // Don't render on Home, Login, Register, Forgot Password, or Reset Password pages — those have their own headers
  const isAuthPage =
    location === "/" ||
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location === "/reset-password" ||
    location === "/verify-email";

  if (isAuthPage) {
    return null;
  }

  // For unauthenticated users on public pages, show a minimal guest navbar
  const isPublicPage =
    location === "/marketplace" || location.startsWith("/item/");

  if (!isAuthenticated && !loading) {
    if (!isPublicPage) return null;
    return (
      <nav className="glass-navbar">
        <div className="container flex items-center justify-between h-16">
          <button
            onClick={() => handleNav("/")}
            className="flex items-center gap-2.5 group transition-opacity cursor-pointer"
          >
            <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
              <ShoppingBag className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden sm:inline">
              CampusCart
            </span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => handleNav("/login")} className="hover:bg-muted/50 font-medium">
              Sign In
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-md font-semibold transition-all hover:shadow-primary/20" onClick={() => handleNav("/register")}>
              Sign Up
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  // Don't render while loading
  if (loading) {
    return null;
  }

  return (
    <nav className="glass-navbar">
      <div className="container flex items-center justify-between h-16">
        {/* Brand */}
        <button
          onClick={() => handleNav("/")}
          className="flex items-center gap-2.5 group transition-opacity"
        >
          <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
            <ShoppingBag className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
          </div>
          <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent hidden sm:inline">
            CampusCart
          </span>
        </button>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1.5">
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
                  flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    isActive
                      ? "bg-primary/15 border border-primary/20 text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
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
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title={
                theme === "dark"
                  ? "Switch to Light Mode"
                  : "Switch to Dark Mode"
              }
            >
              <motion.div
                key={theme}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </motion.div>
            </Button>
          )}
          <span className="text-sm font-medium text-foreground bg-muted/40 border border-border/30 px-3 py-1 rounded-full">{user?.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-muted/50 border border-border/30 transition-colors"
        >
          {mobileOpen ? (
            <X className="w-5 h-5 text-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-card/95 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
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
                    flex items-center gap-3 w-full px-3.5 py-3 rounded-lg text-sm font-medium transition-all
                    ${
                      isActive
                        ? "bg-primary/15 border border-primary/20 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
            <div className="border-t border-border/40 pt-2.5 mt-2.5">
              {toggleTheme && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground font-medium">Theme</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    {theme === "dark" ? (
                      <span className="flex items-center gap-1.5">
                        <motion.div
                          key="dark"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Sun className="w-4 h-4" />
                        </motion.div>
                        Light Mode
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <motion.div
                          key="light"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Moon className="w-4 h-4" />
                        </motion.div>
                        Dark Mode
                      </span>
                    )}
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 mt-1.5 pt-2">
                <span className="text-sm text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap max-w-[180px]">
                  Signed in as{" "}
                  <span className="font-semibold text-foreground">
                    {user?.name}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom TabBar — 1-tap navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border/50 px-2 py-2 shadow-2xl">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navLinks.map((link) => {
            const isActive = location === link.path;
            const Icon = link.icon;
            const isPost = link.path === "/create-post";

            if (isPost) {
              return (
                <button
                  key={link.path}
                  onClick={() => handleNav(link.path)}
                  className="flex flex-col items-center justify-center -mt-6 group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95 group-hover:scale-105">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold mt-1 text-primary">Post</span>
                </button>
              );
            }

            return (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110 text-primary" : ""}`} />
                <span className="text-[10px] font-semibold mt-1">{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
