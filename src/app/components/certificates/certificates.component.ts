import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Certificate {
  title: string;
  issuer: string;
  date: string;
  icon: string;
  credentialId: string;
  description: string;
  skills: string[];
  fileUrl: string;
}

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

  certificates: Certificate[] = [];

  // Modal state
  selectedCert: Certificate | null = null;
  isClosingModal = false;
  safeFileUrl: SafeResourceUrl | null = null;
  private closeModalTimeout: any;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.http.get<Certificate[]>('assets/data/certificates.json').subscribe((data) => {
      this.certificates = data;
    });

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
    if (this.closeModalTimeout) clearTimeout(this.closeModalTimeout);
    document.body.style.overflow = '';
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.selectedCert) {
      this.closeCertModal();
      return;
    }
    if (!this.isVisible || this.selectedCert) return;
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

  isPdfFile(url: string): boolean {
    return url.toLowerCase().endsWith('.pdf');
  }

  encodedUrl(url: string): string {
    // Encode each path segment individually so '#' and spaces in filenames
    // (e.g. "C# certificate.png") don't get parsed as a URL fragment.
    // encodeURI() alone won't do this since it deliberately leaves '#' untouched.
    return url.split('/').map(encodeURIComponent).join('/');
  }

  openCertModal(cert: Certificate) {
    this.stopAutoSlide();
    this.selectedCert = cert;
    this.isClosingModal = false;
    this.safeFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.encodedUrl(cert.fileUrl));
    document.body.style.overflow = 'hidden';
  }

  closeCertModal() {
    this.isClosingModal = true;
    if (this.closeModalTimeout) clearTimeout(this.closeModalTimeout);
    this.closeModalTimeout = setTimeout(() => {
      this.selectedCert = null;
      this.safeFileUrl = null;
      this.isClosingModal = false;
      document.body.style.overflow = '';
      if (!this.isPaused) this.startAutoSlide();
    }, 220);
  }
}
