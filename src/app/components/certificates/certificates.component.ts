import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
  flipped = false;
  isPaused = false;
  showProgress = true;
  readonly autoSlideDuration = 5000;
  private autoSlideInterval: any;
  private restartTimeout: any;

  certificates = [
    {
      title: 'Angular Developer Certification',
      issuer: 'Google / Angular Team',
      date: '2024',
      icon: '🅰️',
      credentialId: 'ANG-2024-8841',
      description: 'Validates advanced proficiency building production-grade Angular applications with modern standalone architecture.',
      skills: ['Standalone Components', 'RxJS', 'Signals', 'SSR']
    },
    {
      title: '.NET Full Stack Developer',
      issuer: 'Microsoft',
      date: '2023',
      icon: '🟣',
      credentialId: 'MS-DOTNET-2023-5567',
      description: 'Covers end-to-end application delivery across C#, ASP.NET Core, and cloud-ready deployment pipelines.',
      skills: ['ASP.NET Core', 'C#', 'EF Core', 'REST APIs']
    },
    {
      title: 'Python for AI & Automation',
      issuer: 'Coursera',
      date: '2024',
      icon: '🐍',
      credentialId: 'CRS-PY-AI-2024-1129',
      description: 'Focused on applying Python to intelligent automation, data pipelines, and machine learning workflows.',
      skills: ['Python', 'Automation', 'Machine Learning', 'Data Pipelines']
    },
    {
      title: 'AWS Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: '2023',
      icon: '☁️',
      credentialId: 'AWS-CCP-2023-7734',
      description: 'Demonstrates foundational knowledge of AWS cloud services, architecture, security, and pricing models.',
      skills: ['Cloud Architecture', 'AWS Core Services', 'Security', 'Cost Optimization']
    },
    {
      title: 'TypeScript Advanced',
      issuer: 'Udemy',
      date: '2024',
      icon: '🔷',
      credentialId: 'UDM-TS-ADV-2024-9902',
      description: 'Deep dive into advanced typing, generics, and design patterns for building scalable TypeScript codebases.',
      skills: ['Generics', 'Type Design', 'Decorators', 'Tooling']
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
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.isVisible) return;
    if (event.key === 'ArrowLeft') this.prev();
    if (event.key === 'ArrowRight') this.next();
  }

  startAutoSlide() {
    this.stopAutoSlide();
    this.autoSlideInterval = setInterval(() => {
      this.next();
    }, this.autoSlideDuration);
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  restartProgress() {
    this.showProgress = false;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);
    this.restartTimeout = setTimeout(() => (this.showProgress = true), 20);
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.certificates.length;
    this.flipped = false;
    this.restartProgress();
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.certificates.length) % this.certificates.length;
    this.flipped = false;
    this.restartProgress();
  }

  goTo(index: number) {
    if (index === this.currentIndex) {
      this.toggleFlip();
      return;
    }
    this.currentIndex = index;
    this.flipped = false;
    this.stopAutoSlide();
    this.startAutoSlide();
    this.restartProgress();
  }

  toggleFlip() {
    this.flipped = !this.flipped;
    if (this.flipped) {
      this.stopAutoSlide();
    } else if (!this.isPaused) {
      this.startAutoSlide();
    }
  }

  onStageEnter() {
    this.isPaused = true;
    this.stopAutoSlide();
  }

  onStageLeave() {
    this.isPaused = false;
    if (!this.flipped) {
      this.startAutoSlide();
    }
  }

  getTransform(index: number): string {
    const diff = index - this.currentIndex;
    const total = this.certificates.length;
    const normalized = ((diff % total) + total) % total;
    const adjusted = normalized > total / 2 ? normalized - total : normalized;

    const translateX = adjusted * 280;
    const translateZ = -Math.abs(adjusted) * 100;
    const rotateY = adjusted * 15;

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
