import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,       // <--- from @angular/material/toolbar
    MatIconModule,          // <--- from @angular/material/icon
    MatButtonModule         // <--- from @angular/material/button
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  

  
   @Input() sidebarOpen = false;
  @Output() menuClick = new EventEmitter<void>();

}