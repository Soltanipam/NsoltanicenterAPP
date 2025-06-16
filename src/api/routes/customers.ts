// Customers API routes
import { googleSheetsAPI } from '../googleSheets';

export async function getCustomers() {
  try {
    const customers = await googleSheetsAPI.readSheet('customers');
    return { success: true, data: customers };
  } catch (error) {
    console.error('Error getting customers:', error);
    return { success: false, error: error.message };
  }
}

export async function createCustomer(customerData: any) {
  try {
    const id = googleSheetsAPI.generateId();
    const code = customerData.code || googleSheetsAPI.generateCustomerId();
    
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
    
    await googleSheetsAPI.appendToSheet('customers', values);
    return { success: true, data: { id, code, ...customerData } };
  } catch (error) {
    console.error('Error creating customer:', error);
    return { success: false, error: error.message };
  }
}

export async function updateCustomer(id: string, customerData: any) {
  try {
    const customers = await googleSheetsAPI.readSheet('customers');
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

    await googleSheetsAPI.updateSheet('customers', `A${customer._rowNumber}:H${customer._rowNumber}`, [values]);
    return { success: true, data: updatedCustomer };
  } catch (error) {
    console.error('Error updating customer:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const customers = await googleSheetsAPI.readSheet('customers');
    const customer = customers.find(c => c.id === id);
    
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const emptyValues = new Array(8).fill('');
    await googleSheetsAPI.updateSheet('customers', `A${customer._rowNumber}:H${customer._rowNumber}`, [emptyValues]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: error.message };
  }
}