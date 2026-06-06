import { Component, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavbarSearchComponent } from '../navbar-components/navbar-search.component/navbar-search.component';
import { NavbarAuthComponent } from '../navbar-components/navbar-auth.component/navbar-auth.component';
import { NavbarLinksComponent } from '../navbar-components/navbar-links.component/navbar-links.component';
import { MobileMenuComponent } from '../navbar-components/mobile-menu/mobile-menu';
import { NavbarLogoComponent } from "../navbar-components/navbar-logo.component/navbar-logo.component";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    NavbarSearchComponent,
    NavbarAuthComponent,
    NavbarLinksComponent,
    MobileMenuComponent,
    NavbarLogoComponent
],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent {
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }
  @Input() isMobile = false;
}