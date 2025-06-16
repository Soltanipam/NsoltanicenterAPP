// Messages API routes
import { googleSheetsAPI } from '../googleSheets';

export async function getMessages() {
  try {
    const messages = await googleSheetsAPI.readSheet('messages');
    return { success: true, data: messages };
  } catch (error) {
    console.error('Error getting messages:', error);
    return { success: false, error: error.message };
  }
}

export async function createMessage(messageData: any) {
  try {
    const id = googleSheetsAPI.generateId();
    const values = [
      id,
      messageData.from_user_id,
      messageData.to_user_id,
      messageData.subject,
      messageData.content,
      messageData.read || 'false',
      messageData.created_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await googleSheetsAPI.appendToSheet('messages', values);
    return { success: true, data: { id, ...messageData } };
  } catch (error) {
    console.error('Error creating message:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMessage(id: string, messageData: any) {
  try {
    const messages = await googleSheetsAPI.readSheet('messages');
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

    await googleSheetsAPI.updateSheet('messages', `A${message._rowNumber}:G${message._rowNumber}`, [values]);
    return { success: true, data: updatedMessage };
  } catch (error) {
    console.error('Error updating message:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteMessage(id: string) {
  try {
    const messages = await googleSheetsAPI.readSheet('messages');
    const message = messages.find(m => m.id === id);
    
    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    const emptyValues = new Array(7).fill('');
    await googleSheetsAPI.updateSheet('messages', `A${message._rowNumber}:G${message._rowNumber}`, [emptyValues]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error: error.message };
  }
}