import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-navbar-auth',
  standalone: true,
  imports: [RouterModule, MatIconModule, CommonModule],
  templateUrl: './navbar-auth.component.html',
  styleUrl: './navbar-auth.component.css',
})
export class NavbarAuthComponent {
  closeMenu: any;
  @Input() isMobile = false;
  @Input() sidebarExpanded = true;

  authService = inject(AuthService);

  logout() {
    this.authService.logout().subscribe();
  }

  get user() {
    return this.authService.currentUserSignal();
  }
}