import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Skill {
  name: string;
  icon?: string;
  svg?: SafeHtml;
}

interface SkillGroup {
  name: string;
  skills: Skill[];
}

@Component({
  selector: 'app-tech-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tech-stack.component.html',
  styleUrl: './tech-stack.component.scss'
})
export class TechStackComponent implements OnInit {
  isVisible = false;
  groups: SkillGroup[];

  constructor(private sanitizer: DomSanitizer) {
    const gitIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#F05033" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M6 8.2V15.8"/><path d="M6 10c0 3.5 2.7 5 6.5 5H16"/><path d="M18 8.2V11"/></svg>`;

    const dockerIcon = `<svg viewBox="0 0 24 24" fill="#2496ED"><rect x="2.5" y="10" width="3.6" height="3.6" rx="0.5"/><rect x="7" y="10" width="3.6" height="3.6" rx="0.5"/><rect x="11.5" y="10" width="3.6" height="3.6" rx="0.5"/><rect x="7" y="5.5" width="3.6" height="3.6" rx="0.5"/><rect x="11.5" y="5.5" width="3.6" height="3.6" rx="0.5"/><path d="M1.8 14.2c0 4.2 3.4 6.6 8 6.6 5.7 0 9.4-2.8 10.7-6.9.6.2 1.4.1 1.9-.4.5-.5.7-1.5.3-2.3-.6.3-1.5.4-2 0-.2 1-1.3 1.1-2 .5H1.8Z"/></svg>`;

    const hostingIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9Z"/></svg>`;

    const vpsIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="6" rx="1.4"/><rect x="4" y="14" width="16" height="6" rx="1.4"/><circle cx="8" cy="7" r="0.6" fill="#22c55e" stroke="none"/><circle cx="8" cy="17" r="0.6" fill="#22c55e" stroke="none"/><path d="M12 7h4M12 17h4"/></svg>`;

    this.groups = [
      {
        name: 'Frontend',
        skills: [
          { name: 'HTML', icon: 'assets/icons/html-5-small.svg' },
          { name: 'CSS', icon: 'assets/icons/css-3-small.svg' },
          { name: 'JS', icon: 'assets/icons/javascript-small.svg' },
          { name: 'TS', icon: 'assets/icons/typescript-small.svg' },
          { name: 'Angular', icon: 'assets/icons/angular-small.svg' }
        ]
      },
      {
        name: 'Backend',
        skills: [
          { name: '.NET', icon: 'assets/icons/dotnet-small.svg' },
          { name: 'C#', icon: 'assets/icons/c-sharp-small.svg' },
          { name: 'Web API', icon: 'assets/icons/api-small.svg' },
          { name: 'MVC', icon: 'assets/icons/mvc-small.svg' },
          { name: 'Python', icon: 'assets/icons/python-small.svg' }
        ]
      },
      {
        name: 'DevOps & Hosting',
        skills: [
          { name: 'Git', svg: this.sanitizer.bypassSecurityTrustHtml(gitIcon) },
          { name: 'Docker', svg: this.sanitizer.bypassSecurityTrustHtml(dockerIcon) },
          { name: 'Web Hosting', svg: this.sanitizer.bypassSecurityTrustHtml(hostingIcon) },
          { name: 'VPS', svg: this.sanitizer.bypassSecurityTrustHtml(vpsIcon) }
        ]
      }
    ];
  }

  ngOnInit(): void {
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
      const el = document.querySelector('.tech-stack');
      if (el) observer.observe(el);
    }, 100);
  }
}
