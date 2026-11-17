// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { LiveVoiceClient } from "../lib/voice/live-browser";
afterEach(() => vi.unstubAllGlobals());
it("closes a late microphone grant after stop and never opens a Live connection", async () => {
  const close = vi.fn(async () => {}),
    failure = vi.fn(),
    state = vi.fn(),
    trackStop = vi.fn();
  let release: (stream: MediaStream) => void = () => {};
  vi.stubGlobal(
    "AudioContext",
    class {
      resume = async () => {};
      close = close;
    },
  );
  const media = {
    getUserMedia: vi.fn(
      () =>
        new Promise<MediaStream>((resolve) => {
          release = resolve;
        }),
    ),
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: media,
    configurable: true,
  });
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const client = new LiveVoiceClient({
    language: "ta-IN",
    state,
    caption: vi.fn(),
    failure,
  });
  const starting = client.start();
  await Promise.resolve();
  client.stop();
  release({ getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream);
  await starting;
  expect(trackStop).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(failure).not.toHaveBeenCalled();
});
it("permission denial yields safe fallback and releases audio resources", async () => {
  const close = vi.fn(async () => {}),
    failure = vi.fn();
  vi.stubGlobal(
    "AudioContext",
    class {
      resume = async () => {};
      close = close;
    },
  );
  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn(async () => {
        throw new Error("Permission denied");
      }),
    },
    configurable: true,
  });
  const client = new LiveVoiceClient({
    language: "en-IN",
    state: vi.fn(),
    caption: vi.fn(),
    failure,
  });
  await client.start();
  expect(failure).toHaveBeenCalledTimes(1);
  expect(close).toHaveBeenCalled();
});
it("stop before audio resume prevents a later microphone permission request", async () => {
  let resume: () => void = () => {};
  const close = vi.fn(async () => {}),
    getUserMedia = vi.fn();
  vi.stubGlobal(
    "AudioContext",
    class {
      resume = () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        });
      close = close;
    },
  );
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  const client = new LiveVoiceClient({
    language: "en-IN",
    state: vi.fn(),
    caption: vi.fn(),
    failure: vi.fn(),
  });
  const start = client.start();
  client.stop();
  resume();
  await start;
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
});
