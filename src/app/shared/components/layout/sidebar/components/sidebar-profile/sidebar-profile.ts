import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import UserService from '../../../../../../core/services/user'

@Component({
  selector: 'app-sidebar-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-profile.html',
  styleUrl: './sidebar-profile.css',
})
export class SidebarProfile {

  private userService = inject(UserService);

  @Input() isMobile = false;
  @Input() sidebarExpanded = false;

  get showDetails(): boolean {
    return !this.isMobile || this.sidebarExpanded;
  }

get user() {
  return this.userService.user();
}
}