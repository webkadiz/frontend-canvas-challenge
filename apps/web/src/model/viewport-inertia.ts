import type { Viewport, Sample, Clock } from './types';

// Измеряем движение в экранных пикселях, чтобы жест одинаково ощущался при любом масштабе.
/** Добавляет короткое скольжение после жеста, измеряя скорость в экранных пикселях. */
export class ViewportInertia {
  private samples: Sample[] = [];
  private frame: number | null = null;

  /** Принимает применение камеры и часы для управляемой анимации. */
  constructor(
    private apply: (viewport: Viewport) => void,
    private clock: Clock,
  ) {}

  /** Останавливает кадры инерции и очищает накопленные измерения жеста. */
  cancel = () => {
    if (this.frame !== null) this.clock.cancel(this.frame);

    this.frame = null;
    this.samples = [];
  };

  /** Начинает измерять новый жест, отменяя предыдущее скольжение. */
  start(viewport: Viewport) {
    this.cancel();
    this.samples = [{ viewport: { ...viewport }, time: this.clock.now() }];
  }

  /** Собирает недавние позиции камеры; смена масштаба отменяет измерение. */
  move(viewport: Viewport) {
    if (!this.samples.length) return;

    if (viewport.zoom !== this.samples[0].viewport.zoom) {
      this.cancel();

      return;
    }

    const time = this.clock.now();

    // Храним последние 100 мс движения и один предыдущий замер для интерполяции.
    while (this.samples.length > 1 && this.samples[1].time < time - 100) this.samples.shift();

    this.samples.push({ viewport: { ...viewport }, time });
  }

  /** Добавляет ограниченное затухающее смещение, если мышь отпущена в движении. */
  release(viewport: Viewport) {
    const samples = this.samples;

    this.samples = [];

    if (samples.length < 2) return;

    const now = this.clock.now();
    const last = samples.at(-1)!;

    // Остановка мыши перед отпусканием кнопки должна останавливать и холст.
    if (now - last.time > 70 || last.viewport.zoom !== viewport.zoom) return;

    const first = samples.find((sample) => sample.time >= last.time - 100) ?? samples[0];
    const elapsed = last.time - first.time;

    if (elapsed < 8) return;

    const pauseDecay = Math.max(0, 1 - (now - last.time) / 70);
    let dx = ((last.viewport.x - first.viewport.x) / elapsed) * 80 * pauseDecay;
    let dy = ((last.viewport.y - first.viewport.y) / elapsed) * 80 * pauseDecay;
    const distance = Math.hypot(dx, dy);

    if (distance < 5) return;

    const scale = Math.min(1, 90 / distance);

    dx *= scale;
    dy *= scale;

    const tick = (time: number) => {
      const progress = Math.min(1, Math.max(0, (time - now) / 240));
      const eased = 1 - (1 - progress) ** 3;

      this.apply({ x: viewport.x + dx * eased, y: viewport.y + dy * eased, zoom: viewport.zoom });
      this.frame = progress < 1 ? this.clock.request(tick) : null;
    };

    this.frame = this.clock.request(tick);
  }
}
