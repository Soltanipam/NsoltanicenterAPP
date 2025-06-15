import { GOOGLE_CONFIG } from '../config/googleConfig';

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
  private refreshToken: string | null = null;
  private user: GoogleUser | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem('google_access_token');
    const refresh = localStorage.getItem('google_refresh_token');
    const user = localStorage.getItem('google_user');
    
    if (token && user) {
      this.accessToken = token;
      this.refreshToken = refresh;
      this.user = JSON.parse(user);
    }
  }

  private saveToStorage() {
    if (this.accessToken) {
      localStorage.setItem('google_access_token', this.accessToken);
    }
    if (this.refreshToken) {
      localStorage.setItem('google_refresh_token', this.refreshToken);
    }
    if (this.user) {
      localStorage.setItem('google_user', JSON.stringify(this.user));
    }
  }

  async signIn(): Promise<{ success: boolean; user?: GoogleUser; error?: string }> {
    try {
      // ایجاد URL احراز هویت Google OAuth
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CONFIG.CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_CONFIG.REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GOOGLE_CONFIG.SCOPES.join(' '));
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

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
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || 'Failed to get access token');
      }

      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token;

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

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
          refresh_token: this.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        this.accessToken = data.access_token;
        if (data.refresh_token) {
          this.refreshToken = data.refresh_token;
        }
        this.saveToStorage();
        return true;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }

    return false;
  }

  signOut() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
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