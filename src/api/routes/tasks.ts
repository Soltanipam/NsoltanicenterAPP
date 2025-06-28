// Tasks API routes
import { googleSheetsAPI } from '../googleSheets';

export async function getTasks() {
  try {
    const tasks = await googleSheetsAPI.readSheet('tasks');
    return { success: true, data: tasks };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function createTask(taskData: any) {
  try {
    const id = googleSheetsAPI.generateId();
    const values = [
      id,
      taskData.title,
      taskData.description || '',
      taskData.status || 'pending',
      taskData.priority || 'medium',
      taskData.assigned_to_id,
      taskData.assigned_to_name,
      taskData.vehicle_id,
      JSON.stringify(taskData.vehicle_info),
      taskData.due_date || '',
      taskData.images || '',
      JSON.stringify(taskData.history || []),
      taskData.created_at || new Date().toLocaleDateString('fa-IR'),
      taskData.updated_at || new Date().toLocaleDateString('fa-IR')
    ];
    
    await googleSheetsAPI.appendToSheet('tasks', values);
    return { success: true, data: { id, ...taskData } };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function updateTask(id: string, taskData: any) {
  try {
    const tasks = await googleSheetsAPI.readSheet('tasks');
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const updatedTask = { 
      ...task, 
      ...taskData, 
      updated_at: new Date().toLocaleDateString('fa-IR') 
    };
    
    const values = [
      updatedTask.id,
      updatedTask.title,
      updatedTask.description || '',
      updatedTask.status,
      updatedTask.priority,
      updatedTask.assigned_to_id,
      updatedTask.assigned_to_name,
      updatedTask.vehicle_id,
      typeof updatedTask.vehicle_info === 'string' ? updatedTask.vehicle_info : JSON.stringify(updatedTask.vehicle_info),
      updatedTask.due_date || '',
      updatedTask.images || '',
      typeof updatedTask.history === 'string' ? updatedTask.history : JSON.stringify(updatedTask.history || []),
      updatedTask.created_at,
      updatedTask.updated_at
    ];

    await googleSheetsAPI.updateSheet('tasks', `A${task._rowNumber}:N${task._rowNumber}`, [values]);
    return { success: true, data: updatedTask };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteTask(id: string) {
  try {
    const tasks = await googleSheetsAPI.readSheet('tasks');
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    const emptyValues = new Array(14).fill('');
    await googleSheetsAPI.updateSheet('tasks', `A${task._rowNumber}:N${task._rowNumber}`, [emptyValues]);
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: (error as Error).message };
  }
}