import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-menu-item',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar-menu-item.html',
  styleUrl: './sidebar-menu-item.css',
  
})
export class SidebarMenuItem {
  @Input() label!: string;
  @Input() icon!: string;
  @Input() isMobile = false;
  @Input() sidebarExpanded = true;
  @Input() route = '';

  get showLabel(): boolean {
    return !this.isMobile || this.sidebarExpanded;
  }
  get collapsed(): boolean {
  return this.isMobile && !this.sidebarExpanded;
}

get mobile(): boolean {
  return this.isMobile;
}

get desktop(): boolean {
  return !this.isMobile;
}
}
