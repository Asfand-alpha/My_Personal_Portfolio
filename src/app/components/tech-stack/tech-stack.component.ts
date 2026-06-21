import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tech-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tech-stack.component.html',
  styleUrl: './tech-stack.component.scss'
})
export class TechStackComponent implements OnInit {
  isVisible = false;

  skills = [
    { name: 'HTML', icon: 'assets/icons/html-5-small.svg' },
    { name: 'CSS', icon: 'assets/icons/css-3-small.svg' },
    { name: 'JS', icon: 'assets/icons/javascript-small.svg' },
    { name: 'TS', icon: 'assets/icons/typescript-small.svg' },
    { name: 'Angular', icon: 'assets/icons/angular-small.svg' },
    { name: '.NET', icon: 'assets/icons/dotnet-small.svg' },
    { name: 'C#', icon: 'assets/icons/c-sharp-small.svg' },
    { name: 'Web API', icon: 'assets/icons/api-small.svg' },
    { name: 'MVC', icon: 'assets/icons/mvc-small.svg' },
    { name: 'Python', icon: 'assets/icons/python-small.svg' }
  ];

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