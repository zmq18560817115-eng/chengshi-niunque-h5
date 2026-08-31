import { requestVisualViewportHeightSync } from "@/components/h5/useVisualViewportHeight";

export const guideRouteEntryAttribute = "data-guide-route-entry";
export const guideRouteReadyEvent = "h5-guide-route-ready";
export const guideRouteBufferHostId = "h5-guide-route-buffer-host";
export const guideRouteNavigationDelayMs = 16;
export const guideRouteBufferReleaseDurationMs = 520;
export const guideRouteCommitDurationMs = 520;
export const guideRouteSnapshotSrc = "/design/guide/guide-static-foreground.webp";
export const guideRouteDestinationSrc = "/design/guide/archive-transition-preview.webp";
export const guideRouteForegroundSrc = "/design/guide/guide-foreground-top.webp";
export const guideRouteHintSrc = "/design/guide/swipe-up-hint-v2.png";
export const guideTransitionTravelRatio = 0.26;

const guideRouteArchSrc = "/design/guide/guide-arch.webp";
const guideRouteCharacterSrc = "/design/guide/guide-character-open.webp";
export type GuideRouteOrientation = "portrait" | "landscape";
export type GuideRouteProfile = GuideRouteOrientation | "portrait-standard" | "portrait-compact";
type ResolvedGuideRouteProfile = Exclude<GuideRouteProfile, "portrait">;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => {
  const progress = clamp(value);
  return progress * progress * (3 - 2 * progress);
};

export function getGuideTransitionVisualState(progressValue: number, viewportHeight: number) {
  const progress = clamp(progressValue);
  const travel = Math.max(1, viewportHeight) * guideTransitionTravelRatio;
  const destinationOpacity = smoothstep(progress / 0.7);
  const guideOpacity = 1 - 0.92 * smoothstep((progress - 0.3) / 0.7);
  return {
    progress,
    guideY: -travel * progress,
    destinationY: travel * (1 - progress),
    guideOpacity,
    destinationOpacity,
    overlapRatio: 1 - guideTransitionTravelRatio,
  };
}

export const guideArchiveEntryTiming = {
  bookDelayMs: 0,
  bookDurationMs: 520,
  batchOverlapProgress: 0.72,
  batchDurationMs: 420,
} as const;

export const guideArchiveBatchDelayMs = guideArchiveEntryTiming.bookDelayMs
  + guideArchiveEntryTiming.bookDurationMs * guideArchiveEntryTiming.batchOverlapProgress;
export const guideRouteStageDurationMs = guideArchiveBatchDelayMs
  + guideArchiveEntryTiming.batchDurationMs
  + 80;

let bufferCleanupTimer: number | undefined;
let stageCleanupTimer: number | undefined;
let revealDelayTimer: number | undefined;
let bufferCommitReadyAt = 0;
let primeGeneration = 0;

type PrimedGuideRouteBuffer = {
  buffer: HTMLDivElement;
  destination: HTMLImageElement;
  destinationFallback: boolean;
  orientation: GuideRouteOrientation;
  profile: ResolvedGuideRouteProfile;
  ready: boolean;
};

type GuideRoutePrimeRequest = {
  destinationFallback: boolean;
  profile: ResolvedGuideRouteProfile;
  promise: Promise<boolean>;
};

let primedGuideRouteBuffer: PrimedGuideRouteBuffer | null = null;
let guideRoutePrimeRequest: GuideRoutePrimeRequest | null = null;

function createTransitionImage(src: string, className: string) {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = "";
  image.loading = "eager";
  image.fetchPriority = "high";
  image.decoding = "async";
  image.setAttribute("aria-hidden", "true");
  return image;
}

