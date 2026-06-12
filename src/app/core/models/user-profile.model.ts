export type UserRole = 'student' | 'instructor' | 'admin';

export interface UserProfile {
  _id: string;
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
  message: string;
  user: UserProfile;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
