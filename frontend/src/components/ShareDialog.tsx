// src/components/ShareDialog.tsx
import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Copy, 
  Check,
  MessageCircle,
  Twitter,
  Facebook,
  Link2,
} from "lucide-react";
import toast from "react-hot-toast";

// WhatsApp icon (not in lucide)
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Telegram icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  url: string;
  imageUrl?: string;
}

const ShareDialog = ({ isOpen, onClose, title, text, url, imageUrl }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOptions = [
    {
      name: "Copy Link",
      icon: copied ? Check : Copy,
      color: "bg-zinc-700",
      iconColor: copied ? "text-green-400" : "text-white",
      action: copyToClipboard,
    },
    {
      name: "WhatsApp",
      icon: WhatsAppIcon,
      color: "bg-[#25D366]",
      iconColor: "text-white",
      action: () => {
        const shareText = text ? `${text}\n${url}` : url;
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
        onClose();
      },
    },
    {
      name: "Telegram",
      icon: TelegramIcon,
      color: "bg-[#0088cc]",
      iconColor: "text-white",
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || title)}`, '_blank');
        onClose();
      },
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "bg-[#1DA1F2]",
      iconColor: "text-white",
      action: () => {
        const tweetText = text || title;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`, '_blank');
        onClose();
      },
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "bg-[#1877F2]",
      iconColor: "text-white",
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        onClose();
      },
    },
    {
      name: "Messages",
      icon: MessageCircle,
      color: "bg-green-600",
      iconColor: "text-white",
      action: () => {
        const shareText = text ? `${text} ${url}` : url;
        window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
        onClose();
      },
    },
  ];

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100000]"
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[100001] flex items-end sm:items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle bar (mobile) */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="w-10 h-1 bg-zinc-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shadow-lg"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
                      <p className="text-sm text-zinc-400 mt-0.5">Share this song</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-zinc-800 rounded-xl transition-colors shrink-0"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Share Options Grid */}
              <div className="px-5 pb-6">
                <div className="grid grid-cols-4 gap-4">
                  {shareOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={option.action}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl ${option.color} flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95 shadow-lg`}
                      >
                        <option.icon className={`w-6 h-6 ${option.iconColor}`} />
                      </div>
                      <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">
                        {option.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* URL Preview */}
              <div className="px-5 pb-6">
                <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                  <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="text-sm text-zinc-400 truncate flex-1">{url}</span>
                  <button
                    onClick={copyToClipboard}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ShareDialog;