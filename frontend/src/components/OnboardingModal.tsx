// src/components/OnboardingModal.tsx
import { useState } from "react";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useStreamStore } from "@/stores/useStreamStore";
import { motion, AnimatePresence } from "framer-motion";
import { Music, ChevronRight, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const OnboardingModal = () => {
  const {
    preferences,
    availableLanguages,
    toggleLanguage,
    completeOnboarding,
    shouldShowOnboarding,
  } = useOnboardingStore();

  const [step, setStep] = useState(0);

  if (!shouldShowOnboarding()) return null;

  const selectedCount = preferences.languages.length;

  const handleContinue = () => {
    if (step === 0) {
      setStep(1);
      return;
    }

    completeOnboarding();
    useStreamStore.setState({ homepageData: null });
    useStreamStore.getState().fetchHomepage();
  };

  const handleSkip = () => {
    if (selectedCount === 0) {
      toggleLanguage("hindi");
      toggleLanguage("english");
    }
    completeOnboarding();
    useStreamStore.setState({ homepageData: null });
    useStreamStore.getState().fetchHomepage();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="bg-zinc-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl overflow-hidden border border-zinc-800/60 shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col"
        >
          {/* Step Indicator */}
          <div className="flex items-center gap-1.5 px-6 pt-5 pb-1">
            {[0, 1].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  s <= step
                    ? "bg-violet-500 flex-[2]"
                    : "bg-zinc-700/60 flex-1"
                )}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="p-6 flex flex-col items-center text-center"
              >
                {/* Animated Icon */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", damping: 15 }}
                  className="relative mb-5"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 flex items-center justify-center border border-violet-500/10">
                    <Music className="w-9 h-9 text-violet-400" />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", damping: 12 }}
                    className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30"
                  >
                    <span className="text-sm">✨</span>
                  </motion.div>
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                  Welcome to Vibra
                </h2>
                <p className="text-sm text-zinc-400 mb-8 leading-relaxed max-w-[280px]">
                  Your personal music experience starts here. Let's set things
                  up in just a moment.
                </p>

                <button
                  onClick={handleContinue}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold rounded-xl transition-all active:scale-[0.98]"
                >
                  Get Started
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-zinc-600 mt-4">
                  Takes less than 10 seconds
                </p>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="languages"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-h-0"
              >
                {/* Header */}
                <div className="px-6 pt-4 pb-3">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/15 flex items-center justify-center">
                      <Globe className="w-4.5 h-4.5 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white leading-tight">
                        Music Languages
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Choose what you'd like to hear
                      </p>
                    </div>
                  </div>
                </div>

                {/* Language Grid */}
                <div className="px-6 flex-1 overflow-y-auto scrollbar-none min-h-0 max-h-[45vh]">
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {availableLanguages.map((lang) => {
                      const isSelected = preferences.languages.includes(
                        lang.id
                      );
                      return (
                        <motion.button
                          key={lang.id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleLanguage(lang.id)}
                          className={cn(
                            "relative flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200 text-left",
                            isSelected
                              ? "bg-violet-600/15 border-violet-500/40"
                              : "bg-zinc-800/40 border-zinc-700/30 hover:bg-zinc-800/70 hover:border-zinc-600/40"
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm font-medium flex-1 transition-colors",
                              isSelected ? "text-white" : "text-zinc-400"
                            )}
                          >
                            {lang.label}
                          </span>

                          {/* Checkmark */}
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200",
                              isSelected
                                ? "bg-violet-500 scale-100"
                                : "bg-zinc-700/50 scale-90"
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" strokeWidth={3} />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 pt-3 pb-6 border-t border-zinc-800/40 mt-1">
                  {/* Selected count badge */}
                  {selectedCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-1.5 mb-3"
                    >
                      <div className="flex -space-x-1">
                        {selectedCount > 3 && (
                          <span className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] text-zinc-400 font-medium">
                            +{selectedCount - 3}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-400">
                        {selectedCount} selected
                      </span>
                    </motion.div>
                  )}

                  <button
                    onClick={handleContinue}
                    disabled={selectedCount === 0}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-6 py-3.5 font-semibold rounded-xl transition-all active:scale-[0.98]",
                      selectedCount > 0
                        ? "bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    {selectedCount > 0 ? "Continue" : "Select at least 1"}
                    {selectedCount > 0 && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={handleSkip}
                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-400 active:text-zinc-300 mt-2.5 py-1.5 transition-colors"
                  >
                    Skip · defaults to Hindi & English
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingModal;