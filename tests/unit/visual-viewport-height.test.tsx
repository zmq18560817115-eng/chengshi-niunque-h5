import { render, waitFor } from "@testing-library/react";
import { requestVisualViewportHeightSync, useVisualViewportHeight } from "@/components/h5/useVisualViewportHeight";

class MockVisualViewport extends EventTarget {
  height = 812;
}

function ViewportConsumer() {
  useVisualViewportHeight();
  return null;
}

describe("useVisualViewportHeight", () => {
  const viewport = new MockVisualViewport();

  beforeEach(() => {
    viewport.height = 812;
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    Object.defineProperty(window, "requestAnimationFrame", {
      configurable: true,
      value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0),
    });
    Object.defineProperty(window, "cancelAnimationFrame", {
      configurable: true,
      value: (id: number) => window.clearTimeout(id),
    });
    document.documentElement.removeAttribute("data-guide-route-entry");
    document.documentElement.style.removeProperty("--h5-visible-viewport-height");
  });

  it("keeps the shared viewport listener until the final consumer unmounts", async () => {
    const { rerender, unmount } = render(<><ViewportConsumer/><ViewportConsumer/></>);
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--h5-visible-viewport-height")).toBe("812px"));

    rerender(<ViewportConsumer/>);
    viewport.height = 667.2;
    viewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--h5-visible-viewport-height")).toBe("668px"));

    unmount();
    expect(document.documentElement.style.getPropertyValue("--h5-visible-viewport-height")).toBe("");
  });

  it("defers dynamic viewport writes during the guide route lock and resynchronizes after release", async () => {
    const { unmount } = render(<ViewportConsumer/>);
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--h5-visible-viewport-height")).toBe("812px"));
    document.documentElement.setAttribute("data-guide-route-entry", "active");
    viewport.height = 667;
    viewport.dispatchEvent(new Event("resize"));
    await new Promise((resolve) => window.setTimeout(resolve, 5));
    expect(document.documentElement.style.getPropertyValue("--h5-visible-viewport-height")).toBe("812px");

    document.documentElement.removeAttribute("data-guide-route-entry");
    requestVisualViewportHeightSync();
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--h5-visible-viewport-height")).toBe("667px"));
    unmount();
  });
});
