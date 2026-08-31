export type H5HierarchyHref = "/go" | "/reports" | `/reports/${string}`;

type HierarchyRouter = {
  replace: (href: string) => void;
};

/**
 * Public H5 pages form a fixed hierarchy rather than a visit-history trail.
 * Replacing the current entry keeps browser Back from reopening a child page
 * after the user has already returned to its fixed parent.
 */
export function replaceHierarchyRoute(router: HierarchyRouter, href: H5HierarchyHref) {
  router.replace(href);
}
