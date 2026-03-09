import { useLiveQuery } from 'dexie-react-hooks';
import { getAllTasks, getTaskByTaskId, deleteTask as deleteTaskFromDb, updateTaskProgress } from '../db/taskStore';

/**
 * 获取所有任务（实时查询）
 */
export function useTasks() {
  const tasks = useLiveQuery(() => getAllTasks(), []);
  return tasks || [];
}

/**
 * 获取单个任务（实时查询）
 */
export function useTask(taskId: string) {
  const task = useLiveQuery(
    () => (taskId ? getTaskByTaskId(taskId) : undefined),
    [taskId]
  );
  return task;
}

/**
 * 更新任务进度的 Hook
 */
export function useTaskProgress() {
  const updateProgress = async (
    taskId: string,
    updates: { status?: 'pending' | 'processing' | 'completed' | 'failed'; progress?: number; error?: string }
  ) => {
    await updateTaskProgress(taskId, updates);
  };

  return { updateProgress };
}

/**
 * 删除任务的 Hook
 */
export function useDeleteTask() {
  const deleteTask = async (id: string) => {
    await deleteTaskFromDb(id);
  };

  return { deleteTask };
}




