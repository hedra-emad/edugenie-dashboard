import {
  Component, HostListener, OnInit,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, MatIconModule, SidebarComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  sidebarExpanded = true;
  isMobile = false;
  isTablet = false;

  ngOnInit(): void {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const w = window.innerWidth;
    const wasMobile = this.isMobile;
    const wasTablet = this.isTablet;
    this.isMobile = w < 768;
    this.isTablet = w >= 768 && w < 1024;
    if (this.isMobile !== wasMobile || this.isTablet !== wasTablet) {
      if (this.isMobile || this.isTablet) {
        this.sidebarExpanded = false;
      } else {
        this.sidebarExpanded = true;
      }
      this.cdr.markForCheck();
    }
  }

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
    this.cdr.markForCheck();
  }

  closeOverlaySidebar(): void {
    if (this.isMobile || this.isTablet) {
      this.sidebarExpanded = false;
      this.cdr.markForCheck();
    }
  }
}