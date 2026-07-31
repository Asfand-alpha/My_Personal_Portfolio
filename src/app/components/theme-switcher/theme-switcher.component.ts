import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccentColor, ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-switcher.component.html',
  styleUrl: './theme-switcher.component.scss'
})
export class ThemeSwitcherComponent {
  panelOpen = false;

  accentOptions: { value: AccentColor; label: string; color: string }[] = [
    { value: 'orange', label: 'Orange', color: '#ff5722' },
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'gray', label: 'Gray', color: '#64748b' }
  ];

  constructor(public themeService: ThemeService, private elRef: ElementRef) {}

  togglePanel() {
    this.panelOpen = !this.panelOpen;
  }

  setAccent(accent: AccentColor) {
    this.themeService.setAccent(accent);
  }

  toggleMode() {
    this.themeService.toggleMode();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.panelOpen && !this.elRef.nativeElement.contains(event.target)) {
      this.panelOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.panelOpen = false;
  }
}
