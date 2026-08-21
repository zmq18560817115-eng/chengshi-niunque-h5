import { render, waitFor } from "@testing-library/react";
import { PublicContentLiveRefresh } from "@/components/h5/PublicContentLiveRefresh";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

describe("PublicContentLiveRefresh", () => {
  beforeEach(() => {
    navigation.refresh.mockReset();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("refreshes the current server view when the published content version changes", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "new-version" }) }));
    render(<PublicContentLiveRefresh version="old-version" />);
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledOnce());
  });

  it("keeps the current view when the published version is unchanged", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "same-version" }) }));
    render(<PublicContentLiveRefresh version="same-version" />);
    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});
