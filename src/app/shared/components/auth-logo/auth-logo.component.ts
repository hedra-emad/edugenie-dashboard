import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-logo.component.html',
  styleUrl: './auth-logo.component.css'
})
export class AuthLogoComponent {
  @Input() dark = false;
}
