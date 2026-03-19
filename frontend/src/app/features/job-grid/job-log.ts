import { Component, Input, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewChecked, AfterViewInit } from '@angular/core';
import {CommonModule} from '@angular/common';
import {Observable, map, startWith, tap, pairwise} from 'rxjs';
import {JobLogStore} from '../../core/state/job-log.store';

@Component({
  selector: 'app-job-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="log-container" #logContainer>
      <h4>Log for job {{ jobId }}</h4>
      <ng-container *ngIf="logs$ | async as logs">
        <pre *ngFor="let line of logs">{{ line }}</pre>
      </ng-container>
    </div>
  `,
  styles: [`
    .log-container {
      margin: 2px;
      height: 50px;
      overflow-y: auto;
      background: #f8f8f8;
      padding: 0;
      font-family: monospace;
      font-size: 12px;
      box-sizing: border-box;
      transition: background-color 0.8s ease;
      border-radius: 4px;
    }

    .log-container.highlight {
      background-color: #c8efe3;
    }

    pre, h4 {
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.3;
    }

    h4 {
      margin-bottom: 0.3px;
      font-size: 13px;
      opacity: 0.8;
    }
  `]
})
export class JobLogComponent implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit {
  @Input() jobId!: string;
  @ViewChild('logContainer') logContainer!: ElementRef<HTMLDivElement>;
  logs$!: Observable<string[]>;
  private scrollSpeed = 800;
  private isScrolling = false;
  private highlightTimeout: any = null;
  private shouldRestoreScroll = true;

  private onScroll = () => {
    const container = this.logContainer.nativeElement;
    const scrollTop = container.scrollTop;
    if (scrollTop > 0) {
      this.jobLogStore.setScroll(this.jobId, Math.round(scrollTop));
    }
  };

  constructor(private jobLogStore: JobLogStore) {}

  ngOnInit(): void {
  this.logs$ = this.jobLogStore.logsFor(this.jobId).pipe(
    startWith([] as string[]),
    pairwise(),
    tap(([prev, curr]) => {

      // 1️⃣ восстановление скролла при первом появлении логов
      if (prev.length === 0 && curr.length > 0) {
        const saved = this.jobLogStore.getScroll(this.jobId);
        if (saved !== undefined) {
          requestAnimationFrame(() => {
            this.logContainer.nativeElement.scrollTop = saved;
          });
        }
        return;
      }

      // 2️⃣ автоскролл при новых строках
      if (curr.length > prev.length) {
        requestAnimationFrame(() => this.handleNewLine());
      }
    }),
    map(([_, curr]) => curr)
  );
}


  ngAfterViewInit(): void {
    this.logContainer.nativeElement
    .addEventListener('scroll', this.onScroll);
  }

  ngAfterViewChecked(): void {
    if (this.shouldRestoreScroll && this.logContainer) {
      const saved = this.jobLogStore.getScroll(this.jobId);
      if (saved !== undefined && saved > 0) {
        requestAnimationFrame(() => {
          this.logContainer.nativeElement.scrollTop = saved;
        });
        this.shouldRestoreScroll = false;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    this.shouldRestoreScroll = true;
  }

  private handleNewLine(): void {
    if (!this.logContainer?.nativeElement) return;

    const container = this.logContainer.nativeElement;

    setTimeout(() => {
      void container.offsetHeight;

      container.classList.remove('highlight');
      void container.offsetHeight;
      container.classList.add('highlight');

      const target = container.scrollHeight - container.clientHeight;

      if (Math.abs(target - container.scrollTop) < 1) { // теперь <1, чтобы всегда подсвечивать
        container.scrollTop = target;
        if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
        this.highlightTimeout = setTimeout(() => container.classList.remove('highlight'), 800);
        this.isScrolling = false;
        return;
      }

      this.isScrolling = true;
      const start = container.scrollTop;
      const startTime = performance.now();

      // Адаптивный duration: для малой разницы — короче (200–400ms), для большой — полный 800ms
      const diff = target - start;
      const duration = Math.min(this.scrollSpeed, Math.max(600, diff * 2)); // пример: 20px → 200ms, 400px → 800ms

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const ease = progress < 0.8
          ? 0.5 * progress
          : 0.4 + 0.6 * ((progress - 0.8) / 0.2);

        container.scrollTop = start + diff * ease;

        if (progress < 1 && this.isScrolling) {
          requestAnimationFrame(animate);
        } else {
          this.isScrolling = false;
          if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
          this.highlightTimeout = setTimeout(() => container.classList.remove('highlight'), 300);
        }
      };

      requestAnimationFrame(animate);
    }, 0);
  }
}
