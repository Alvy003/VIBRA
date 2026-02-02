// src/layout/components/BottomNav.tsx
import { cn } from "@/lib/utils";
import { Home, Search, Library, Download, MessageCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { SignedIn } from "@clerk/clerk-react";
import { useChatStore } from "@/stores/useChatStore";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useMemo } from "react";

const BottomNav = () => {
  const location = useLocation();
  const { unreadMessagesByUser, selectedUser } = useChatStore();
  const { updateAvailable } = useAppUpdate(true);

  const totalUnread = useMemo(
    () => Object.values(unreadMessagesByUser || {}).reduce((a, b) => a + b, 0),
    [unreadMessagesByUser]
  );

  const hideRoutes = ["/admin"];
  const shouldHide = hideRoutes.some((route) => location.pathname.startsWith(route));
  const isInActiveChat = location.pathname.startsWith("/chat") && selectedUser;
  if (shouldHide || isInActiveChat) return null;

  const isActivePath = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden">
      <div
        className={cn(
          "relative",
          "bg-gradient-to-b from-zinc-900/80 via-zinc-900/90 to-zinc-900",
          "border-t border-white/0"
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />

        <div className="relative flex items-center justify-around h-14 px-2">
          <NavItem icon={Home} label="Home" to="/" active={isActivePath("/")} />
          <NavItem icon={Search} label="Search" to="/search" active={isActivePath("/search")} />
          <NavItem icon={Library} label="Library" to="/library" active={isActivePath("/library")} />

          <SignedIn>
            <NavItem
              icon={MessageCircle}
              label="Chat"
              to="/chat"
              active={isActivePath("/chat")}
              badge={totalUnread}
            />
          </SignedIn>

          <NavItem 
            icon={Download} 
            label="Downloads" 
            to="/downloads" 
            active={isActivePath("/downloads")}
            hasUpdate={updateAvailable}
          />
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
};

/**
 * NavItem with support for:
 * - Numeric badge (for unread counts)
 * - Update indicator (subtle dot with optional ring animation)
 */
function NavItem({
  icon: Icon,
  label,
  to,
  active,
  badge,
  hasUpdate,
}: {
  icon: React.ElementType;
  label: string;
  to: string;
  active: boolean;
  badge?: number;
  hasUpdate?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-colors",
        active ? "text-white" : "text-zinc-300/70 active:text-zinc-200"
      )}
    >
      <div className="relative">
        <Icon className={cn("w-[22px] h-[22px]", active ? "text-white" : "text-zinc-300/80")} />
        
        {/* Numeric badge for unread counts */}
        {!!badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-violet-500 text-[10px] leading-4 text-white text-center font-medium">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        
        {/* Update available indicator - subtle dot with slow ring pulse */}
        {hasUpdate && !badge && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
            {/* Outer ring - slow, calm animation */}
            <span 
              className={cn(
                "absolute size-3 rounded-full bg-violet-500/30",
                "animate-ping motion-reduce:animate-none"
              )}
              style={{ animationDuration: "2s" }}
            />
            {/* Inner dot - static */}
            <span className="relative size-2 rounded-full bg-violet-500" />
          </span>
        )}
      </div>
      
      <span className={cn("text-[10px] font-medium", active ? "text-white" : "text-zinc-300/70")}>
        {label}
      </span>
    </NavLink>
  );
}

export default BottomNav;