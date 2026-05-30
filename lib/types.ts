export type TaskStatus = 'todo' | 'progress' | 'review' | 'done';
export type Priority = 'high' | 'medium' | 'low';
export type Category = 'Release' | 'Artist' | 'Marketing' | 'Legal' | 'Studio' | 'Finance' | 'Admin';

export type Task = {
  id: string;
  title: string;
  notes?: string;
  category: Category;
  status: TaskStatus;
  priority: Priority;
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};
