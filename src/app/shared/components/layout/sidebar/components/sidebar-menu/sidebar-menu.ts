import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarMenuItem } from '../sidebar-menu-item/sidebar-menu-item';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [
    CommonModule,
    SidebarMenuItem,
  ],
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.css',
})
export class SidebarMenu {
  @Input() isMobile = false;
  @Input() sidebarExpanded = false;

  items = [
    {
      icon: 'analytics',
      label: 'Analytics',
      route: '/analytics',
    },
    {
      icon: 'settings',
      label: 'Settings',
      route: '/settings',
    },
  ];
}