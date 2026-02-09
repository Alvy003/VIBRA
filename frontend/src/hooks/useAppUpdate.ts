// src/hooks/useAppUpdate.ts
import { useState, useCallback, useRef, useEffect } from 'react';

const SW_VERSION_KEY = 'vibra_sw_version';
const LAST_CHECK_KEY = 'vibra_last_update_check';
const DISMISSED_VERSION_KEY = 'vibra_dismissed_update_version';
const APPLIED_VERSION_KEY = 'vibra_applied_update_version';

export const useAppUpdate = (autoCheck = false) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateApplied, setUpdateApplied] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const hasCheckedWaitingRef = useRef(false);

  const getSwVersion = useCallback(
    (sw: ServiceWorker | null): Promise<string | null> => {
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
    },
    []
  );

  const isGenuineUpdate = useCallback(
    (activeVersion: string | null, waitingVersion: string | null): boolean => {
      if (!waitingVersion || !activeVersion) return false;
      if (waitingVersion === activeVersion) return false;

      const appliedVersion = localStorage.getItem(APPLIED_VERSION_KEY);
      if (appliedVersion === waitingVersion) return false;

      const dismissedVersion = localStorage.getItem(DISMISSED_VERSION_KEY);
      if (dismissedVersion === waitingVersion) return false;

      return true;
    },
    []
  );

  const evaluateWaitingWorker = useCallback(
    async (reg: ServiceWorkerRegistration): Promise<boolean> => {
      if (!reg.waiting) return false;

      const activeVersion = await getSwVersion(reg.active);
      const waitingVersion = await getSwVersion(reg.waiting);

      setCurrentVersion(activeVersion);
      if (activeVersion) {
        localStorage.setItem(SW_VERSION_KEY, activeVersion);
      }

      if (isGenuineUpdate(activeVersion, waitingVersion)) {
        setNewVersion(waitingVersion);
        setUpdateAvailable(true);
        return true;
      }

      if (reg.waiting && waitingVersion && waitingVersion === activeVersion) {
        try {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch {
          // ignore
        }
      }

      return false;
    },
    [getSwVersion, isGenuineUpdate]
  );

  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    setIsChecking(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      registrationRef.current = reg;

      const activeVersion = await getSwVersion(reg.active);
      setCurrentVersion(activeVersion);
      if (activeVersion) {
        localStorage.setItem(SW_VERSION_KEY, activeVersion);
      }

      await reg.update();
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (reg.waiting) {
        const found = await evaluateWaitingWorker(reg);
        if (found) {
          setIsChecking(false);
          localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
          return true;
        }
      }

      const installingWorker = reg.installing;
      if (installingWorker) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            if (
              installingWorker.state === 'installed' ||
              installingWorker.state === 'redundant'
            ) {
              installingWorker.removeEventListener('statechange', handler);
              resolve();
            }
          };
          installingWorker.addEventListener('statechange', handler);
          setTimeout(() => {
            installingWorker.removeEventListener('statechange', handler);
            resolve();
          }, 10000);
        });

        if (reg.waiting) {
          const found = await evaluateWaitingWorker(reg);
          if (found) {
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
  }, [getSwVersion, evaluateWaitingWorker]);

  // Apply update — NO RELOAD, just activate and tell user to reopen
  const applyUpdate = useCallback(async () => {
    const reg = registrationRef.current;

    if (!reg?.waiting) {
      // No waiting worker, nothing to do
      setUpdateAvailable(false);
      return;
    }

    setIsUpdating(true);

    if (newVersion) {
      localStorage.setItem(APPLIED_VERSION_KEY, newVersion);
      localStorage.setItem(SW_VERSION_KEY, newVersion);
    }

    // Tell the waiting SW to activate
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for the new SW to take control
    await new Promise<void>((resolve) => {
      const onControllerChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve();
      };
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      // Fallback timeout
      setTimeout(resolve, 3000);
    });

    setIsUpdating(false);
    setUpdateAvailable(false);
    setUpdateApplied(true);
    sessionStorage.setItem('vibra_update_applied', '1');
  }, [newVersion]);

  useEffect(() => {
    if (hasCheckedWaitingRef.current) return;
    hasCheckedWaitingRef.current = true;

    const storedVersion = localStorage.getItem(SW_VERSION_KEY);
    if (storedVersion) {
      setCurrentVersion(storedVersion);
    }

    const appliedVersion = localStorage.getItem(APPLIED_VERSION_KEY);
    const wasUpdateApplied = sessionStorage.getItem('vibra_update_applied') === '1';

    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready
      .then(async (reg) => {
        registrationRef.current = reg;

        const activeVersion = await getSwVersion(reg.active);
        if (activeVersion) {
          setCurrentVersion(activeVersion);
          localStorage.setItem(SW_VERSION_KEY, activeVersion);

          if (appliedVersion === activeVersion) {
            // Update successfully applied — the active SW is the new version
            localStorage.removeItem(APPLIED_VERSION_KEY);
            sessionStorage.removeItem('vibra_update_applied');
            // Don't show "reopen" banner since it's already active
          } else if (wasUpdateApplied && appliedVersion && appliedVersion !== activeVersion) {
            // Update was applied (skipWaiting sent) but the new SW
            // hasn't taken control yet — show the reopen message
            setUpdateApplied(true);
          }
        }

        if (reg.waiting) {
          await evaluateWaitingWorker(reg);
        }

        if (autoCheck) {
          const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
          const oneHour = 60 * 60 * 1000;
          const shouldCheck =
            !lastCheck ||
            Date.now() - new Date(lastCheck).getTime() > oneHour;

          if (shouldCheck) {
            setTimeout(() => checkForUpdate(), 3000);
          }
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && reg.waiting) {
              evaluateWaitingWorker(reg);
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  return {
    updateAvailable,
    isChecking,
    isUpdating,
    updateApplied,
    currentVersion,
    newVersion,
    checkForUpdate,
    applyUpdate,
  };
};