import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JobService} from '../../core/services/job.service';
import {JobStore} from '../../core/state/job.store';
import {Job} from '../../core/models/job';
import {UiStateService} from '../../core/state/ui-state.service';
import {HttpEventType} from '@angular/common/http';
import {filter, switchMap, take, tap} from 'rxjs';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uploader-controls">
      <!-- Сброс value при клике позволяет перевыбирать тот же файл -->
      <input type="file" #fileInput 
             (change)="onFile($event)" 
             (click)="fileInput.value = ''"
             accept=".csv" 
             [disabled]="(uiState.isBusy$ | async) === true"
             style="display: none"/>
      
      <button (click)="fileInput.click()" 
              [disabled]="(uiState.isBusy$ | async) === true"
              class="browse-btn">
        Browse Big Data
      </button>

      <span class="file-name" *ngIf="file">{{ file.name }}</span>

      <button (click)="upload()" 
              [disabled]="!file || (uiState.isBusy$ | async) === true"
              class="create-btn">
        Create Job
      </button>
      
      <button (click)="repair()" 
              [disabled]="(uiState.isBusy$ | async) === true">
        Force Sync
      </button>
    </div>
  `,
  styles: [`
    .uploader-controls {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 32px;
      padding: 24px; /* Синхронизировано с job-grid */
      background: var(--bg-card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 20px; /* Синхронизировано с job-grid */
      border: 1px solid var(--glass-border);
      box-sizing: border-box;
      width: 100%;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .file-name {
      font-size: 14px;
      color: var(--text-secondary);
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px 12px;
      border-radius: 6px;
    }
    .browse-btn {
      background: #334155;
      color: #f8fafc;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
    }
    .browse-btn:hover:not(:disabled) {
      background: #475569;
      transform: translateY(-1px);
    }
    .create-btn {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .create-btn:hover:not(:disabled) {
      background: #4338ca;
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
      transform: translateY(-1px);
    }
    .force-btn {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--glass-border);
      padding: 10px 16px;
      border-radius: 8px;
      cursor: pointer;
    }
    .force-btn:hover:not(:disabled) {
      color: white;
      border-color: rgba(255,255,255,0.3);
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
    }
  `]
})
export class FileUploaderComponent {
  file?: File;

  constructor(
    private jobService: JobService, 
    private jobStore: JobStore,
    public uiState: UiStateService
  ) {}

  onFile(e: any) {
    this.file = e.target.files?.[0];
    // Никакого авто-старта здесь! Ждем нажатия Create Job.
  }

  upload() {
    if (!this.file) return;

    let msgId: number;
    const task$ = this.jobService.createJob(this.file).pipe(
      tap(event => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.uiState.updateProgress(msgId, progress);
          this.uiState.updateMessage(msgId, `Загрузка Big Data: ${progress}%`);
        } else if (event.type === HttpEventType.Response) {
          this.uiState.updateProgress(msgId, 100);
          this.uiState.updateMessage(msgId, 'Файл принят. Синхронизирую базу...');
          // Мы НЕ очищаем this.file, чтобы пользователь мог нажать еще раз
        }
      }),
      filter(event => event.type === HttpEventType.Response),
      take(1),
      tap(() => console.log('Uploader: Upload complete, starting Repair/Serialize...')),
      switchMap(() => this.jobService.repair()),
      tap(jobs => {
        console.log('Uploader: Table serialized, jobs count:', jobs.length);
        this.jobStore.setAll(jobs);
      })
    );

    this.uiState.run('Создание Job из файла', task$, ctx => msgId = ctx.id).subscribe();
  }

  repair() {
    this.uiState.run('Принудительная сериализация таблицы', 
      this.jobService.repair()
    ).subscribe(jobs => {
      this.jobStore.setAll(jobs);
    });
  }
}
