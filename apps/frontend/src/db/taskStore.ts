import { db, TaskRecord, TaskStatus } from './index';

/**
 * 创建或更新任务记录
 */
export async function upsertTask(task: Partial<TaskRecord> & { taskId: string; videoUrl: string }): Promise<TaskRecord> {
  const existing = await db.tasks.where('taskId').equals(task.taskId).first();

  const record: TaskRecord = {
    id: existing?.id || crypto.randomUUID(),
    taskId: task.taskId,
    videoUrl: task.videoUrl,
    title: task.title || existing?.title,
    coverUrl: task.coverUrl || existing?.coverUrl,
    status: task.status || existing?.status || 'pending',
    progress: task.progress ?? existing?.progress ?? 0,
    error: task.error || existing?.error,
    result: task.result || existing?.result,
    createdAt: task.createdAt || existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.tasks.put(record);
  return record;
}

/**
 * 获取所有任务（按创建时间倒序）
 */
export async function getAllTasks(): Promise<TaskRecord[]> {
  return await db.tasks.reverse().sortBy('createdAt');
}

/**
 * 根据 ID 获取任务
 */
export async function getTaskById(id: string): Promise<TaskRecord | undefined> {
  return await db.tasks.get(id);
}

/**
 * 根据 taskId 获取任务
 */
export async function getTaskByTaskId(taskId: string): Promise<TaskRecord | undefined> {
  return await db.tasks.where('taskId').equals(taskId).first();
}

/**
 * 按状态筛选任务
 */
export async function getTasksByStatus(status: TaskStatus | TaskStatus[]): Promise<TaskRecord[]> {
  const statuses = Array.isArray(status) ? status : [status];
  return await db.tasks.filter(task => statuses.includes(task.status)).sortBy('createdAt');
}

/**
 * 更新任务状态和进度
 */
export async function updateTaskProgress(
  taskId: string,
  updates: { status?: TaskStatus; progress?: number; error?: string; result?: TaskRecord['result']; title?: string; coverUrl?: string }
): Promise<void> {
  const task = await getTaskByTaskId(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  await db.tasks.update(task.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * 删除任务
 */
export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

/**
 * 批量删除任务
 */
export async function deleteTasks(ids: string[]): Promise<void> {
  await db.tasks.bulkDelete(ids);
}

/**
 * 删除已完成的任务
 */
export async function deleteCompletedTasks(): Promise<void> {
  const completedTasks = await getTasksByStatus('completed');
  await deleteTasks(completedTasks.map(t => t.id));
}

/**
 * 清空所有任务
 */
export async function clearAllTasks(): Promise<void> {
  await db.tasks.clear();
}
