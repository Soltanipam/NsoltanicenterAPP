// Receptions API routes
import { googleSheetsAPI } from '../googleSheets';

export async function getReceptions() {
  try {
    const receptions = await googleSheetsAPI.readSheet('receptions');
    return { success: true, data: receptions };
  } catch (error) {
    console.error('Error getting receptions:', error);
    return { success: false, error: error.message };
  }
}

export async function createReception(receptionData: any) {
  try {
    const id = googleSheetsAPI.generateId();
    const values = [
      id,
      JSON.stringify(receptionData.customer_info),
      JSON.stringify(receptionData.vehicle_info),
      JSON.stringify(receptionData.service_info),
      receptionData.status || 'pending',
      receptionData.images || '',
      receptionData.documents || '',
      receptionData.billing ? JSON.stringify(receptionData.billing) : '',
      receptionData.completed_at || '',
      receptionData.completed_by || '',
      receptionData.created_at || new Date().toLocaleDateString('fa-IR'),
      receptionData.updated_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await googleSheetsAPI.appendToSheet('receptions', values);
    return { success: true, data: { id, ...receptionData } };
  } catch (error) {
    console.error('Error creating reception:', error);
    return { success: false, error: error.message };
  }
}

export async function updateReception(id: string, receptionData: any) {
  try {
    const receptions = await googleSheetsAPI.readSheet('receptions');
    const reception = receptions.find(r => r.id === id);
    
    if (!reception) {
      return { success: false, error: 'Reception not found' };
    }

    const updatedReception = { 
      ...reception, 
      ...receptionData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    const values = [
      updatedReception.id,
      typeof updatedReception.customer_info === 'string' ? updatedReception.customer_info : JSON.stringify(updatedReception.customer_info),
      typeof updatedReception.vehicle_info === 'string' ? updatedReception.vehicle_info : JSON.stringify(updatedReception.vehicle_info),
      typeof updatedReception.service_info === 'string' ? updatedReception.service_info : JSON.stringify(updatedReception.service_info),
      updatedReception.status,
      updatedReception.images || '',
      updatedReception.documents || '',
      updatedReception.billing ? (typeof updatedReception.billing === 'string' ? updatedReception.billing : JSON.stringify(updatedReception.billing)) : '',
      updatedReception.completed_at || '',
      updatedReception.completed_by || '',
      updatedReception.created_at,
      updatedReception.updated_at
    ];

    await googleSheetsAPI.updateSheet('receptions', `A${reception._rowNumber}:L${reception._rowNumber}`, [values]);
    return { success: true, data: updatedReception };
  } catch (error) {
    console.error('Error updating reception:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteReception(id: string) {
  try {
    const receptions = await googleSheetsAPI.readSheet('receptions');
    const reception = receptions.find(r => r.id === id);
    
    if (!reception) {
      return { success: false, error: 'Reception not found' };
    }

    const emptyValues = new Array(12).fill('');
    await googleSheetsAPI.updateSheet('receptions', `A${reception._rowNumber}:L${reception._rowNumber}`, [emptyValues]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting reception:', error);
    return { success: false, error: error.message };
  }
}