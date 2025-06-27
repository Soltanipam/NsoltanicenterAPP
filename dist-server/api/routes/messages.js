"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessages = getMessages;
exports.createMessage = createMessage;
exports.updateMessage = updateMessage;
exports.deleteMessage = deleteMessage;
// Messages API routes
const googleSheets_1 = require("../googleSheets");
async function getMessages() {
    try {
        const messages = await googleSheets_1.googleSheetsAPI.readSheet('messages');
        return { success: true, data: messages };
    }
    catch (error) {
        console.error('Error getting messages:', error);
        return { success: false, error: error.message };
    }
}
async function createMessage(messageData) {
    try {
        const id = googleSheets_1.googleSheetsAPI.generateId();
        const values = [
            id,
            messageData.from_user_id,
            messageData.to_user_id,
            messageData.subject,
            messageData.content,
            messageData.read || 'false',
            messageData.created_at || new Date().toLocaleDateString('fa-IR')
        ];
        await googleSheets_1.googleSheetsAPI.appendToSheet('messages', values);
        return { success: true, data: { id, ...messageData } };
    }
    catch (error) {
        console.error('Error creating message:', error);
        return { success: false, error: error.message };
    }
}
async function updateMessage(id, messageData) {
    try {
        const messages = await googleSheets_1.googleSheetsAPI.readSheet('messages');
        const message = messages.find(m => m.id === id);
        if (!message) {
            return { success: false, error: 'Message not found' };
        }
        const updatedMessage = { ...message, ...messageData };
        const values = [
            updatedMessage.id,
            updatedMessage.from_user_id,
            updatedMessage.to_user_id,
            updatedMessage.subject,
            updatedMessage.content,
            updatedMessage.read,
            updatedMessage.created_at
        ];
        await googleSheets_1.googleSheetsAPI.updateSheet('messages', `A${message._rowNumber}:G${message._rowNumber}`, [values]);
        return { success: true, data: updatedMessage };
    }
    catch (error) {
        console.error('Error updating message:', error);
        return { success: false, error: error.message };
    }
}
async function deleteMessage(id) {
    try {
        const messages = await googleSheets_1.googleSheetsAPI.readSheet('messages');
        const message = messages.find(m => m.id === id);
        if (!message) {
            return { success: false, error: 'Message not found' };
        }
        const emptyValues = new Array(7).fill('');
        await googleSheets_1.googleSheetsAPI.updateSheet('messages', `A${message._rowNumber}:G${message._rowNumber}`, [emptyValues]);
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting message:', error);
        return { success: false, error: error.message };
    }
}
