import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SidebarProfile } from './components/sidebar-profile/sidebar-profile';

import { SidebarMenu } from './components/sidebar-menu/sidebar-menu';
import { NavbarAuthComponent } from '../navbar-components/navbar-auth.component/navbar-auth.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    SidebarProfile,
    SidebarMenu,
    NavbarAuthComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent {
  @Input() isMobile = false;
  @Input() sidebarExpanded = true;
  @Output() toggle = new EventEmitter<void>();
}