// src/components/Topbar.tsx
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-react";
import { LayoutDashboardIcon } from "lucide-react";
import { Link } from "react-router-dom";
import SignInOAuthButtons from "./SignInOAuthButtons";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type TopbarProps = {
  className?: string;
};

const Topbar = ({ className }: TopbarProps) => {
  const { isAdmin } = useAuthStore();
  const { user } = useUser();

  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 sticky top-0 bg-zinc-900/75 backdrop-blur-md z-10 text-white/95",
        className
      )}
    >
      <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity duration-300">
        <img src="/vibra.png" className="w-8 h-8" alt="Vibra logo" />
        <span className="text-base font-semibold tracking-wide font-[Poppins,sans-serif] hover:text-violet-100 transition-colors duration-300">
          VIBRA
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "bg-white/4 lg:hover:bg-white/10 border-t border-transparent transition-colors mr-2 duration-200"
            )}
          >
            <LayoutDashboardIcon className="size-4" />
          </Link>
        )}

        <SignedOut>
          <SignInOAuthButtons />
        </SignedOut>

        <SignedIn>
          <Link
            to="/profile"
            className="relative rounded-full hover:ring-2 hover:ring-violet-500/50 transition-all duration-200 active:scale-95"
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-sm">
                {user?.fullName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
        </SignedIn>
      </div>
    </div>
  );
};

export default Topbar;