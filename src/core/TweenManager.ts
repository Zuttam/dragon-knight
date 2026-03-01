type EaseFn = (t: number) => number;

export interface Tween {
  from: number;
  to: number;
  duration: number;
  elapsed: number;
  ease: EaseFn;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
  dead: boolean;
}

const EASE: Record<string, EaseFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  power2: (t) => t * t,
};

export class TweenManager {
  private tweens: Tween[] = [];

  add(opts: {
    from: number;
    to: number;
    duration: number;
    ease?: string;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  }): Tween {
    const tween: Tween = {
      from: opts.from,
      to: opts.to,
      duration: opts.duration,
      elapsed: 0,
      ease: EASE[opts.ease || 'easeOut'] || EASE.easeOut,
      onUpdate: opts.onUpdate,
      onComplete: opts.onComplete,
      dead: false,
    };
    this.tweens.push(tween);
    return tween;
  }

  update(delta: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (tw.dead) {
        this.tweens.splice(i, 1);
        continue;
      }

      tw.elapsed += delta;
      let t = Math.min(tw.elapsed / tw.duration, 1);
      t = tw.ease(t);
      const value = tw.from + (tw.to - tw.from) * t;
      tw.onUpdate(value);

      if (tw.elapsed >= tw.duration) {
        tw.dead = true;
        tw.onComplete?.();
        this.tweens.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.tweens.length = 0;
  }
}
