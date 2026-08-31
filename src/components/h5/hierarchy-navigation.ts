export type H5HierarchyHref = "/go" | "/reports" | `/reports/${string}`;

type HierarchyRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
};

type H5HierarchyEntry = {
  version: 1;
  href: H5HierarchyHref;
  parentHref: H5HierarchyHref;
};

type H5CategoryScrollEntry = {
  version: 1;
  slug: string;
  scrollTop: number;
};

export const h5HierarchyHistoryStateKey = "__honestNutriH5Hierarchy";
export const h5CategoryScrollHistoryStateKey = "__honestNutriH5CategoryScroll";

let pendingHierarchyEntry: H5HierarchyEntry | null = null;

function normalizeHierarchyHref(href: string) {
  const pathname = href.split(/[?#]/, 1)[0] || "/";
  return (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname) as H5HierarchyHref;
}

function historyStateRecord() {
  const state = window.history.state;
  return state && typeof state === "object" ? state as Record<string, unknown> : {};
}

function hierarchyEntryFromState(): H5HierarchyEntry | null {
  const entry = historyStateRecord()[h5HierarchyHistoryStateKey];
  if (!entry || typeof entry !== "object") return null;
  const candidate = entry as Partial<H5HierarchyEntry>;
  if (candidate.version !== 1 || typeof candidate.href !== "string" || typeof candidate.parentHref !== "string") return null;
  return candidate as H5HierarchyEntry;
}

function replaceHierarchyHistoryState(entry: H5HierarchyEntry | null) {
  const state = { ...historyStateRecord() };
  if (entry) state[h5HierarchyHistoryStateKey] = entry;
  else delete state[h5HierarchyHistoryStateKey];
  window.history.replaceState(state, "", window.location.href);
}

export function getHierarchyParentHref(href: string): H5HierarchyHref | null {
  const pathname = normalizeHierarchyHref(href);
  const report = pathname.match(/^\/reports\/([^/]+)\/items\/[^/]+\/reports$/);
  if (report) return `/reports/${report[1]}`;
  if (/^\/reports\/[^/]+$/.test(pathname)) return "/reports";
  return null;
}

export function readCategoryScrollPosition(slug: string) {
  const entry = historyStateRecord()[h5CategoryScrollHistoryStateKey];
  if (!entry || typeof entry !== "object") return 0;
  const candidate = entry as Partial<H5CategoryScrollEntry>;
  if (candidate.version !== 1 || candidate.slug !== slug || typeof candidate.scrollTop !== "number" || !Number.isFinite(candidate.scrollTop)) return 0;
  return Math.max(0, candidate.scrollTop);
}

/** Keep the reading position on the category history entry itself. */
export function saveCategoryScrollPosition(slug: string, scrollTop: number) {
  const state = { ...historyStateRecord() };
  state[h5CategoryScrollHistoryStateKey] = {
    version: 1,
    slug,
    scrollTop: Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0,
  } satisfies H5CategoryScrollEntry;
  window.history.replaceState(state, "", window.location.href);
}

/** The guide is a one-way entry and direct-link fallbacks replace in place. */
export function replaceHierarchyRoute(router: HierarchyRouter, href: H5HierarchyHref) {
  pendingHierarchyEntry = null;
  router.replace(href);
}

/**
 * Archive -> category and category -> report are real child entries. Keeping
 * those two levels in browser history lets Android Back and iOS edge-back use
 * the same product hierarchy as the in-page right-swipe gesture.
 */
export function pushHierarchyRoute(router: HierarchyRouter, href: H5HierarchyHref) {
  const normalizedHref = normalizeHierarchyHref(href);
  const parentHref = getHierarchyParentHref(normalizedHref);
  const currentHref = normalizeHierarchyHref(window.location.pathname);
  pendingHierarchyEntry = parentHref && currentHref === parentHref
    ? { version: 1, href: normalizedHref, parentHref }
    : null;
  router.push(href);
}

/** Called by the root tracker after a client route has committed. */
export function syncHierarchyHistoryEntry(pathname: string) {
  const currentHref = normalizeHierarchyHref(pathname);
  const pending = pendingHierarchyEntry;
  pendingHierarchyEntry = null;
  if (pending?.href === currentHref) {
    replaceHierarchyHistoryState(pending);
    return;
  }
  const current = hierarchyEntryFromState();
  if (current && current.href !== currentHref) replaceHierarchyHistoryState(null);
}

/**
 * A child created by pushHierarchyRoute may pop its verified parent. Direct
 * deep links have no such marker, so they replace themselves with the fixed
 * parent instead of trusting unrelated visit history.
 */
export function returnToHierarchyParent(router: HierarchyRouter, fallbackHref: H5HierarchyHref) {
  const currentHref = normalizeHierarchyHref(window.location.pathname);
  const canonicalParent = getHierarchyParentHref(currentHref);
  const parentHref = canonicalParent ?? normalizeHierarchyHref(fallbackHref);
  const entry = hierarchyEntryFromState();
  pendingHierarchyEntry = null;
  if (entry?.href === currentHref && entry.parentHref === parentHref) {
    router.back();
    return;
  }
  router.replace(parentHref);
}
