import { Job } from './job';

export type JobEventType = 'CREATED' | 'UPDATED' | 'DELETED' | 'LOG';

export interface JobEvent {
  type: JobEventType;
  jobId: string;
  payload?: Job;
  message?: string;
  ts: string;
}
