import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardLayoutComponent } from '../../../../shared/components/dashboard-layout/dashboard-layout.component';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DashboardLayoutComponent],
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.css']
})
export class AccountSettingsPageComponent {
  profileForm: FormGroup;
  securityForm: FormGroup;
  
  emailNotifications = true;
  publicProfile = false;

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      firstName: ['Alex', Validators.required],
      lastName: ['Rivera', Validators.required],
      email: ['alex.rivera@example.com', [Validators.required, Validators.email]]
    });

    this.securityForm = this.fb.group({
      currentPassword: ['password', Validators.required],
      newPassword: ['', Validators.required],
      confirmPassword: ['', Validators.required]
    });
  }

  onSaveChanges() {
    if (this.profileForm.valid && this.securityForm.valid) {
      console.log('Saved changes', {
        profile: this.profileForm.value,
        security: this.securityForm.value,
        preferences: {
          emailNotifications: this.emailNotifications,
          publicProfile: this.publicProfile
        }
      });
    }
  }

  toggleEmailNotifications() {
    this.emailNotifications = !this.emailNotifications;
  }

  togglePublicProfile() {
    this.publicProfile = !this.publicProfile;
  }
}
