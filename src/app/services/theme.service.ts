import { Injectable, effect, signal } from '@angular/core';

export type AccentColor = 'orange' | 'blue' | 'gray';
export type ThemeMode = 'dark' | 'light';

const ACCENT_KEY = 'portfolio-accent';
const MODE_KEY = 'portfolio-theme-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  accent = signal<AccentColor>(this.readAccent());
  mode = signal<ThemeMode>(this.readMode());

  constructor() {
    effect(() => {
      const accent = this.accent();
      const mode = this.mode();
      const root = document.documentElement;

      if (accent === 'orange') {
        root.removeAttribute('data-accent');
      } else {
        root.setAttribute('data-accent', accent);
      }
      root.setAttribute('data-theme', mode);

      localStorage.setItem(ACCENT_KEY, accent);
      localStorage.setItem(MODE_KEY, mode);
    });
  }

  setAccent(accent: AccentColor) {
    this.accent.set(accent);
  }

  toggleMode() {
    this.mode.set(this.mode() === 'dark' ? 'light' : 'dark');
  }

  private readAccent(): AccentColor {
    const saved = localStorage.getItem(ACCENT_KEY);
    return saved === 'blue' || saved === 'gray' ? saved : 'orange';
  }

  private readMode(): ThemeMode {
    const saved = localStorage.getItem(MODE_KEY);
    return saved === 'light' ? 'light' : 'dark';
  }
}
