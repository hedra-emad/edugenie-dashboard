import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { SidebarMenuItem } from '../sidebar-menu-item/sidebar-menu-item';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar-menu',
  imports: [NgFor, SidebarMenuItem, MatIconModule],
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.css',
})
export class SidebarMenu {
  items = [
  {
    icon: 'analytics',
    label: 'Analytics',
    active: true,
  },
  {
    icon: 'groups',
    label: 'Students',
  },
  {
    icon: 'folder',
    label: 'Resources',
  },
  {
    icon: 'video_call',
    label: 'Live Sessions',
  },
];
}