import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth';

@Component({
  selector: 'app-navbar-auth',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar-auth.component.html',
  styleUrl: './navbar-auth.component.css',
})
export class NavbarAuthComponent {
logout() {
throw new Error('Method not implemented.');
}
  @Input() isMobile = false;

  authService = inject(AuthService);

  get user() {
    return this.authService.currentUserSignal();
  }
}