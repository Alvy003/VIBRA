import { useEffect } from "react";

// ✅ Cleanup blob URLs when app unmounts
export function useCleanupBlobUrls() {
  useEffect(() => {
    return () => {
      // This will run when the app/component unmounts
      // You can also call this manually when needed
    };
  }, []);
}