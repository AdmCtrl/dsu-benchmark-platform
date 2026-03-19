import {Injectable} from '@angular/core';
import {JobEventsService} from '../services/job-events.service';
import {JobStore} from './job.store';
import {JobLogStore} from './job-log.store';
import {JobEvent} from '../models/job-event';
import {Observable, Subscription} from 'rxjs';
import {Job} from '../models/job';
import {TaskStore} from './task.store';

@Injectable({providedIn: 'root'})
export class JobEventsFacade {
  private sub?: Subscription;

  readonly totalRunningTasks$: Observable<number>;


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
        this.applyServerJob(e.payload!);
        break;

      case 'DELETED':
        this.jobStore.remove(e.jobId);
        break;

      case 'LOG':
        if (e.message) {
          this.logStore.append(e.jobId, e.message);
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

  private applyServerJob(serverJob: Job) {
    const jobId = serverJob.id;

    if (serverJob.status === 'FINISHED' || serverJob.status === 'ERROR') {
      this.taskStore.finishOne(jobId);
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
