"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomers = getCustomers;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.deleteCustomer = deleteCustomer;
// Customers API routes
const googleSheets_1 = require("../googleSheets");
async function getCustomers() {
    try {
        const customers = await googleSheets_1.googleSheetsAPI.readSheet('customers');
        return { success: true, data: customers };
    }
    catch (error) {
        console.error('Error getting customers:', error);
        return { success: false, error: error.message };
    }
}
async function createCustomer(customerData) {
    try {
        const id = googleSheets_1.googleSheetsAPI.generateId();
        const code = customerData.code || googleSheets_1.googleSheetsAPI.generateCustomerId();
        const values = [
            id,
            code,
            customerData.name,
            customerData.phone,
            customerData.email || '',
            customerData.can_login ? 'true' : 'false',
            customerData.created_at || new Date().toLocaleDateString('fa-IR'),
            customerData.updated_at || new Date().toLocaleDateString('fa-IR')
        ];
        await googleSheets_1.googleSheetsAPI.appendToSheet('customers', values);
        return { success: true, data: { id, code, ...customerData } };
    }
    catch (error) {
        console.error('Error creating customer:', error);
        return { success: false, error: error.message };
    }
}
async function updateCustomer(id, customerData) {
    try {
        const customers = await googleSheets_1.googleSheetsAPI.readSheet('customers');
        const customer = customers.find(c => c.id === id);
        if (!customer) {
            return { success: false, error: 'Customer not found' };
        }
        const updatedCustomer = {
            ...customer,
            ...customerData,
            updated_at: new Date().toLocaleDateString('fa-IR')
        };
        const values = [
            updatedCustomer.id,
            updatedCustomer.code,
            updatedCustomer.name,
            updatedCustomer.phone,
            updatedCustomer.email || '',
            updatedCustomer.can_login ? 'true' : 'false',
            updatedCustomer.created_at,
            updatedCustomer.updated_at
        ];
        await googleSheets_1.googleSheetsAPI.updateSheet('customers', `A${customer._rowNumber}:H${customer._rowNumber}`, [values]);
        return { success: true, data: updatedCustomer };
    }
    catch (error) {
        console.error('Error updating customer:', error);
        return { success: false, error: error.message };
    }
}
async function deleteCustomer(id) {
    try {
        const customers = await googleSheets_1.googleSheetsAPI.readSheet('customers');
        const customer = customers.find(c => c.id === id);
        if (!customer) {
            return { success: false, error: 'Customer not found' };
        }
        const emptyValues = new Array(8).fill('');
        await googleSheets_1.googleSheetsAPI.updateSheet('customers', `A${customer._rowNumber}:H${customer._rowNumber}`, [emptyValues]);
        return { success: true };
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        return { success: false, error: error.message };
    }
}
