import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Project {
  title: string;
  description: string;
  tags: string[];
  image: string;
  category: string;
  featured: boolean;
  liveUrl: string;
  githubUrl: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
  isVisible = false;
  activeFilter = 'All';
  filters = ['All', 'Full-Stack', 'AI/ML', 'Cloud', 'IoT'];

  projects: Project[] = [
    {
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with Angular frontend and .NET backend, featuring real-time inventory management.',
      tags: ['Angular', '.NET', 'SQL Server'],
      image: 'assets/icons/commerce.svg',
      category: 'Full-Stack',
      featured: true,
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      title: 'AI Chat Assistant',
      description: 'Intelligent chatbot powered by machine learning, integrated with multiple messaging platforms.',
      tags: ['Python', 'AI/ML', 'Web API'],
      image: 'assets/icons/AIChat.svg',
      category: 'AI/ML',
      featured: true,
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      title: 'Task Management App',
      description: 'Collaborative project management tool with real-time updates, drag-and-drop boards, and team analytics.',
      tags: ['Angular', 'TypeScript', 'Firebase'],
      image: 'assets/icons/taskmanager.svg',
      category: 'Full-Stack',
      featured: false,
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      title: 'Portfolio Generator',
      description: 'Automated portfolio website generator using AI to create stunning layouts from user data.',
      tags: ['Angular', 'Python', 'AI'],
      image: '🎨',
      category: 'AI/ML',
      featured: false,
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      title: 'Cloud Dashboard',
      description: 'Centralized cloud infrastructure monitoring dashboard with real-time metrics and alerts.',
      tags: ['.NET', 'MVC', 'Azure'],
      image: 'assets/icons/cloudmanager.svg',
      category: 'Cloud',
      featured: false,
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      title: 'Smart Home Hub',
      description: 'IoT-based smart home control system with voice commands and automated scheduling.',
      tags: ['C#', 'Web API', 'IoT'],
      image: 'assets/icons/smarthome.svg',
      category: 'IoT',
      featured: false,
      liveUrl: '#',
      githubUrl: '#'
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

  get filteredProjects(): Project[] {
    if (this.activeFilter === 'All') return this.projects;
    return this.projects.filter((p) => p.category === this.activeFilter);
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
  }

  onTilt(event: MouseEvent, card: HTMLElement) {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -8;
    const rotateY = ((x / rect.width) - 0.5) * 8;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    card.style.setProperty('--spot-x', `${(x / rect.width) * 100}%`);
    card.style.setProperty('--spot-y', `${(y / rect.height) * 100}%`);
  }

  onTiltLeave(card: HTMLElement) {
    card.style.transform = '';
  }
}
