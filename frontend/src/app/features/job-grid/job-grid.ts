import {Component, OnInit, OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JobStore} from '../../core/state/job.store';
import {JobService} from '../../core/services/job.service';
import {Job} from '../../core/models/job';
import {Observable} from 'rxjs';
import {JobLogComponent} from '../job-grid/job-log';
import {JobEventsService} from '../../core/services/job-events.service';
import {JobEventsFacade} from '../../core/state/job-events.facade';
import {AnimatedCellComponent} from './animated-cell.component';
import {UiStateService} from '../../core/state/ui-state.service';
import {delay, filter, finalize, switchMap, takeUntil, tap} from 'rxjs';

@Component({
  selector: 'app-job-grid',
  standalone: true,
  imports: [CommonModule, JobLogComponent, AnimatedCellComponent],
  template: `
    <h2>Jobs (<span style="color: var(--accent-blue)">{{ totalRunningTasks$ | async }}</span> running)</h2>
    
    <div class="job-container">
      
      <div class="table-scroll-wrapper" *ngIf="(jobs$ | async)?.length; else emptyState">
        <table class="job-table">
          <thead>
          <tr>
          <th class="col-id">ID</th>
          <th class="col-file">Input File</th>
          <th class="col-status">Status</th>
          <th class="col-date">Created</th>
          <th class="col-date">Started</th>
          <th class="col-date">Finished</th>
          <th class="col-error">Error</th>
          <th class="col-actions">Actions</th>
        </tr>
        </thead>
        <tbody>
        <tr *ngFor="let job of jobs$ | async; trackBy: trackByJobId">
          <td>{{ job.id }}</td>
          <td style="color: var(--text-secondary)">{{ job.inputFileName }}</td>
          <td>
            <span class="status-badge" [ngClass]="job.status.toLowerCase()">
              <app-animated-cell [value]="job.status"></app-animated-cell>
            </span>
          </td>
          <td>{{ job.createdDate | date:'HH:mm:ss' }}</td>
          <td><app-animated-cell [value]="job.startedAt ? (job.startedAt | date:'HH:mm:ss') : '-'"></app-animated-cell></td>
          <td><app-animated-cell [value]="job.finishedAt ? (job.finishedAt | date:'HH:mm:ss') : '-'"></app-animated-cell></td>
          <td>
            <span class="error-text">
              <app-animated-cell [value]="job.errorMessage || ''"></app-animated-cell>
            </span>
          </td>
          <td>
            <button (click)="run(job)" 
                    class="action-btn run-btn"
                    [disabled]="!facade.canRun(job.id)">
              Run ({{ facade.getRunningCount(job.id) }})
            </button>
            
            <button (click)="toggleLog(job)" class="action-btn">Log</button>

            <button (click)="download(job)"
                    class="action-btn"
                    [disabled]="job.status === 'RUNNING' || !job.outputFileName">
              Output
            </button>
            
            <button (click)="delete(job)"
                    class="action-btn"
                    style="color: var(--accent-red); border-color: rgba(239, 68, 68, 0.2)"
                    [disabled]="job.status === 'RUNNING'">
              Delete
            </button>
            
            <app-job-log *ngIf="isLogOpen(job)" [jobId]="job.id"></app-job-log>
          </td>
        </tr>
        </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="icon">📁</div>
          <p>Ожидаю данные для анализа...</p>
          <span>Загрузите CSV файл в верхней панели, чтобы начать работу.</span>
        </div>
      </ng-template>

    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    h2 {
      flex-shrink: 0;
      margin-top: 0;
    }

    .job-container {
      width: 100%;
      flex: 1; /* ГЛАВНОЕ: занимает все доступное место */
      min-height: 0;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px;
      border: 1px solid var(--glass-border);
      padding: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }

    .table-scroll-wrapper {
      flex: 1; /* Занимает остаток внутри контейнера */
      min-height: 0; /* позволяет скроллиться внутри себя */
      overflow-y: auto;
      /* Тонкий скроллбар */
      scrollbar-width: thin;
      scrollbar-color: #475569 transparent;
    }
    .table-scroll-wrapper::-webkit-scrollbar {
      width: 8px;
    }
    .table-scroll-wrapper::-webkit-scrollbar-track {
      background: transparent;
    }
    .table-scroll-wrapper::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 4px;
    }

    .job-table {
      width: 100%;
      border-collapse: collapse; /* Убираем промежутки между строками */
      table-layout: fixed;
    }

    /* Настройка ширин колонок для стабильности */
    .col-id { width: 80px; text-align: center; }
    .col-file { width: 180px; }
    .col-status { width: 140px; text-align: center; }
    .col-date { width: 130px; text-align: center; }
    .col-error { width: auto; min-width: 180px; } 
    .col-actions { width: 370px; }

    .job-table th {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #1e293b; /* Непрозрачный фон шапки, чтобы не просвечивал контент при скролле */
      padding: 12px 10px;
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border-bottom: 2px solid var(--glass-border);
      border-right: 1px solid rgba(255, 255, 255, 0.15); /* Явный разделитель */
    }

    .job-table th:last-child { border-right: none; }

    /* Выравнивание заголовков согласно контенту */
    .job-table th.col-id, 
    .job-table th.col-status, 
    .job-table th.col-date { text-align: center; }

    .job-table td {
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--glass-border);
      border-right: 1px solid var(--glass-border); /* Разделитель в теле */
      font-size: 14px;
      vertical-align: middle;
    }

    .job-table td:last-child { border-right: none; }

    .job-table tr:hover td {
      background: rgba(255, 255, 255, 0.05);
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      border: 1px solid var(--glass-border);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      margin-right: 6px;
    }

    .action-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--accent-blue);
      color: var(--accent-blue);
    }

    .run-btn {
      background: rgba(59, 130, 246, 0.1);
      color: var(--accent-blue);
      border-color: rgba(59, 130, 246, 0.3);
    }
    
    .run-btn:hover:not(:disabled) {
      background: var(--accent-blue);
      color: white;
    }

    .error-text {
      color: var(--accent-red);
      font-size: 12px;
      opacity: 0.9;
    }

    .empty-state {
      padding: 60px;
      text-align: center;
      color: var(--text-secondary);
    }

    .empty-state .icon { font-size: 64px; margin-bottom: 20px; opacity: 0.5; }
    .empty-state p { font-size: 20px; color: var(--text-primary); margin: 0; }
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
    public facade: JobEventsFacade,
    public uiState: UiStateService
  ) {}

  ngOnInit(): void {
    this.jobs$ = this.jobStore.jobs$;
    this.totalRunningTasks$ = this.facade.totalRunningTasks$;
    this.jobEvents.connect();
    this.facade.init();
    
    // Авто-синхронизация при старте
    this.repair();
  }

  repair() {
    this.uiState.run('Синхронизация списка Jobs', 
      this.jobService.repair()
    ).subscribe(jobs => {
      this.jobStore.setAll(jobs);
    });
  }

  run(job: Job): void {
    let currentMsgId: number;

    const task$ = this.jobService.run(job.id).pipe(
      tap(res => {
        this.facade.startJob(job.id);
        if (currentMsgId) {
          this.facade.getExecutionLogs(res.executionId).pipe(
            takeUntil(this.facade.waitForExecution(job.id, res.executionId))
          ).subscribe(line => {
            this.uiState.updateMessage(currentMsgId, `Job ${job.id}: ${line}`);
          });
        }
      }),
      switchMap(res => this.facade.waitForExecution(job.id, res.executionId).pipe(delay(1500)))
    );

    this.uiState.run(`Фоновое выполнение Job ${job.id}`, task$, ctx => currentMsgId = ctx.id, {blocking: false}).subscribe();
  }

  delete(job: Job): void {
    this.uiState.run(`Удаление Job ${job.id}`, 
      this.jobService.delete(job.id).pipe(
        tap(() => this.jobStore.remove(job.id))
      )
    ).subscribe();
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
