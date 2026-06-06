import { Component, HostListener, OnInit } from '@angular/core';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [

    NavbarComponent,
    SidebarComponent,
    RouterOutlet
  ],
  templateUrl: './layout.component.html',
})
export class LayoutComponent implements OnInit {
  sidebarExpanded = true;
  isMobile = false;

  ngOnInit(): void {
    this.checkScreen();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreen();
  }

  private checkScreen(): void {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    // Only reset sidebar state on breakpoint crossing, not every resize
    if (this.isMobile !== wasMobile) {
      this.sidebarExpanded = !this.isMobile;
    }
  }

  toggleSidebar(): void {
    if (this.isMobile) {
      this.sidebarExpanded = !this.sidebarExpanded;
    }
    // Desktop sidebar is always expanded — do nothing
  }
}