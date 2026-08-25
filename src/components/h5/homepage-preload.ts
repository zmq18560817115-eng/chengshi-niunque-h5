type HomepageAssetPriority = "high" | "auto" | "low";

export type HomepageAssetRequest = {
  src: string;
  priority?: HomepageAssetPriority;
};

export type HomepagePreloadResult = {
  total: number;
  failed: string[];
};

const retainedImages = new Map<string, HTMLImageElement>();
const inFlightImages = new Map<string, Promise<void>>();
const assetTimeoutMs = 30000;

function preloadOnce({ src, priority = "auto" }: HomepageAssetRequest) {
  const retained = retainedImages.get(src);
  if (retained?.complete && retained.naturalWidth > 0) return Promise.resolve();
  const inFlight = inFlightImages.get(src);
  if (inFlight) return inFlight;

  const image = new window.Image();
  image.decoding = "async";
  image.loading = "eager";
  image.fetchPriority = priority;
  retainedImages.set(src, image);

  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(src));
  });
  image.src = src;
  const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
  let timeoutId = 0;
  const timeout = new Promise<void>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${src}: timeout`)), assetTimeoutMs);
  });
  const task = Promise.race([Promise.all([loaded, decoded]).then(() => undefined), timeout])
    .finally(() => {
      window.clearTimeout(timeoutId);
      inFlightImages.delete(src);
    });
  inFlightImages.set(src, task);
  return task;
}

async function preloadWithRetry(request: HomepageAssetRequest) {
  try {
    await preloadOnce(request);
  } catch {
    retainedImages.delete(request.src);
    inFlightImages.delete(request.src);
    await preloadOnce(request);
  }
}

export async function preloadHomepageAssets(requests: readonly HomepageAssetRequest[]): Promise<HomepagePreloadResult> {
  const requestMap = requests.reduce((map, request) => {
    if (!map.has(request.src)) map.set(request.src, request);
    return map;
  }, new Map<string, HomepageAssetRequest>());
  const uniqueRequests = [...requestMap.values()];
  const results = await Promise.allSettled(uniqueRequests.map(preloadWithRetry));
  return {
    total: uniqueRequests.length,
    failed: results.flatMap((result, index) => result.status === "rejected" ? [uniqueRequests[index].src] : []),
  };
}

export function releaseHomepagePreloadedAssets() {
  retainedImages.clear();
  inFlightImages.clear();
}
