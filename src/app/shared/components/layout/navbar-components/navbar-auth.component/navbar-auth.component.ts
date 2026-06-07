import { Component, Input, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../../../core/services/auth';

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
  router =  inject(Router);
  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      }
    });
  }

  get user() {
    return this.authService.currentUserSignal();
  }
}