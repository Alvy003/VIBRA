import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';

export function useSocketReconnect() {
  const { isConnected, currentUserId, initSocket, refreshOnlineStatus } = useChatStore();
  const lastVisibleRef = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceHidden = Date.now() - lastVisibleRef.current;
        
        if (timeSinceHidden > 30000) {
          if (currentUserId && isConnected) {
            refreshOnlineStatus();
          } else if (currentUserId && !isConnected) {
            initSocket(currentUserId);
          }
        }
      } else {
        lastVisibleRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUserId, isConnected, initSocket, refreshOnlineStatus]);
}