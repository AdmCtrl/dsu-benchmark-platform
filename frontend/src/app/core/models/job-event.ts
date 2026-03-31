import { Job } from './job';

export type JobEventType = 'CREATED' | 'UPDATED' | 'DELETED' | 'LOG';

export interface JobEvent {
  type: JobEventType;
  jobId: string;
  executionId?: string;  // ID конкретного запуска; присутствует только в LOG-событиях
  payload?: Job;
  message?: string;
  ts: string;
}
