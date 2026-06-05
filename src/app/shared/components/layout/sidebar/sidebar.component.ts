import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarProfile } from './components/sidebar-profile/sidebar-profile';
import { SidebarAction } from './components/sidebar-action/sidebar-action';
import { SidebarMenu } from './components/sidebar-menu/sidebar-menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    MatListModule,
    MatIconModule,
    MatSidenavModule,
    SidebarProfile,
    SidebarAction,
    SidebarMenu,
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  @Input() isMobile = false;
  @Input() sidebarOpen = false;
@Output() close = new EventEmitter<void>();
}