// src/hooks/useAppUpdate.ts
import { useState, useCallback, useRef, useEffect } from 'react';

const SW_VERSION_KEY = 'vibra_sw_version';
const LAST_CHECK_KEY = 'vibra_last_update_check';

export const useAppUpdate = (autoCheck = false) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  // Get SW version via postMessage
  const getSwVersion = useCallback((sw: ServiceWorker | null): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!sw || sw.state === 'redundant') {
        resolve(null);
        return;
      }

      const timeout = setTimeout(() => resolve(null), 2000);
      
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data?.version || null);
      };

      try {
        sw.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  }, []);

  // Check for updates
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    setIsChecking(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      registrationRef.current = reg;

      // Get current active version
      const activeVersion = await getSwVersion(reg.active);
      setCurrentVersion(activeVersion);
      if (activeVersion) {
        localStorage.setItem(SW_VERSION_KEY, activeVersion);
      }

      // Force check for updates
      await reg.update();

      // Wait for update to be detected
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check if there's a waiting worker
      if (reg.waiting) {
        const waitingVersion = await getSwVersion(reg.waiting);
        setNewVersion(waitingVersion);
        
        if (waitingVersion && waitingVersion !== activeVersion) {
          setUpdateAvailable(true);
          setIsChecking(false);
          localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
          return true;
        }
      }

      // Check installing worker - with null check fix
      const installingWorker = reg.installing;
      if (installingWorker) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            if (installingWorker.state === 'installed') {
              installingWorker.removeEventListener('statechange', handler);
              resolve();
            }
          };
          installingWorker.addEventListener('statechange', handler);
          setTimeout(resolve, 10000);
        });

        if (reg.waiting) {
          const waitingVersion = await getSwVersion(reg.waiting);
          setNewVersion(waitingVersion);
          if (waitingVersion && waitingVersion !== activeVersion) {
            setUpdateAvailable(true);
            setIsChecking(false);
            localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
            return true;
          }
        }
      }

      localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
      setIsChecking(false);
      return false;
    } catch (error) {
      console.error('Update check failed:', error);
      setIsChecking(false);
      return false;
    }
  }, [getSwVersion]);

  // Apply update
  const applyUpdate = useCallback(async () => {
    const reg = registrationRef.current;
    
    if (!reg?.waiting) {
      window.location.reload();
      return;
    }

    setIsUpdating(true);

    if (newVersion) {
      localStorage.setItem(SW_VERSION_KEY, newVersion);
    }

    reg.waiting.postMessage({ type: 'SKIP_WAITING' });

    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [newVersion]);

  // Load stored version on mount + optional auto-check
  useEffect(() => {
    const storedVersion = localStorage.getItem(SW_VERSION_KEY);
    if (storedVersion) {
      setCurrentVersion(storedVersion);
    }

    // Auto-check if enabled
    if (autoCheck && 'serviceWorker' in navigator) {
      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      const oneHour = 60 * 60 * 1000;
      const shouldCheck = !lastCheck || (Date.now() - new Date(lastCheck).getTime() > oneHour);
      
      if (shouldCheck) {
        setTimeout(() => checkForUpdate(), 3000);
      } else {
        // Still check for waiting worker without network request
        navigator.serviceWorker.ready.then(async (reg) => {
          registrationRef.current = reg;
          if (reg.waiting) {
            const activeVersion = await getSwVersion(reg.active);
            const waitingVersion = await getSwVersion(reg.waiting);
            setCurrentVersion(activeVersion);
            if (waitingVersion && waitingVersion !== activeVersion) {
              setNewVersion(waitingVersion);
              setUpdateAvailable(true);
            }
          }
        }).catch(() => {});
      }
    }
  }, [autoCheck, checkForUpdate, getSwVersion]);

  return {
    updateAvailable,
    isChecking,
    isUpdating,
    currentVersion,
    newVersion,
    checkForUpdate,
    applyUpdate,
  };
};