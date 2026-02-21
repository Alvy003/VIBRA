// src/components/SaveToLibraryButton.tsx
import { useState } from "react";
import { useSavedItemsStore, SavedItem } from "@/stores/useSavedItemsStore";
import { useUser } from "@clerk/clerk-react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface SaveToLibraryButtonProps {
  itemData: Omit<SavedItem, "_id" | "userId" | "createdAt">;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg"; // sm = sticky header, md = compact action bar, lg = full action bar
  className?: string;
}

const SaveToLibraryButton = ({ 
  itemData, 
  variant = "icon", 
  size = "md",
  className 
}: SaveToLibraryButtonProps) => {
  const { isSignedIn } = useUser();
  const { saveItem, unsaveItem, isSaved } = useSavedItemsStore();
  const [isSaving, setIsSaving] = useState(false);
  const saved = isSaved(itemData.externalId);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isSignedIn) {
      toast.custom(
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-white/10"
        >
          <span className="text-sm">Sign in to save to library</span>
        </motion.div>,
        { duration: 2000 }
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    try {
      if (saved) {
        await unsaveItem(itemData.externalId);
        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-zinc-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-white/10"
          >
            <span className="text-sm">Removed from library</span>
          </motion.div>,
          { duration: 1500 }
        );
      } else {
        await saveItem(itemData);
        toast.custom(
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-violet-600/90 text-white px-4 py-2 rounded-full shadow-lg border border-violet-500/20"
          >
            <span className="text-sm">Saved to library</span>
          </motion.div>,
          { duration: 1500 }
        );
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  // Size mappings to match Shuffle button
  const sizeClasses = {
    sm: "w-8 h-8",      // Sticky header compact
    md: "w-10 h-10",    // Action bar compact
    lg: "w-12 h-12",    // Action bar full
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (variant === "button") {
    return (
      <button
        onClick={handleToggle}
        disabled={isSaving}
        className={cn(
          "rounded-full border transition-all duration-300 ease-out flex items-center justify-center",
          sizeClasses[size],
          saved
            ? "border-violet-500/50 text-violet-400 bg-violet-500/20"
            : "border-white/20 text-white/70 hover:text-white hover:border-white/40",
          isSaving && "opacity-50",
          className
        )}
        title={saved ? "Remove from library" : "Save to library"}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={saved ? "saved" : "unsaved"}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Bookmark className={cn(iconSizeClasses[size], saved && "fill-current")} />
          </motion.div>
        </AnimatePresence>
      </button>
    );
  }

  // Icon variant (for sticky headers)
  return (
    <button
      onClick={handleToggle}
      disabled={isSaving}
      className={cn(
        "rounded-full border transition-all duration-300 ease-out flex items-center justify-center",
        sizeClasses[size],
        saved
          ? "border-violet-500/50 text-violet-400 bg-violet-500/20"
          : "border-white/20 text-white/70 hover:text-white hover:border-white/40",
        isSaving && "opacity-50",
        className
      )}
      title={saved ? "Remove from library" : "Save to library"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Bookmark className={cn(iconSizeClasses[size], saved && "fill-current")} />
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default SaveToLibraryButton;