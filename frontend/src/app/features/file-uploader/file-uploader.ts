import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {JobService} from '../../core/services/job.service';
import {JobStore} from '../../core/state/job.store';
import {Job} from '../../core/models/job';
import {BehaviorSubject, Observable} from 'rxjs';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <input type="file" (change)="onFile($event)" accept=".csv" [disabled]="(busy$ | async) === true"/>
    <button (click)="upload()" [disabled]="!file || ((busy$ | async) === true)">Create Job</button>
    <button (click)="repair()" [disabled]="!file || ((busy$ | async) === true)">Repair Jobs</button>
    <div *ngIf="message$ | async as msg">{{ msg }}</div>
  `
})
export class FileUploaderComponent {
  file?: File;
  private _message = new BehaviorSubject<string>('');
  private _busy = new BehaviorSubject<boolean>(false);
  message$: Observable<string> = this._message.asObservable();
  busy$ = this._busy.asObservable();

  constructor(private jobService: JobService, private jobStore: JobStore) {}

  onFile(e: any) {
    this.file = e.target.files?.[0];
  }

  upload() {
    if (!this.file) return;

    this._busy.next(true);
    this._message.next('Ожидаем ответ с сервера...');
    this.jobService.createJob(this.file).subscribe({
      next: job => {
        this.jobStore.add(new Job(job));
        this._message.next(`Job created: ${job.id}`);
        this._busy.next(false);
      },
      error: err => {
        this._message.next('Error: ' + (err?.message || err));
        this._busy.next(false);
      }
    });
  }

  repair() {
    this._message.next('Синхронизация Jobs...');
    this.jobService.repair().subscribe({
      next: jobs => {
        this.jobStore.setAll(jobs);
        this._message.next(`Repair completed: ${jobs.length} jobs`);
      },
      error: err => {
        this._message.next('Repair error: ' + (err?.message || err));
      }
    });
  }
}
