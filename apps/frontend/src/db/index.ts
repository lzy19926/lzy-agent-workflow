import Dexie, { Table } from 'dexie';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TaskRecord {
  id: string;
  taskId: string;  // 后端任务 ID
  videoUrl: string;
  title?: string;
  coverUrl?: string;
  status: TaskStatus;
  progress: number;
  error?: string;
  result?: {
    text: string;
    summarizedText?: string;
    originText?: string;
    markdown?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConfigRecord {
  key: string;
  value: any;
  updatedAt: string;
}

class VideoMemoDB extends Dexie {
  tasks!: Table<TaskRecord, string>;
  configs!: Table<ConfigRecord, string>;

  constructor() {
    super('VideoMemoDB');

    this.version(1).stores({
      tasks: 'id, taskId, status, createdAt',
      configs: 'key',
    });
  }
}

export const db = new VideoMemoDB();
