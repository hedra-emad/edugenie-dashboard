import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar-action',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './sidebar-action.html',
  styleUrl: './sidebar-action.css',
})
export class SidebarAction {
  @Input() isMobile = false;
  @Input() sidebarExpanded = false;

  get showLabel(): boolean {
    return !this.isMobile || this.sidebarExpanded;
  }
  get collapsed(): boolean {
  return this.isMobile && !this.sidebarExpanded;
}
}
