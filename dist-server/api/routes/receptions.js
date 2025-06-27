"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceptions = getReceptions;
exports.createReception = createReception;
exports.updateReception = updateReception;
exports.deleteReception = deleteReception;
// Receptions API routes
const googleSheets_1 = require("../googleSheets");
async function getReceptions() {
    try {
        const receptions = await googleSheets_1.googleSheetsAPI.readSheet('receptions');
        return { success: true, data: receptions };
    }
    catch (error) {
        console.error('Error getting receptions:', error);
        return { success: false, error: error.message };
    }
}
async function createReception(receptionData) {
    try {
        const id = googleSheets_1.googleSheetsAPI.generateId();
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
        await googleSheets_1.googleSheetsAPI.appendToSheet('receptions', values);
        return { success: true, data: { id, ...receptionData } };
    }
    catch (error) {
        console.error('Error creating reception:', error);
        return { success: false, error: error.message };
    }
}
async function updateReception(id, receptionData) {
    try {
        const receptions = await googleSheets_1.googleSheetsAPI.readSheet('receptions');
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
        await googleSheets_1.googleSheetsAPI.updateSheet('receptions', `A${reception._rowNumber}:L${reception._rowNumber}`, [values]);
        return { success: true, data: updatedReception };
    }
    catch (error) {
        console.error('Error updating reception:', error);
        return { success: false, error: error.message };
    }
}
async function deleteReception(id) {
    try {
        const receptions = await googleSheets_1.googleSheetsAPI.readSheet('receptions');
        const reception = receptions.find(r => r.id === id);
        if (!reception) {
            return { success: false, error: 'Reception not found' };
        }
        const emptyValues = new Array(12).fill('');
        await googleSheets_1.googleSheetsAPI.updateSheet('receptions', `A${reception._rowNumber}:L${reception._rowNumber}`, [emptyValues]);
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting reception:', error);
        return { success: false, error: error.message };
    }
}
