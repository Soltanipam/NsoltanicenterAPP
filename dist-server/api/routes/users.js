"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
// Users API routes
const googleSheets_1 = require("../googleSheets");
async function getUsers() {
    try {
        const users = await googleSheets_1.googleSheetsAPI.readSheet('users');
        return { success: true, data: users };
    }
    catch (error) {
        console.error('Error getting users:', error);
        return { success: false, error: error.message };
    }
}
async function createUser(userData) {
    try {
        const id = googleSheets_1.googleSheetsAPI.generateId();
        const values = [
            id,
            userData.username,
            userData.name,
            userData.role,
            userData.job_description || '',
            userData.active ? 'true' : 'false',
            JSON.stringify(userData.permissions || {}),
            JSON.stringify(userData.settings || {}),
            userData.created_at || new Date().toLocaleDateString('fa-IR'),
            userData.updated_at || new Date().toLocaleDateString('fa-IR'),
            userData.email || '',
            userData.auth_user_id || id
        ];
        await googleSheets_1.googleSheetsAPI.appendToSheet('users', values);
        return { success: true, data: { id, ...userData } };
    }
    catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
    }
}
async function updateUser(id, userData) {
    try {
        const users = await googleSheets_1.googleSheetsAPI.readSheet('users');
        const user = users.find(u => u.id === id);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        const updatedUser = {
            ...user,
            ...userData,
            updated_at: new Date().toLocaleDateString('fa-IR')
        };
        const values = [
            updatedUser.id,
            updatedUser.username,
            updatedUser.name,
            updatedUser.role,
            updatedUser.job_description || '',
            updatedUser.active ? 'true' : 'false',
            typeof updatedUser.permissions === 'string' ? updatedUser.permissions : JSON.stringify(updatedUser.permissions || {}),
            typeof updatedUser.settings === 'string' ? updatedUser.settings : JSON.stringify(updatedUser.settings || {}),
            updatedUser.created_at,
            updatedUser.updated_at,
            updatedUser.email || '',
            updatedUser.auth_user_id || updatedUser.id
        ];
        await googleSheets_1.googleSheetsAPI.updateSheet('users', `A${user._rowNumber}:L${user._rowNumber}`, [values]);
        return { success: true, data: updatedUser };
    }
    catch (error) {
        console.error('Error updating user:', error);
        return { success: false, error: error.message };
    }
}
async function deleteUser(id) {
    try {
        const users = await googleSheets_1.googleSheetsAPI.readSheet('users');
        const user = users.find(u => u.id === id);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        const emptyValues = new Array(12).fill('');
        await googleSheets_1.googleSheetsAPI.updateSheet('users', `A${user._rowNumber}:L${user._rowNumber}`, [emptyValues]);
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
    }
}
