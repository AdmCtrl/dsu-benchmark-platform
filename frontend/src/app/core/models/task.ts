export interface Task {
  id: string;        // локальный id
  jobId: string;     // к какому job относится
  status: 'RUNNING' | 'FINISHED' | 'ERROR';
}
