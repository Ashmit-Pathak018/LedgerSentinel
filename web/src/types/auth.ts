export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export type AuthModalView = 'login' | 'signup' | 'forgot_password' | 'reset_password';

export interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authModalOpen: boolean;
  authModalView: AuthModalView;
}
