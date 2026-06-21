import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss'
})
export class CertificatesComponent implements OnInit, OnDestroy {
  isVisible = false;
  currentIndex = 0;
  private autoSlideInterval: any;

  certificates = [
    {
      title: 'Angular Developer Certification',
      issuer: 'Google / Angular Team',
      date: '2024',
      icon: '🅰️'
    },
    {
      title: '.NET Full Stack Developer',
      issuer: 'Microsoft',
      date: '2023',
      icon: '🟣'
    },
    {
      title: 'Python for AI & Automation',
      issuer: 'Coursera',
      date: '2024',
      icon: '🐍'
    },
    {
      title: 'AWS Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: '2023',
      icon: '☁️'
    },
    {
      title: 'TypeScript Advanced',
      issuer: 'Udemy',
      date: '2024',
      icon: '🔷'
    }
  ];

  ngOnInit() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.isVisible = true;
            this.startAutoSlide();
          }
        });
      },
      { threshold: 0.15 }
    );

    setTimeout(() => {
      const el = document.querySelector('.certificates-section');
      if (el) observer.observe(el);
    }, 100);
  }

  ngOnDestroy() {
    this.stopAutoSlide();
  }

  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.next();
    }, 3000);
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.certificates.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.certificates.length) % this.certificates.length;
  }

  goTo(index: number) {
    this.currentIndex = index;
    this.stopAutoSlide();
    this.startAutoSlide();
  }

  getTransform(index: number): string {
    const diff = index - this.currentIndex;
    const total = this.certificates.length;
    const normalized = ((diff % total) + total) % total;
    const adjusted = normalized > total / 2 ? normalized - total : normalized;

    const translateX = adjusted * 280;
    const translateZ = -Math.abs(adjusted) * 100;
    const rotateY = adjusted * 15;
    const opacity = Math.abs(adjusted) > 2 ? 0 : 1 - Math.abs(adjusted) * 0.25;

    return `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${1 - Math.abs(adjusted) * 0.1})`;
  }

  getZIndex(index: number): number {
    const diff = Math.abs(index - this.currentIndex);
    return this.certificates.length - diff;
  }

  getOpacity(index: number): number {
    const diff = Math.abs(index - this.currentIndex);
    return diff > 2 ? 0 : 1 - diff * 0.25;
  }
}