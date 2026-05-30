import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-social-login',
  standalone: true,
  templateUrl: './social-login.component.html',
  styleUrl: './social-login.component.css'
})
export class SocialLoginComponent {
  @Output() onGoogle = new EventEmitter<void>();
  @Output() onGithub = new EventEmitter<void>();
}
