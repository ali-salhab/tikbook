const LOTTIE_CACHE_LIMIT = 80;

const lottieCache = new Map<string, unknown>();
const pendingFetches = new Map<string, Promise<unknown>>();

const trimCache = () => {
  while (lottieCache.size > LOTTIE_CACHE_LIMIT) {
    const oldestKey = lottieCache.keys().next().value;
    if (!oldestKey) return;
    lottieCache.delete(oldestKey);
  }
};

export const getCachedLottieJson = (url?: string): unknown | null => {
  if (!url) return null;
  return lottieCache.get(url) ?? null;
};

export const fetchLottieJson = async (url?: string): Promise<unknown | null> => {
  if (!url) return null;

  if (lottieCache.has(url)) {
    return lottieCache.get(url) ?? null;
  }

  if (pendingFetches.has(url)) {
    return pendingFetches.get(url) as Promise<unknown>;
  }

  const request = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load lottie (${response.status})`);
      }
      return response.json();
    })
    .then((json) => {
      lottieCache.set(url, json);
      trimCache();
      return json;
    })
    .finally(() => {
      pendingFetches.delete(url);
    });

  pendingFetches.set(url, request);

  try {
    return await request;
  } catch {
    return null;
  }
};
