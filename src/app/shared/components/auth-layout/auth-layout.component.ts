import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthSidebar } from '../auth-sidebar/auth-sidebar';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule, AuthSidebar],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css'
})
export class AuthLayoutComponent {}
