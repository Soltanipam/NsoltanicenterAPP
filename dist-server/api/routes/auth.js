"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = loginUser;
exports.checkConnection = checkConnection;
// Authentication API routes
const googleSheets_1 = require("../googleSheets");
async function loginUser(username, password) {
    try {
        // Check if Google Sheets API is ready
        if (!googleSheets_1.googleSheetsAPI.isReady()) {
            console.log('Initializing Google Sheets API...');
            await googleSheets_1.googleSheetsAPI.initialize();
        }
        const users = await googleSheets_1.googleSheetsAPI.readSheet('users');
        // Find user with matching credentials
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            return {
                success: false,
                message: 'نام کاربری یا رمز عبور اشتباه است'
            };
        }
        if (user.active !== 'true' && user.active !== true) {
            return {
                success: false,
                message: 'حساب کاربری شما غیرفعال است'
            };
        }
        // Parse permissions and settings
        let permissions = {};
        let settings = { sidebarOpen: true };
        try {
            permissions = typeof user.permissions === 'string'
                ? JSON.parse(user.permissions)
                : (user.permissions || {});
        }
        catch (e) {
            console.warn('Failed to parse user permissions:', e);
        }
        try {
            settings = typeof user.settings === 'string'
                ? JSON.parse(user.settings)
                : (user.settings || { sidebarOpen: true });
        }
        catch (e) {
            console.warn('Failed to parse user settings:', e);
        }
        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                jobDescription: user.job_description,
                active: user.active === 'true' || user.active === true,
                permissions,
                settings,
                auth_user_id: user.auth_user_id || user.id,
                email: user.email
            }
        };
    }
    catch (error) {
        console.error('Login error:', error);
        return {
            success: false,
            message: `خطا در برقراری ارتباط با Google Sheets: ${error.message}`
        };
    }
}
async function checkConnection() {
    try {
        const healthCheck = await googleSheets_1.googleSheetsAPI.healthCheck();
        return {
            success: healthCheck.status === 'healthy',
            connected: healthCheck.status === 'healthy',
            message: healthCheck.message
        };
    }
    catch (error) {
        console.error('Connection check failed:', error);
        return {
            success: false,
            connected: false,
            error: error.message
        };
    }
}
