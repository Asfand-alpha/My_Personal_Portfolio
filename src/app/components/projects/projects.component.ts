import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  isVisible = false;

  projects = [
    {
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with Angular frontend and .NET backend, featuring real-time inventory management.',
      tags: ['Angular', '.NET', 'SQL Server'],
      image: 'assets/icons/commerce.svg'
    },
    {
      title: 'AI Chat Assistant',
      description: 'Intelligent chatbot powered by machine learning, integrated with multiple messaging platforms.',
      tags: ['Python', 'AI/ML', 'Web API'],
      image: 'assets/icons/AIChat.svg'
    },
    {
      title: 'Task Management App',
      description: 'Collaborative project management tool with real-time updates, drag-and-drop boards, and team analytics.',
      tags: ['Angular', 'TypeScript', 'Firebase'],
      image: 'assets/icons/taskmanager.svg'
    },
    {
      title: 'Portfolio Generator',
      description: 'Automated portfolio website generator using AI to create stunning layouts from user data.',
      tags: ['Angular', 'Python', 'AI'],
      image: '🎨'
    },
    {
      title: 'Cloud Dashboard',
      description: 'Centralized cloud infrastructure monitoring dashboard with real-time metrics and alerts.',
      tags: ['.NET', 'MVC', 'Azure'],
      image: 'assets/icons/cloudmanager.svg'
    },
    {
      title: 'Smart Home Hub',
      description: 'IoT-based smart home control system with voice commands and automated scheduling.',
      tags: ['C#', 'Web API', 'IoT'],
      image: 'assets/icons/smarthome.svg'
    }
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
      { threshold: 0.1 }
    );

    setTimeout(() => {
      const el = document.querySelector('.projects-section');
      if (el) observer.observe(el);
    }, 100);
  }
}