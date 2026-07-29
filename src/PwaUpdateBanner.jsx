import React, { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let updateSWPromise = null;
const refreshListeners = new Set();

const ensureServiceWorkerRegistered = () => {
  if (updateSWPromise) return updateSWPromise;

  updateSWPromise = Promise.resolve(
    registerSW({
      immediate: true,
      onNeedRefresh() {
        refreshListeners.forEach((listener) => listener());
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        window.setInterval(() => {
          registration.update().catch(() => {
            // Ignore transient update-check failures.
          });
        }, UPDATE_CHECK_INTERVAL_MS);
      },
    }),
  );

  return updateSWPromise;
};

const PwaUpdateBanner = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateSWRef = useRef(null);

  useEffect(() => {
    const onNeedRefresh = () => setShowUpdate(true);
    refreshListeners.add(onNeedRefresh);

    ensureServiceWorkerRegistered().then((updateSW) => {
      updateSWRef.current = updateSW;
    });

    return () => {
      refreshListeners.delete(onNeedRefresh);
    };
  }, []);

  if (!showUpdate) return null;

  const handleUpdateNow = async () => {
    if (!updateSWRef.current || updating) return;
    setUpdating(true);
    try {
      await updateSWRef.current(true);
    } catch {
      setUpdating(false);
    }
  };

  const handleLater = () => {
    setShowUpdate(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex max-w-xl flex-col gap-3 rounded-lg border border-[rgba(232,217,188,0.35)] bg-[#164E6B] px-4 py-3 text-[#F6F2E8] shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Update available</p>
          <p className="mt-0.5 text-xs text-[#E8D9BC]">
            A newer version of PassTracker is ready. Update now, or keep using this version for now.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleLater}
            disabled={updating}
            className="rounded-lg border border-[rgba(232,217,188,0.35)] px-3 py-2 text-sm font-medium text-[#F6F2E8] transition hover:bg-[#1b3349] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleUpdateNow}
            disabled={updating}
            className="rounded-lg bg-[#74C9D7] px-3 py-2 text-sm font-medium text-[#164E6B] transition hover:bg-[#8fd4df] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updating ? 'Updating...' : 'Update now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PwaUpdateBanner;
