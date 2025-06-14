import { GOOGLE_CLIENT_CONFIG } from '../config/googleConfig';

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

class GoogleAuthService {
  private accessToken: string | null = null;
  private user: GoogleUser | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem('google_access_token');
    const user = localStorage.getItem('google_user');
    
    if (token && user) {
      this.accessToken = token;
      this.user = JSON.parse(user);
    }
  }

  private saveToStorage() {
    if (this.accessToken) {
      localStorage.setItem('google_access_token', this.accessToken);
    }
    if (this.user) {
      localStorage.setItem('google_user', JSON.stringify(this.user));
    }
  }

  async signIn(): Promise<{ success: boolean; user?: GoogleUser; error?: string }> {
    try {
      // ایجاد URL احراز هویت Google OAuth
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_CONFIG.client_id);
      authUrl.searchParams.set('redirect_uri', GOOGLE_CLIENT_CONFIG.redirect_uri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file');
      authUrl.searchParams.set('access_type', 'offline');

      // هدایت کاربر به صفحه احراز هویت Google
      window.location.href = authUrl.toString();
      
      return { success: true };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { success: false, error: 'خطا در ورود با Google' };
    }
  }

  async handleCallback(code: string): Promise<{ success: boolean; user?: GoogleUser; error?: string }> {
    try {
      // تبدیل کد به access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_CONFIG.client_id,
          client_secret: 'your-client-secret', // باید از متغیر محیطی خوانده شود
          code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_CLIENT_CONFIG.redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || 'Failed to get access token');
      }

      this.accessToken = tokenData.access_token;

      // دریافت اطلاعات کاربر
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const userData = await userResponse.json();
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user info');
      }

      this.user = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        given_name: userData.given_name,
        family_name: userData.family_name,
      };

      this.saveToStorage();

      return { success: true, user: this.user };
    } catch (error) {
      console.error('Google callback error:', error);
      return { success: false, error: 'خطا در تکمیل احراز هویت' };
    }
  }

  signOut() {
    this.accessToken = null;
    this.user = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getCurrentUser(): GoogleUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }
}

export const googleAuthService = new GoogleAuthService();