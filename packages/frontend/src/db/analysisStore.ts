import Dexie, { Table } from 'dexie';

export interface AnalysisDocument {
  id?: number;
  taskId: string;
  stepKey: string;
  stepName: string;
  content: string;
  outputPath?: string;
  createdAt: string;
}

export interface AnalysisTaskRecord {
  id?: number;
  taskId: string;
  projectName: string;
  projectPath: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
  steps?: any[];
  createdAt: string;
  completedAt?: string;
}

class AnalysisMemoDB extends Dexie {
  documents!: Table<AnalysisDocument, number>;
  tasks!: Table<AnalysisTaskRecord, number>;

  constructor() {
    super('AnalysisMemoDB');

    this.version(1).stores({
      documents: '++id, taskId, stepKey, createdAt',
      tasks: '++id, taskId, status, createdAt',
    });
  }
}

export const analysisDb = new AnalysisMemoDB();

// 文档操作
export async function saveDocument(doc: Omit<AnalysisDocument, 'id' | 'createdAt'>): Promise<number> {
  const id = await analysisDb.documents.add({
    ...doc,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getDocument(taskId: string, stepKey: string): Promise<AnalysisDocument | undefined> {
  return await analysisDb.documents
    .where({ taskId, stepKey })
    .first();
}

export async function getDocumentsByTaskId(taskId: string): Promise<AnalysisDocument[]> {
  return await analysisDb.documents
    .where('taskId')
    .equals(taskId)
    .sortBy('createdAt');
}

export async function deleteDocumentsByTaskId(taskId: string): Promise<void> {
  const docs = await analysisDb.documents.where('taskId').equals(taskId).toArray();
  const ids = docs.map(d => d.id!);
  await analysisDb.documents.bulkDelete(ids);
}

// 任务操作
export async function saveTask(task: Omit<AnalysisTaskRecord, 'id' | 'createdAt'>): Promise<number> {
  const id = await analysisDb.tasks.add({
    ...task,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function updateTask(
  taskId: string,
  updates: Partial<AnalysisTaskRecord>
): Promise<void> {
  const task = await analysisDb.tasks.where('taskId').equals(taskId).first();
  if (task) {
    await analysisDb.tasks.update(task.id!, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function getTaskByTaskId(taskId: string): Promise<AnalysisTaskRecord | undefined> {
  return await analysisDb.tasks.where('taskId').equals(taskId).first();
}

export async function getAllTasks(): Promise<AnalysisTaskRecord[]> {
  return await analysisDb.tasks.orderBy('createdAt').reverse().toArray();
}

export async function deleteTaskByTaskId(taskId: string): Promise<void> {
  const task = await analysisDb.tasks.where('taskId').equals(taskId).first();
  if (task) {
    await analysisDb.tasks.delete(task.id!);
    // 同时删除关联的文档
    await deleteDocumentsByTaskId(taskId);
  }
}
