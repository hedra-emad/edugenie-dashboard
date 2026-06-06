import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { NgIf } from '@angular/common';


@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    NavbarComponent,
    SidebarComponent, NgIf
  ],
  templateUrl: './layout.component.html',

})
export class LayoutComponent {
sidebarOpen = false;
isMobile = false;

ngOnInit() {
  this.checkScreen();
  window.addEventListener('resize', () => this.checkScreen());
}

checkScreen() {
  this.isMobile = window.innerWidth < 1024;

  if (!this.isMobile) {
    this.sidebarOpen = true;
  }
}

toggleSidebar() {
  this.sidebarOpen = !this.sidebarOpen;
}
}