import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar-menu-item',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './sidebar-menu-item.html',
  styleUrl: './sidebar-menu-item.css',
})
export class SidebarMenuItem {
  @Input() label!: string;
  @Input() icon!: string;
  @Input() active = false;
  @Input() isMobile = false;
  @Input() sidebarExpanded = true;

  get showLabel(): boolean {
    return !this.isMobile || this.sidebarExpanded;
  }
}
