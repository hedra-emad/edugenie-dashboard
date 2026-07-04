export type UserRole = 'student' | 'instructor' | 'admin' | 'superadmin';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string;
  avatarPublicId?: string;
  status?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deleted_at?: string | null;
}

export interface ProfileApiResponse {
  success: boolean;
  data: UserProfile;
}

export interface LoginResponse {
  success: boolean;
  data: {
    message: string;
    user: UserProfile;
    exchangeToken?: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  /** Extends the refresh-token lifetime to 30 days instead of 7. */
  rememberMe?: boolean;
}
