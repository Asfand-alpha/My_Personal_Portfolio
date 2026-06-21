import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './background.component.html',
  styleUrl: './background.component.scss'
})
export class BackgroundComponent implements OnInit, OnDestroy {
  mouseX = window.innerWidth / 2;
  mouseY = window.innerHeight / 2;
  private animationFrame: number | null = null;

  ngOnInit() {
    this.startGlowFollower();
  }

  ngOnDestroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }

  private startGlowFollower() {
    const glow = document.querySelector('.glow-orb') as HTMLElement;
    if (!glow) {
      this.animationFrame = requestAnimationFrame(() => this.startGlowFollower());
      return;
    }

    const updateGlow = () => {
      const sections = Array.from(document.querySelectorAll('section'));
      let targetSection: HTMLElement | null = null;

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
          targetSection = section as HTMLElement;
        }
      }

      if (targetSection) {
        const rect = targetSection.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const currentX = parseFloat(glow.style.left) || centerX;
        const currentY = parseFloat(glow.style.top) || centerY;

        const smoothX = currentX + (centerX - currentX) * 0.03;
        const smoothY = currentY + (centerY - currentY) * 0.03;

        glow.style.left = `${smoothX}px`;
        glow.style.top = `${smoothY}px`;
        glow.style.opacity = '1';
      } else {
        glow.style.opacity = '0';
      }

      this.animationFrame = requestAnimationFrame(updateGlow);
    };

    updateGlow();
  }
}