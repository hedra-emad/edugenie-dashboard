import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../../../core/services/auth.service';

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

  authService = inject(AuthService);

  defaultAvatar = 'assets/images/default-avatar.png';

  get showDetails(): boolean {
    return !this.isMobile || this.sidebarExpanded;
  }

  get user() {
    return this.authService.currentUserSignal();
  }
}