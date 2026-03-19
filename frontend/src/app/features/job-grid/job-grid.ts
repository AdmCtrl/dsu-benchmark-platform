// src/app/features/jobs/components/job-grid/job-grid.ts
import {Component, OnInit, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JobStore} from '../../core/state/job.store';
import {JobService} from '../../core/services/job.service';
import {Job} from '../../core/models/job';
import {Observable} from 'rxjs';
import {JobLogComponent} from '../job-grid/job-log';
import {JobEventsService} from '../../core/services/job-events.service';
import {JobEventsFacade} from '../../core/state/job-events.facade';

@Component({
  selector: 'app-job-grid',
  standalone: true,
  imports: [CommonModule, JobLogComponent],
  template: `
    <h2>Jobs ({{ totalRunningTasks$ | async }} running)</h2>
    <table *ngIf="jobs$ | async as jobs" class="job-table">
      <thead>
      <tr>
        <th>ID</th>
        <th>Input File</th>
        <th>Status</th>
        <th>Created</th>
        <th>Started</th>
        <th>Finished</th>
        <th>Error</th>
        <th>Actions</th>
      </tr>
      </thead>
      <tbody>
      <tr *ngFor="let job of jobs; trackBy: trackByJobId">
        <td>{{ job.id }}</td>
        <td>{{ job.inputFileName }}</td>
        <td>{{ job.status }}</td>
        <td>{{ job.createdDate | date:'short' }}</td>
        <td>{{ job.startedAt ? (job.startedAt | date:'HH:mm:ss') : '-' }}</td>
        <td>{{ job.finishedAt ? (job.finishedAt | date:'HH:mm:ss') : '-' }}</td>
        <td style="color:red">{{ job.errorMessage || '' }}</td>
        <td>
          <button (click)="run(job)" [disabled]="!facade.canRun(job.id)">
            Run ({{ facade.getRunningCount(job.id) }})
          </button>
          <button
            (click)="download(job)"
            [disabled]="job.status === 'RUNNING'">
            Get Output
          </button>
          <button (click)="toggleLog(job)">Log</button>
          <button
            (click)="delete(job)"
            [disabled]="job.status === 'RUNNING'">
            Delete
          </button>
          <app-job-log *ngIf="isLogOpen(job)" [jobId]="job.id"></app-job-log>
        </td>
      </tr>
      </tbody>
    </table>
  `,
  styles: [`
    .job-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      table-layout: auto;
    }

    .job-table th, .job-table td {
      border: 1px solid #ccc;
      padding: 4px 8px;
      text-align: left;
    }

    .job-table th:nth-child(1), .job-table td:nth-child(1),
    .job-table th:nth-child(3), .job-table td:nth-child(3),
    .job-table th:nth-child(4), .job-table td:nth-child(4),
    .job-table th:nth-child(5), .job-table td:nth-child(5),
    .job-table th:nth-child(6), .job-table td:nth-child(6) {
      white-space: nowrap;
      width: 0%;
    }

    .job-table th:nth-child(2), .job-table td:nth-child(2) {
      white-space: nowrap;
      width: 7%;
      min-width: 130px;
    }

    .job-table th:nth-child(7), .job-table td:nth-child(7) {
      white-space: nowrap;
      width: 10%;
    }

    .job-table th:nth-child(8), .job-table td:nth-child(8) {
      width: auto;
      min-width: 230px;
    }

    .job-table th {
      background: #d7e2f1;
    }

    button {
      margin-right: 4px;
    }

    button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class JobGridComponent implements OnInit, OnDestroy {
  jobs$!: Observable<Job[]>;
  totalRunningTasks$!: Observable<number>;
  private openLogIds = new Set<string>();

  constructor(
    private jobStore: JobStore,
    private jobService: JobService,
    private jobEvents: JobEventsService,
    public facade: JobEventsFacade
  ) {}

  ngOnInit(): void {
    this.jobs$ = this.jobStore.jobs$;
    this.totalRunningTasks$ = this.facade.totalRunningTasks$;
    this.jobEvents.connect();
    this.facade.init();

  }

  run(job: Job): void {
    this.facade.startJob(job.id);
    this.jobService.run(job.id).subscribe();
  }

  delete(job: Job): void {
    this.jobService.delete(job.id).subscribe();
  }

  toggleLog(job: Job) : void {
    this.openLogIds.has(job.id)
      ? this.openLogIds.delete(job.id)
      : this.openLogIds.add(job.id);
  }

  download(job: Job): void {
    if (!job.outputFileName) return;
    window.open(this.jobService.outputLink(job.id), '_blank');
  }

  isLogOpen(job: Job): boolean {
    return this.openLogIds.has(job.id);
  }

  trackByJobId(index: number, job: Job): string {
    return job.id;
  }

  ngOnDestroy(): void {
    this.facade.destroy();
    this.jobEvents.disconnect();
  }
}
