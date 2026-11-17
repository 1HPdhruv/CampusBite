// Original, minimal mono capture. No recording/persistence; disconnected on stop.
class MetroCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) this.port.postMessage(channel.slice());
    return true;
  }
}
registerProcessor("metro-capture", MetroCapture);
