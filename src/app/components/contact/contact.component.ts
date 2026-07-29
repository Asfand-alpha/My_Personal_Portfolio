import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface ContactMethod {
  label: string;
  value: string;
  copyValue: string;
  href: string;
  external: boolean;
  icon: SafeHtml;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, OnDestroy {
  isVisible = false;
  methods: ContactMethod[];

  constructor(private sanitizer: DomSanitizer) {
    const emailIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 9.3 6.2a1.5 1.5 0 0 0 1.7 0L22 7"/></svg>`;

    const whatsappIcon = `<svg viewBox="0 0 24 24" fill="#25D366"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/><path d="M16.6 13.9c-.3-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.9-1.3.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>`;

    const whatsappMessage = encodeURIComponent("Hi Asfandyar, I'd like to discuss a project.");

    this.methods = [
      {
        label: 'Email',
        value: 'asfand.alpha@gmail.com',
        copyValue: 'asfand.alpha@gmail.com',
        href: 'mailto:asfand.alpha@gmail.com?subject=Project%20Inquiry',
        external: true,
        icon: this.sanitizer.bypassSecurityTrustHtml(emailIcon)
      },
      {
        label: 'WhatsApp',
        value: '+92 314 0262505',
        copyValue: '+923140262505',
        href: `https://wa.me/923140262505?text=${whatsappMessage}`,
        external: true,
        icon: this.sanitizer.bypassSecurityTrustHtml(whatsappIcon)
      }
    ];
  }

  copiedIndex: number | null = null;
  private copiedTimeout: any;

  onCardClick(index: number, value: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
    this.copiedIndex = index;
    if (this.copiedTimeout) clearTimeout(this.copiedTimeout);
    this.copiedTimeout = setTimeout(() => (this.copiedIndex = null), 1800);
  }

  ngOnInit() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.isVisible = true;
          }
        });
      },
      { threshold: 0.2 }
    );

    setTimeout(() => {
      const el = document.querySelector('.contact-section');
      if (el) observer.observe(el);
    }, 100);
  }

  ngOnDestroy() {
    if (this.copiedTimeout) clearTimeout(this.copiedTimeout);
  }
}
