import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../../../core/services/user';

@Component({
  selector: 'app-sidebar-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar-profile.html',
  styleUrl: './sidebar-profile.css',
})
export class SidebarProfile {
  @Input() isMobile = false;
  @Input() sidebarExpanded = false;

  userService = inject(UserService);

  defaultAvatar = 'assets/images/default-avatar.png';

  get showDetails(): boolean {
    return !this.isMobile || this.sidebarExpanded;
  }
}