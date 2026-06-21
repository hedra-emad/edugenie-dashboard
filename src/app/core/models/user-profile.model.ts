export type UserRole = 'student' | 'instructor' | 'admin' | 'superadmin';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  avatar?: string;
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
}
