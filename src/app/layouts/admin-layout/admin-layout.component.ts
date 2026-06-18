import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from './admin-sidebar.component';
import { AdminHeaderComponent } from './admin-header.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminSidebarComponent, AdminHeaderComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
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
    const width = window.innerWidth;
    const wasMobile = this.isMobile;
    const wasTablet = this.isTablet;

    this.isMobile = width < 768;
    this.isTablet = width >= 768 && width < 1024;

    // Reset sidebar state on breakpoint crossing
    if (this.isMobile !== wasMobile || this.isTablet !== wasTablet) {
      if (this.isMobile) {
        this.sidebarExpanded = false; // Hidden on mobile initially
      } else if (this.isTablet) {
        this.sidebarExpanded = false; // Collapsed automatically on tablet
      } else {
        this.sidebarExpanded = true; // Expanded on desktop by default
      }
    }
  }

  toggleSidebar(): void {
    this.sidebarExpanded = !this.sidebarExpanded;
  }

  closeMobileSidebar(): void {
    if (this.isMobile) {
      this.sidebarExpanded = false;
    }
  }
}
