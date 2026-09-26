// Worker: riconoscimento dei gatti nelle immagini della telecamera (MediaPipe, modello EfficientDet-Lite0 / COCO).
// Gira in un thread separato cosi' il visore non perde fotogrammi.
import { FilesetResolver, ObjectDetector } from '../node_modules/@mediapipe/tasks-vision/vision_bundle.mjs';

let detector = null;

self.onmessage = async e => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      const base = new URL('../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url).href;
      const vision = await FilesetResolver.forVisionTasks(base, true);
      detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: m.model, delegate: 'CPU' },
        runningMode: 'IMAGE',
        scoreThreshold: m.threshold ?? 0.35,
        maxResults: 4,
        categoryAllowlist: m.classes ?? ['cat'],
      });
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: String(err?.message || err) });
    }
  } else if (m.type === 'detect' && detector) {
    const t0 = performance.now();
    const img = new ImageData(new Uint8ClampedArray(m.buffer), m.width, m.height);
    const r = detector.detect(img);
    self.postMessage({
      type: 'result', id: m.id, ms: performance.now() - t0,
      detections: r.detections.map(d => ({
        x: d.boundingBox.originX, y: d.boundingBox.originY, w: d.boundingBox.width, h: d.boundingBox.height,
        score: d.categories[0]?.score ?? 0, label: d.categories[0]?.categoryName ?? '',
      })),
    }, []);
  }
};
