import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  isVisible = false;

  services: { icon: SafeHtml; title: string; desc: string }[];

  constructor(private sanitizer: DomSanitizer) {
    const rawServices = [
      {
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 8h.01M9 8h.01"/></svg>`,
        title: 'Website Development',
        desc: 'Building responsive, high-performance websites with modern frameworks and clean code.'
      },
      {
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
        title: 'App Development',
        desc: 'Creating cross-platform mobile and web applications with seamless user experiences.'
      },
      {
        icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
        title: 'AI Automation / Website Hosting',
        desc: 'Implementing intelligent automation workflows and reliable cloud hosting solutions.'
      }
    ];

    this.services = rawServices.map((s) => ({
      ...s,
      icon: this.sanitizer.bypassSecurityTrustHtml(s.icon)
    }));
  }

  stats = [
    { value: '50+', label: 'Completed Projects' },
    { value: '98%', label: 'Client satisfaction' },
    { value: '5+', label: 'Years of experience' }
  ];

  ngOnInit() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.isVisible = true;
          }
        });
      },
      { threshold: 0.15 }
    );

    setTimeout(() => {
      const el = document.querySelector('.about-section');
      if (el) observer.observe(el);
    }, 100);
  }
}