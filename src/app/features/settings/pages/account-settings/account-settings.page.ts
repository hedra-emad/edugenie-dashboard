import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, UserProfile } from '../../../../core/services/auth';
import { CloudinaryService } from '../../../../core/services/cloudinary';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.css']
})
export class AccountSettingsPageComponent implements OnInit {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private cloudinaryService = inject(CloudinaryService);
  isUploadingAvatar = false;

  profileForm!: FormGroup;
  securityForm!: FormGroup;

  emailNotifications = true;
  publicProfile = false;

  isLoadingProfile = true;
  isSaving = false;

  errorMessage = '';
  successMessage = '';

  avatarPreview: string | null = null;
  showAvatarOptions = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor() {
    this.initForms();
  }

  ngOnInit() {
    this.loadProfile();
  }

  private initForms() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
    });

    this.securityForm = this.fb.group({
      currentPassword: [{ value: '', disabled: true }],
      newPassword: [{ value: '', disabled: true }],
      confirmPassword: [{ value: '', disabled: true }]
    });
  }

  loadProfile() {
    this.isLoadingProfile = true;
    this.errorMessage = '';

    this.authService.getProfile().subscribe({
      next: (response) => {
        if (response.data) {
          this.populateForm(response.data);
        }
        this.isLoadingProfile = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load profile.';
        this.isLoadingProfile = false;
      }
    });
  }

  private populateForm(user: UserProfile) {
    this.profileForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || ''
    });

    if (user.avatar) {
      this.avatarPreview = user.avatar;
    } else {
      this.avatarPreview = null;
    }
  }

  getInitials(): string {
    const fName = this.profileForm.get('firstName')?.value || '';
    const lName = this.profileForm.get('lastName')?.value || '';
    if (!fName && !lName) return 'U';
    return `${fName.charAt(0)}${lName.charAt(0)}`.toUpperCase();
  }

  toggleAvatarOptions() {
    this.showAvatarOptions = !this.showAvatarOptions;
  }

  triggerFileInput() {
    this.showAvatarOptions = false;
    this.fileInput.nativeElement.click();
  }

  promptAvatarUrl() {
    this.showAvatarOptions = false;
    const url = window.prompt('Enter image URL:');
    if (url) {
      this.avatarPreview = url;
    }
  }

  onFileSelected(event: Event) {

    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];

    this.isUploadingAvatar = true;
    this.errorMessage = '';

    this.cloudinaryService.uploadImage(file)
      .subscribe({

        next: (response: any) => {

          this.avatarPreview = response.secure_url;

          this.isUploadingAvatar = false;

          console.log('Image Uploaded:', response.secure_url);

        },

        error: (error) => {

          console.error(error);

          this.isUploadingAvatar = false;

          this.errorMessage = 'Failed to upload image.';
        }
      });
  }

  onSaveChanges() {
    if (this.profileForm.invalid) return;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData: any = {
      firstName: this.profileForm.get('firstName')?.value,
      lastName: this.profileForm.get('lastName')?.value
    };

    if (
      this.avatarPreview &&
      this.avatarPreview.startsWith('http')
    ) {
      updateData.avatar = this.avatarPreview;
    }

    console.log(updateData);

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.successMessage = 'Profile updated successfully.';
        if (response.data) {
          this.populateForm(response.data);
        }
        // setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage =
          err.error?.message ||
          'Failed to update profile. Please try again.';
      },
    });
  }
  toggleEmailNotifications() {
    this.emailNotifications = !this.emailNotifications;
  }

  togglePublicProfile() {
    this.publicProfile = !this.publicProfile;
  }
}
