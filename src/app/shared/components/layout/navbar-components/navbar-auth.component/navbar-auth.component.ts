import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-navbar-auth',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar-auth.component.html',
  styleUrl: './navbar-auth.component.css',
})
export class NavbarAuthComponent {
  closeMenu: any;
  @Input() isMobile = false;

  authService = inject(AuthService);

  logout() {
    this.authService.logout().subscribe();
  }

  get user() {
    return this.authService.currentUserSignal();
  }
}