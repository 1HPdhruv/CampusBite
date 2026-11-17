// Original browser mono float -> signed PCM16 at 16kHz; no telephony mu-law conversion.
export class PcmEncoder {
  private sum = 0;
  private weight = 0;
  constructor(private sampleRate: number) {
    if (
      !Number.isFinite(sampleRate) ||
      sampleRate < 16000 ||
      sampleRate > 192000
    )
      throw new Error("Unsupported sample rate");
  }
  encode(input: Float32Array) {
    const values: number[] = [];
    const width = this.sampleRate / 16000;
    for (const sample of input) {
      let remaining = 1;
      while (remaining > 1e-8) {
        const take = Math.min(remaining, width - this.weight);
        this.sum +=
          Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0)) *
          take;
        this.weight += take;
        remaining -= take;
        if (this.weight >= width - 1e-8) {
          const value = this.sum / width;
          values.push(Math.round(value * (value < 0 ? 32768 : 32767)));
          this.sum = 0;
          this.weight = 0;
        }
      }
    }
    const bytes = new Uint8Array(values.length * 2),
      view = new DataView(bytes.buffer);
    values.forEach((v, i) => view.setInt16(i * 2, v, true));
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary);
  }
}
export function decodePcm(data: string) {
  if (data.length > 700000) throw new Error("Invalid audio");
  const binary = atob(data);
  if (binary.length % 2 || binary.length > 500000)
    throw new Error("Invalid audio");
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return Float32Array.from(
    { length: bytes.length / 2 },
    (_, i) => view.getInt16(i * 2, true) / 32768,
  );
}