function createGuideLandscapeComposition() {
  const composition = document.createElement("div");
  composition.className = "guide-landscape-composition";
  composition.setAttribute("aria-hidden", "true");
  const crop = (name: "logo" | "character" | "envelope", src: string) => {
    const frame = document.createElement("div");
    frame.className = `guide-landscape-crop guide-landscape-${name}`;
    frame.dataset.guideLandmark = name;
    frame.append(createTransitionImage(src, "guide-landscape-crop-master"));
    return frame;
  };

  const character = document.createElement("div");
  character.className = "guide-landscape-crop guide-landscape-character";
  character.dataset.guideLandmark = "character";
  for (const src of [guideRouteArchSrc, guideRouteCharacterSrc, guideRouteForegroundSrc]) {
    const name = src.split("/").at(-1)?.replace(".webp", "") ?? "layer";
    character.append(createTransitionImage(src, `guide-landscape-crop-master is-${name}`));
  }

  composition.append(
    crop("logo", guideRouteForegroundSrc),
    character,
    crop("envelope", guideRouteForegroundSrc),
  );
  const hint = createTransitionImage(guideRouteHintSrc, "guide-landscape-hint");
  hint.dataset.guideLandmark = "hint";
  composition.append(hint);
  return composition;
}

function createGuideCompactComposition() {
  const composition = document.createElement("div");
  composition.className = "guide-compact-portrait-composition";
  composition.setAttribute("aria-hidden", "true");
  const image = (filename: string, className: string) => createTransitionImage(`/design/guide/${filename}`, className);
  composition.append(
    image("guide-compact-paper-top.webp", "guide-compact-paper guide-compact-paper-top"),
    image("guide-compact-paper-left.webp", "guide-compact-paper guide-compact-paper-left"),
    image("guide-compact-paper-right.webp", "guide-compact-paper guide-compact-paper-right"),
    image("guide-compact-paper-bottom.webp", "guide-compact-paper guide-compact-paper-bottom"),
    image("guide-compact-logo.webp", "guide-compact-logo"),
  );
  const character = document.createElement("div");
  character.className = "guide-compact-character";
  character.dataset.guideLandmark = "character";
  character.append(
    image("guide-compact-character-open.webp", "guide-compact-character-layer guide-compact-character-open"),
    image("guide-compact-character-closed.webp", "guide-compact-character-layer guide-compact-character-closed"),
    image("guide-compact-arch.webp", "guide-compact-character-layer guide-compact-arch"),
    image("guide-compact-character-overlay.webp", "guide-compact-character-layer guide-compact-character-overlay"),
  );
  composition.append(
    character,
    image("guide-compact-envelope.webp", "guide-compact-envelope"),
    createTransitionImage(guideRouteHintSrc, "guide-compact-hint"),
  );
  return composition;
}

function resolveGuideRouteProfile(profile: GuideRouteProfile): ResolvedGuideRouteProfile {
  return profile === "portrait" ? "portrait-standard" : profile;
}

function guideRouteOrientation(profile: ResolvedGuideRouteProfile): GuideRouteOrientation {
  return profile === "landscape" ? "landscape" : "portrait";
}

function createGuideSnapshot(profile: ResolvedGuideRouteProfile) {
  const snapshot = document.createElement("div");
  snapshot.className = `h5-guide-route-snapshot${profile === "portrait-compact" ? " is-compact" : ""}`;
  snapshot.setAttribute("aria-hidden", "true");
  if (profile === "portrait-standard") {
    snapshot.append(createTransitionImage(guideRouteSnapshotSrc, "h5-guide-route-portrait-snapshot"));
  } else if (profile === "portrait-compact") {
    snapshot.append(createGuideCompactComposition());
  } else {
    snapshot.append(createGuideLandscapeComposition());
  }
  return snapshot;
}

function createGuideRouteBuffer(profile: ResolvedGuideRouteProfile, destinationFallback: boolean) {
  const orientation = guideRouteOrientation(profile);
  const snapshot = createGuideSnapshot(profile);
  const destination = createTransitionImage(guideRouteDestinationSrc, "h5-guide-route-destination-image");

  const guidePanel = document.createElement("div");
  guidePanel.className = "h5-guide-route-panel h5-guide-route-guide-panel";
  guidePanel.append(snapshot);
  const destinationPanel = document.createElement("div");
  destinationPanel.className = "h5-guide-route-panel h5-guide-route-destination-panel";
  const destinationContent = document.createElement("div");
  destinationContent.className = "h5-guide-route-destination-content";
  destinationContent.append(destination);
  destinationPanel.append(destinationContent);
  const track = document.createElement("div");
  track.className = "h5-guide-route-track";
  track.append(guidePanel, destinationPanel);

  const buffer = document.createElement("div");
  buffer.className = `h5-guide-route-buffer is-preparing${destinationFallback ? " has-destination-fallback" : ""}`;
  buffer.setAttribute("aria-hidden", "true");
  buffer.dataset.guideOrientation = orientation;
  buffer.dataset.guideProfile = profile;
  buffer.append(track);
  return { buffer, destination };
}

