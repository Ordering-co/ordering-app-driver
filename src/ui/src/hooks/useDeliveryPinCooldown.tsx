import { useEffect, useState } from 'react';
import { _retrieveStoreData, _setStoreData } from '../providers/StoreUtil';

const STORAGE_KEY = 'delivery_pin_retry_at';

const DELIVERY_PIN_WAIT_ERROR_CODES = ['delivery_pin.invalid', 'delivery_pin.too_many_attempts'];

type RetryAtByOrder = Record<string, number>;

export const deliveryPinRetryAfter = (errorCodes?: string[] | null, retryAfter?: number | string | null) =>
  !!errorCodes?.some((code) => DELIVERY_PIN_WAIT_ERROR_CODES.includes(code)) && Number(retryAfter) > 0
    ? Number(retryAfter)
    : 0;

const readRetryAt = async (): Promise<RetryAtByOrder> => {
  const stored: RetryAtByOrder = (await _retrieveStoreData(STORAGE_KEY)) || {};
  const now = Date.now();
  const pending = Object.fromEntries(
    Object.entries(stored).filter(([, retryAt]) => Number(retryAt) > now)
  );
  if (Object.keys(pending).length !== Object.keys(stored).length) {
    await _setStoreData(STORAGE_KEY, pending);
  }
  return pending;
};

export const useDeliveryPinCooldown = (orderIds: Array<number | string>) => {
  const ids = orderIds.map(String);
  const idsKey = ids.join(',');

  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  const latestFor = (stored: RetryAtByOrder) =>
    ids.reduce((max, id) => Math.max(max, stored[id] ?? 0), 0);

  useEffect(() => {
    if (!ids.length) {
      setRetryAt(0);
      return;
    }
    let active = true;
    readRetryAt().then((stored) => {
      if (active) setRetryAt(latestFor(stored));
    });
    return () => { active = false; };
  }, [idsKey]);

  useEffect(() => {
    setNow(Date.now());
    if (retryAt <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  const waitFor = async (secondsByOrder: Record<string, number>) => {
    const stored = await readRetryAt();
    const current = Date.now();
    Object.entries(secondsByOrder).forEach(([id, seconds]) => {
      if (seconds > 0) stored[id] = current + seconds * 1000;
    });
    await _setStoreData(STORAGE_KEY, stored);
    setRetryAt(latestFor(stored));
  };

  const clear = async () => {
    const stored = await readRetryAt();
    ids.forEach((id) => { delete stored[id]; });
    await _setStoreData(STORAGE_KEY, stored);
    setRetryAt(0);
  };

  return {
    secondsLeft: Math.max(0, Math.ceil((retryAt - now) / 1000)),
    waitFor,
    clear,
  };
};
