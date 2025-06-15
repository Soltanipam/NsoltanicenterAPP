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
  private tokenExpiry: number | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const token = localStorage.getItem('google_access_token');
    const refresh = localStorage.getItem('google_refresh_token');
    const user = localStorage.getItem('google_user');
    const expiry = localStorage.getItem('google_token_expiry');
    
    if (token && user) {
      this.accessToken = token;
      this.refreshToken = refresh;
      this.user = JSON.parse(user);
      this.tokenExpiry = expiry ? parseInt(expiry) : null;
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
    if (this.tokenExpiry) {
      localStorage.setItem('google_token_expiry', this.tokenExpiry.toString());
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
      
      // Calculate token expiry time
      if (tokenData.expires_in) {
        this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      }

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

  async refreshToken(): Promise<boolean> {
    if (!this.refreshToken) {
      console.warn('No refresh token available');
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
        
        // Calculate new token expiry time
        if (data.expires_in) {
          this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        }
        
        this.saveToStorage();
        console.log('Access token refreshed successfully');
        return true;
      } else {
        console.error('Failed to refresh token:', data);
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
    this.tokenExpiry = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    localStorage.removeItem('google_user');
    localStorage.removeItem('google_token_expiry');
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

  isTokenExpired(): boolean {
    if (!this.tokenExpiry) {
      return false; // If we don't know expiry, assume it's still valid
    }
    return Date.now() >= this.tokenExpiry;
  }

  async ensureValidToken(): Promise<string | null> {
    if (!this.accessToken) {
      throw new Error('No access token found. Please authenticate with Google first.');
    }

    // Check if token is expired and refresh if needed
    if (this.isTokenExpired() && this.refreshToken) {
      console.log('Access token expired, attempting to refresh...');
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        throw new Error('Access token expired and refresh failed. Please re-authenticate with Google.');
      }
    }

    return this.accessToken;
  }
}

export const googleAuthService = new GoogleAuthService();