function waitForTransitionImage(image: HTMLImageElement, timeoutMs = 4500) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      resolve(ready);
    };
    const decode = async () => {
      try {
        if (typeof image.decode === "function") await image.decode();
        finish(image.naturalWidth > 0);
      } catch {
        finish(false);
      }
    };
    const onLoad = () => { void decode(); };
    const onError = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), timeoutMs);
    if (image.complete) void decode();
    else {
      image.addEventListener("load", onLoad, { once: true });
      image.addEventListener("error", onError, { once: true });
    }
  });
}

export async function primeGuideRouteContinuity(profileInput: GuideRouteProfile, destinationFallback: boolean): Promise<boolean> {
  const host = document.getElementById(guideRouteBufferHostId);
  if (!host) return false;
  const profile = resolveGuideRouteProfile(profileInput);
  const orientation = guideRouteOrientation(profile);

  const current = primedGuideRouteBuffer;
  if (current
    && current.ready
    && current.profile === profile
    && current.destinationFallback === destinationFallback
    && current.buffer.isConnected
    && current.buffer.parentElement === host) return true;

  const inFlight = guideRoutePrimeRequest;
  if (inFlight
    && inFlight.profile === profile
    && inFlight.destinationFallback === destinationFallback) return inFlight.promise;

  const generation = ++primeGeneration;
  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  window.clearTimeout(revealDelayTimer);
  bufferCommitReadyAt = 0;

  const { buffer, destination } = createGuideRouteBuffer(profile, destinationFallback);
  const next: PrimedGuideRouteBuffer = { buffer, destination, destinationFallback, orientation, profile, ready: false };
  primedGuideRouteBuffer = next;
  host.replaceChildren(buffer);

  const images = Array.from(buffer.querySelectorAll<HTMLImageElement>("img"));
  const requiredImages = destinationFallback ? images.filter((image) => image !== destination) : images;
  const promise = Promise.all(requiredImages.map((image) => waitForTransitionImage(image))).then((decoded) => {
    if (generation !== primeGeneration || primedGuideRouteBuffer !== next || !buffer.isConnected) return false;
    if (decoded.some((ready) => !ready)) {
      buffer.remove();
      primedGuideRouteBuffer = null;
      return false;
    }
    next.ready = true;
    return true;
  }).finally(() => {
    if (guideRoutePrimeRequest?.promise === promise) guideRoutePrimeRequest = null;
  });
  guideRoutePrimeRequest = { destinationFallback, profile, promise };
  return promise;
}

function currentGuideRouteProfile(): ResolvedGuideRouteProfile {
  const activeProfile = document.querySelector<HTMLElement>(".brand-guide")?.dataset.guideProfile;
  if (activeProfile === "portrait-standard" || activeProfile === "portrait-compact" || activeProfile === "landscape") return activeProfile;
  const landscapeMedia = window.matchMedia?.("(orientation: landscape)");
  if (landscapeMedia) return landscapeMedia.matches ? "landscape" : "portrait-standard";
  return window.innerWidth > window.innerHeight ? "landscape" : "portrait-standard";
}

