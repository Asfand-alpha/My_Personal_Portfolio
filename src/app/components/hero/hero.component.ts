import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnInit {
  isVisible = false;
  mouseX = 0;
  mouseY = 0;

  ngOnInit() {
    setTimeout(() => {
      this.isVisible = true;
    }, 200);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouseX = (event.clientX / window.innerWidth - 0.5) * 20;
    this.mouseY = (event.clientY / window.innerHeight - 0.5) * 20;
  }
}