import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type Phase = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  phase = signal<Phase>('verifying');
  message = signal<string>('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.phase.set('error');
      this.message.set('This verification link is missing its token.');
      return;
    }
    this.auth.verifyEmail(token).subscribe({
      next: () => this.phase.set('success'),
      error: (err: { error?: { message?: string } }) => {
        this.phase.set('error');
        this.message.set(
          err?.error?.message ??
            'This verification link is invalid or has expired.',
        );
      },
    });
  }
}
