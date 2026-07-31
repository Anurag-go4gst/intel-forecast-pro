import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { EventIntelligence } from "@/components/event-intelligence-page";
import { PlatformProvider, usePlatform } from "@/lib/platform-state";

type PlatformApi = ReturnType<typeof usePlatform>;

function installMemoryStorage() {
  const store = new Map<string, string>();
  window.scrollTo = () => {};
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    },
  });
}

async function renderDemoEvents() {
  let api: PlatformApi | null = null;

  function Probe() {
    api = usePlatform();
    return null;
  }

  const utils = render(
    <PlatformProvider>
      <Probe />
      <EventIntelligence />
    </PlatformProvider>,
  );

  await act(async () => {
    if (!api) throw new Error("Platform API was not captured");
    api.startDemo();
  });

  return {
    ...utils,
    get api() {
      if (!api) throw new Error("Platform API was not captured");
      return api;
    },
  };
}

beforeEach(() => {
  installMemoryStorage();
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    value: class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("EventIntelligence workflow", () => {
  it("shows the registry first and makes planner decision changes visible", async () => {
    const harness = await renderDemoEvents();

    expect(screen.getByText("Event registry")).toBeInTheDocument();
    expect(screen.getByText("Decision")).toBeInTheDocument();
    expect(screen.getByText("Planner decision")).toBeInTheDocument();

    // A fresh plan seeds ie-0 as a Recommended (not yet approved) event.
    fireEvent.change(screen.getByDisplayValue("Recommended"), { target: { value: "Watchlist" } });

    expect(harness.api.intelEvents.find((event) => event.id === "ie-0")?.status).toBe("Watchlist");
    expect(harness.api.auditLog[0]).toMatchObject({
      action: "Event modified",
      detail: expect.stringContaining("Watchlist"),
    });
    expect(
      screen.getByText("Forecast-adjustment requests raised from events and scenarios"),
    ).toBeInTheDocument();
  });

  it("applies only the selected event residual impact and moves to requests", async () => {
    const harness = await renderDemoEvents();

    fireEvent.click(screen.getByRole("button", { name: "Apply selected impact" }));

    expect(harness.api.adjustmentRequests[0]).toMatchObject({
      origin: "Event",
      originId: "ie-0",
      status: "Awaiting approval",
    });
    expect(harness.api.stageDone.events).toBe(true);
    expect(
      screen.getByText("Forecast-adjustment requests raised from events and scenarios"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Planner selected this event for forecast review/)).toBeInTheDocument();
  });

  it("explains why an already submitted event cannot be applied again", async () => {
    await renderDemoEvents();

    fireEvent.click(screen.getByRole("button", { name: /Northvale OEM new-model launch/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply selected impact" }));
    fireEvent.click(screen.getByRole("button", { name: "Decision" }));

    const selectedPanel = screen.getByText("Apply only this selected event").closest("div");
    if (!selectedPanel) throw new Error("Selected event decision panel was not rendered");

    expect(within(selectedPanel).getByText(/Submitted:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applied" })).toBeDisabled();
  });

  it("keeps register, evidence and impact controls functional after the UI split", async () => {
    const harness = await renderDemoEvents();

    fireEvent.click(screen.getByRole("button", { name: "Register event" }));
    fireEvent.change(screen.getByPlaceholderText(/OEM new-model launch/), {
      target: { value: "Customer pull-ahead test event" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save as draft/ }));

    expect(harness.api.intelEvents[0]).toMatchObject({
      name: "Customer pull-ahead test event",
      status: "Draft",
    });

    fireEvent.click(screen.getByRole("button", { name: /Apex Motors shutdown moved/ }));
    fireEvent.click(screen.getByRole("button", { name: "Evidence" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Yes" })[0]);

    expect(
      harness.api.intelEvents.find((event) => event.id === "ie-0")?.qualification.confirmed,
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Impact curve" }));
    fireEvent.change(screen.getByDisplayValue("Multi-period demand transfer"), {
      target: { value: "One-time spike" },
    });

    expect(harness.api.intelEvents.find((event) => event.id === "ie-0")?.pattern).toBe(
      "One-time spike",
    );
  });
});