export async function prepareGuideRouteContinuity(initialProgress = 0, destinationFallback = false) {
  const root = document.documentElement;
  const host = document.getElementById(guideRouteBufferHostId);
  const source = document.querySelector<HTMLElement>(".brand-guide");
  const sourceStage = source?.querySelector<HTMLElement>(".brand-guide-stage");
  if (!host || !source || !sourceStage) return false;

  const profile = currentGuideRouteProfile();
  const primed = await primeGuideRouteContinuity(profile, destinationFallback);
  const preparedBuffer = primedGuideRouteBuffer;
  if (!primed
    || !preparedBuffer
    || !preparedBuffer.ready
    || preparedBuffer.profile !== profile
    || preparedBuffer.destinationFallback !== destinationFallback
    || preparedBuffer.buffer.parentElement !== host) return false;

  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  window.clearTimeout(revealDelayTimer);
  const sourceRect = source.getBoundingClientRect();
  const routeDistance = Math.max(1, Math.round(sourceRect.height || window.innerHeight));
  const start = getGuideTransitionVisualState(initialProgress, routeDistance);
  const end = getGuideTransitionVisualState(1, routeDistance);
  const progress = start.progress;
  const remainingDistance = Math.max(0, Math.round(routeDistance * (1 - progress)));
  const commitDuration = Math.max(160, Math.round(guideRouteCommitDurationMs * (1 - progress)));
  root.style.setProperty("--guide-route-travel-distance", `${routeDistance}px`);
  root.style.setProperty("--guide-route-exit-distance", `${-routeDistance}px`);
  root.style.setProperty("--guide-route-remaining-distance", `${remainingDistance}px`);
  const buffer = preparedBuffer.buffer;
  buffer.classList.remove("is-committing", "is-releasing");
  buffer.classList.add("is-preparing");
  buffer.classList.toggle("has-destination-fallback", destinationFallback);
  buffer.style.setProperty("--guide-route-start-guide-y", `${start.guideY.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-start-destination-y", `${start.destinationY.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-end-guide-y", `${end.guideY.toFixed(3)}px`);
  buffer.style.setProperty("--guide-route-start-guide-opacity", `${start.guideOpacity.toFixed(4)}`);
  buffer.style.setProperty("--guide-route-start-destination-opacity", `${start.destinationOpacity.toFixed(4)}`);
  buffer.style.setProperty("--guide-route-commit-duration", `${commitDuration}ms`);

  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  if (!buffer.isConnected) return false;
  buffer.classList.remove("is-preparing");
  root.setAttribute(guideRouteEntryAttribute, "active");
  bufferCommitReadyAt = performance.now() + commitDuration;
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => buffer.classList.add("is-committing")));
  return true;
}

function revealGuideDestination() {
  const root = document.documentElement;
  const buffer = document.querySelector<HTMLElement>(`#${guideRouteBufferHostId} > .h5-guide-route-buffer`);
  const release = () => window.requestAnimationFrame(() => {
      root.setAttribute(guideRouteEntryAttribute, "revealing");
      buffer?.classList.add("is-releasing");
      bufferCleanupTimer = window.setTimeout(() => {
        buffer?.remove();
        if (primedGuideRouteBuffer?.buffer === buffer) primedGuideRouteBuffer = null;
      }, guideRouteBufferReleaseDurationMs + 80);
      stageCleanupTimer = window.setTimeout(() => {
        root.removeAttribute(guideRouteEntryAttribute);
        root.style.removeProperty("--guide-route-travel-distance");
        root.style.removeProperty("--guide-route-exit-distance");
        root.style.removeProperty("--guide-route-remaining-distance");
        requestVisualViewportHeightSync();
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        window.scrollTo(0, 0);
        window.requestAnimationFrame(() => window.scrollTo(0, 0));
      }, guideRouteStageDurationMs);
    });
  const remainingCommitMs = Math.max(0, bufferCommitReadyAt - performance.now());
  if (remainingCommitMs > 0) revealDelayTimer = window.setTimeout(release, remainingCommitMs);
  else release();
}

export function navigateWithGuideContinuity(navigate: () => void) {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener(guideRouteReadyEvent, finish);
    revealGuideDestination();
  };
  const fallbackTimer = window.setTimeout(finish, 12000);
  window.addEventListener(guideRouteReadyEvent, finish, { once: true });
  navigate();
}

export function announceGuideRouteReady() {
  window.dispatchEvent(new Event(guideRouteReadyEvent));
}

export function clearGuideRouteContinuity() {
  window.clearTimeout(bufferCleanupTimer);
  window.clearTimeout(stageCleanupTimer);
  window.clearTimeout(revealDelayTimer);
  bufferCommitReadyAt = 0;
  primeGeneration += 1;
  primedGuideRouteBuffer = null;
  guideRoutePrimeRequest = null;
  document.getElementById(guideRouteBufferHostId)?.replaceChildren();
  document.documentElement.removeAttribute(guideRouteEntryAttribute);
  document.documentElement.style.removeProperty("--guide-route-travel-distance");
  document.documentElement.style.removeProperty("--guide-route-exit-distance");
  document.documentElement.style.removeProperty("--guide-route-remaining-distance");
  requestVisualViewportHeightSync();
}
