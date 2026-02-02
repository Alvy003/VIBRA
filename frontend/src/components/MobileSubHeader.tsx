import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type MobileSubHeaderProps = {
  title: string;
  /** Show back arrow (default: false) */
  showBack?: boolean;
  /** Override back behavior */
  onBack?: () => void;
  /** Right-side content (icons / buttons) */
  rightSlot?: ReactNode;
  /** Extra classes */
  className?: string;
};

const MobileSubHeader = ({
  title,
  showBack = false,
  onBack,
  rightSlot,
  className,
}: MobileSubHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 mb-0",
        "bg-gradient-to-b from-zinc-900/90 to-zinc-900/10",
        "backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center justify-between h-12 py-5">
        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={onBack ?? (() => navigate(-1))}
              className="md:hidden p-1 -ml-1 rounded-full active:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6 text-white/90" />
            </button>
          )}

          <h1 className="text-2xl md:text-2xl font-bold text-white/90 truncate">
            {title}
          </h1>
        </div>

        {/* Right */}
        {rightSlot && (
          <div className="flex items-center gap-2 shrink-0">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileSubHeader;
