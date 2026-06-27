import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div
      style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:sans-serif;background:#f8f9fb"
    >
      <div
        style="width:100%;max-width:420px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:32px"
      >
        <h1 style="margin:0 0 4px;font-size:22px;color:#2e2a91">Accept your invitation</h1>

        <ng-container *ngIf="loading()">
          <p style="color:#666">Validating your invitation…</p>
        </ng-container>

        <ng-container *ngIf="!loading() && fatalError()">
          <p style="color:#c0392b">{{ fatalError() }}</p>
          <a href="/login" style="color:#2e2a91">Back to login</a>
        </ng-container>

        <form
          *ngIf="!loading() && !fatalError()"
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          style="display:flex;flex-direction:column;gap:14px;margin-top:12px"
        >
          <p style="color:#444;margin:0 0 4px">
            Setting up the admin account for
            <strong>{{ email() }}</strong>.
          </p>

          <label style="font-size:13px;color:#555">
            New password
            <input
              type="password"
              formControlName="password"
              autocomplete="new-password"
              style="width:100%;margin-top:6px;padding:10px 12px;border:1px solid #d8dae0;border-radius:8px"
            />
          </label>

          <label style="font-size:13px;color:#555">
            Confirm password
            <input
              type="password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              style="width:100%;margin-top:6px;padding:10px 12px;border:1px solid #d8dae0;border-radius:8px"
            />
          </label>

          <p *ngIf="formError()" style="color:#c0392b;font-size:13px;margin:0">
            {{ formError() }}
          </p>

          <button
            type="submit"
            [disabled]="submitting()"
            style="margin-top:6px;padding:12px;border:none;border-radius:8px;background:#2e2a91;color:#fff;font-size:15px;cursor:pointer"
          >
            {{ submitting() ? 'Activating…' : 'Activate account' }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export class AcceptInviteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  loading = signal(true);
  submitting = signal(false);
  fatalError = signal<string | null>(null);
  formError = signal<string | null>(null);
  email = signal<string>('');

  private token = '';

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.loading.set(false);
      this.fatalError.set('No invitation token provided.');
      return;
    }

    this.authService.validateInvite(this.token).subscribe({
      next: (invite) => {
        this.email.set(invite.email);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.fatalError.set('This invitation is invalid or has expired.');
      },
    });
  }

  onSubmit(): void {
    this.formError.set(null);
    const { password, confirmPassword } = this.form.value;

    if (this.form.invalid) {
      this.formError.set('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      this.formError.set('Passwords do not match.');
      return;
    }

    this.submitting.set(true);
    this.authService.acceptInvite(this.token, password!).subscribe({
      next: () => {
        // The account is created and the session cookie is set — go to admin.
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(
          err?.status === 400
            ? 'This invitation is invalid or has expired.'
            : 'Could not activate the account. Please try again.',
        );
      },
    });
  }
}
