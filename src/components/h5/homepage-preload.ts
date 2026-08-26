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
const maxConcurrentPreloads = 4;
const priorityRank: Record<HomepageAssetPriority, number> = { high: 0, auto: 1, low: 2 };
type PreloadQueueJob = {
  src: string;
  priority: HomepageAssetPriority;
  order: number;
  generation: number;
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
};
const queuedJobs = new Map<string, PreloadQueueJob>();
const preloadQueue: PreloadQueueJob[] = [];
const activeJobs = new Set<PreloadQueueJob>();
let activePreloadCount = 0;
let preloadOrder = 0;
let preloadGeneration = 0;

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
      if (inFlightImages.get(src) === task) inFlightImages.delete(src);
    });
  inFlightImages.set(src, task);
  return task;
}

async function performPreloadWithRetry(request: HomepageAssetRequest, generation: number) {
  try {
    await preloadOnce(request);
  } catch {
    if (generation !== preloadGeneration) return;
    retainedImages.delete(request.src);
    inFlightImages.delete(request.src);
    await preloadOnce(request);
  }
}

function pumpPreloadQueue() {
  preloadQueue.sort((left, right) => priorityRank[left.priority] - priorityRank[right.priority] || left.order - right.order);
  while (activePreloadCount < maxConcurrentPreloads && preloadQueue.length > 0) {
    const job = preloadQueue.shift()!;
    if (job.generation !== preloadGeneration) {
      job.resolve();
      continue;
    }
    activePreloadCount += 1;
    activeJobs.add(job);
    void performPreloadWithRetry({ src: job.src, priority: job.priority }, job.generation)
      .then(job.resolve, job.reject)
      .finally(() => {
        activeJobs.delete(job);
        if (job.generation === preloadGeneration) {
          activePreloadCount -= 1;
          pumpPreloadQueue();
        }
      });
  }
}

function preloadWithRetry(request: HomepageAssetRequest) {
  const priority = request.priority ?? "auto";
  const retained = retainedImages.get(request.src);
  if (retained?.complete && retained.naturalWidth > 0) return Promise.resolve();
  const inFlight = inFlightImages.get(request.src);
  if (inFlight) return inFlight;
  const queued = queuedJobs.get(request.src);
  if (queued) {
    if (priorityRank[priority] < priorityRank[queued.priority]) {
      queued.priority = priority;
      pumpPreloadQueue();
    }
    return queued.promise;
  }

  let resolveJob!: () => void;
  let rejectJob!: (reason?: unknown) => void;
  const basePromise = new Promise<void>((resolve, reject) => {
    resolveJob = resolve;
    rejectJob = reject;
  });
  const promise = basePromise.finally(() => {
    if (queuedJobs.get(request.src)?.promise === promise) queuedJobs.delete(request.src);
  });
  const job: PreloadQueueJob = {
    src: request.src,
    priority,
    order: preloadOrder,
    generation: preloadGeneration,
    promise,
    resolve: resolveJob,
    reject: rejectJob,
  };
  preloadOrder += 1;
  queuedJobs.set(request.src, job);
  preloadQueue.push(job);
  pumpPreloadQueue();
  return promise;
}

export async function preloadHomepageAssets(requests: readonly HomepageAssetRequest[]): Promise<HomepagePreloadResult> {
  const requestMap = requests.reduce((map, request) => {
    const existing = map.get(request.src);
    const existingRank = priorityRank[existing?.priority ?? "auto"];
    const requestRank = priorityRank[request.priority ?? "auto"];
    if (!existing || requestRank < existingRank) map.set(request.src, request);
    return map;
  }, new Map<string, HomepageAssetRequest>());
  const uniqueRequests = [...requestMap.values()].sort((left, right) => priorityRank[left.priority ?? "auto"] - priorityRank[right.priority ?? "auto"]);
  const results = await Promise.allSettled(uniqueRequests.map(preloadWithRetry));
  return {
    total: uniqueRequests.length,
    failed: results.flatMap((result, index) => result.status === "rejected" ? [uniqueRequests[index].src] : []),
  };
}

export function releaseHomepagePreloadedAssets() {
  preloadGeneration += 1;
  preloadQueue.splice(0).forEach((job) => job.resolve());
  activeJobs.forEach((job) => job.resolve());
  activeJobs.clear();
  queuedJobs.clear();
  activePreloadCount = 0;
  retainedImages.clear();
  inFlightImages.clear();
}
