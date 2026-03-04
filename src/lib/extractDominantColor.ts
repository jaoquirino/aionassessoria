/**
 * Extract the dominant vibrant color from an image URL using canvas sampling.
 * Skips near-black and near-white pixels to find a highlight color.
 */
export function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 64; // downsample for speed
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }

        ctx.drawImage(img, 0, 0, size, size);
        const imageData = ctx.getImageData(0, 0, size, size).data;

        // Bucket colors in HSL space
        const colorBuckets: Record<string, { h: number; s: number; l: number; count: number }> = {};

        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i] / 255;
          const g = imageData[i + 1] / 255;
          const b = imageData[i + 2] / 255;
          const a = imageData[i + 3] / 255;
          if (a < 0.5) continue; // skip transparent

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / 2;

          // Skip near-black and near-white
          if (l < 0.15 || l > 0.85) continue;

          const d = max - min;
          if (d < 0.05) continue; // skip grays (low saturation)

          const s = d / (1 - Math.abs(2 * l - 1));
          if (s < 0.2) continue; // skip desaturated

          let h = 0;
          if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
          else if (max === g) h = ((b - r) / d + 2) * 60;
          else h = ((r - g) / d + 4) * 60;

          // Bucket by hue (30° buckets)
          const bucketKey = String(Math.round(h / 30) * 30);
          if (!colorBuckets[bucketKey]) {
            colorBuckets[bucketKey] = { h: 0, s: 0, l: 0, count: 0 };
          }
          colorBuckets[bucketKey].h += h;
          colorBuckets[bucketKey].s += s;
          colorBuckets[bucketKey].l += l;
          colorBuckets[bucketKey].count++;
        }

        // Find the most common bucket
        let bestBucket: { h: number; s: number; l: number; count: number } | null = null;
        for (const key in colorBuckets) {
          const bucket = colorBuckets[key];
          if (!bestBucket || bucket.count > bestBucket.count) {
            bestBucket = bucket;
          }
        }

        if (!bestBucket || bestBucket.count < 5) {
          resolve(null);
          return;
        }

        const avgH = Math.round(bestBucket.h / bestBucket.count);
        const avgS = Math.round((bestBucket.s / bestBucket.count) * 100);
        const avgL = Math.round((bestBucket.l / bestBucket.count) * 100);

        // Clamp lightness to a visible range
        const clampedL = Math.max(30, Math.min(60, avgL));
        const clampedS = Math.max(40, avgS);

        // Convert to hex
        const hex = hslToHex(avgH, clampedS, clampedL);
        resolve(hex);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
