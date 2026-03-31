import {Injectable} from '@angular/core';
import {JobEventsService} from '../services/job-events.service';
import {JobStore} from './job.store';
import {JobLogStore} from './job-log.store';
import {JobEvent} from '../models/job-event';
import {filter, first, map, Observable, Subscription, tap} from 'rxjs';
import {Job} from '../models/job';
import {TaskStore} from './task.store';

@Injectable({providedIn: 'root'})
export class JobEventsFacade {
  private sub?: Subscription;

  readonly totalRunningTasks$: Observable<number>;

  waitForExecution(jobId: string, executionId: string): Observable<void> {
    return this.events.events$.pipe(
      // Ищем событие обновления этого джоба с нужным executionId
      filter(e => e.type === 'UPDATED' && e.jobId === jobId && e.executionId === executionId),
      // Ждем, пока статус в пейлоаде не станет финальным
      filter(e => e.payload?.status === 'FINISHED' || e.payload?.status === 'FAILED'),
      // Нам нужно только ПЕРВОЕ такое событие
      first(),
      // Превращаем в void, так как нам важен только факт завершения (complete)
      map(() => void 0)
    );
  }

  /** Стрим живых логов для отображения в уведомлении */
  getExecutionLogs(executionId: string): Observable<string> {
    return this.events.events$.pipe(
      filter(e => e.type === 'LOG' && e.executionId === executionId),
      map(e => e.message || ''),
      filter(msg => !!msg)
    );
  }


  constructor(
    private events: JobEventsService,
    private jobStore: JobStore,
    private logStore: JobLogStore,
    private taskStore: TaskStore
  ) {
    this.totalRunningTasks$ = this.taskStore.totalRunning$;
  }

  init() {

    if (this.sub) return;

    this.sub = this.events.events$
    .subscribe(e => this.reduce(e));
  }

  destroy() {
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  private reduce(e: JobEvent) {

    switch (e.type) {

      case 'CREATED':
      case 'UPDATED':
        this.applyServerJob(e);
        break;

      case 'DELETED':
        this.jobStore.remove(e.jobId);
        break;

      case 'LOG':
        if (e.message) {
          this.logStore.append(e.jobId, e.executionId, e.message);
        }
        break;
    }
  }

  startJob(jobId: string) {
    this.taskStore.add({
      id: crypto.randomUUID(),
      jobId,
      status: 'RUNNING'
    });

    const job = this.jobStore.getJob(jobId);
    if (!job) return;

    if (job.status !== 'RUNNING') {
      this.jobStore.update(
        new Job({
          ...job,
          status: 'RUNNING',
          startedAt: new Date().toISOString()
        })
      );
    }
  }

  getRunningCount(jobId: string): number {
    return this.taskStore.runningCountForJob(jobId);
  }


  canRun(jobId: string): boolean {
    return true; // или логика лимитов
  }

  private applyServerJob(e: JobEvent) {
    const serverJob = e.payload!;
    const jobId = serverJob.id;

    if (serverJob.status === 'FINISHED' || serverJob.status === 'FAILED') {
      this.taskStore.finishOne(jobId);
      // Сообщаем стору логов, что этот запуск завершился — очередь адвансируется
      if (e.executionId) {
        this.logStore.markExecutionFinished(jobId, e.executionId);
      }
    }

    const active = this.taskStore.runningCountForJob(jobId);

    this.jobStore.update(
      new Job({
        ...serverJob,
        status: active > 0 ? 'RUNNING' : serverJob.status
      })
    );
  }
}
