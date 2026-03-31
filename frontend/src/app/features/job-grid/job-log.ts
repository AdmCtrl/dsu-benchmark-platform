import { Component, Input, OnInit, ElementRef, ViewChild, OnDestroy, AfterViewInit, NgZone } from '@angular/core';
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
      margin-top: 8px;
      height: 65px;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.6);
      padding: 10px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 11px;
      box-sizing: border-box;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: background-color 0.8s ease; /* ВОЗВРАЩЕНО */
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }

    .log-container::-webkit-scrollbar { width: 4px; }
    .log-container::-webkit-scrollbar-track { background: transparent; }
    .log-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

    .log-container.highlight {
      background-color: rgba(59, 130, 246, 0.15) !important;
      border-color: rgba(59, 130, 246, 0.4);
    }

    pre, h4 {
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.5;
      color: #94a3b8;
    }

    h4 {
      margin-bottom: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent-blue);
      opacity: 0.8;
    }
  `]
})
export class JobLogComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() jobId!: string;
  @ViewChild('logContainer') logContainer!: ElementRef<HTMLDivElement>;
  logs$!: Observable<string[]>;
  private scrollSpeed = 800;
  private isScrolling = false;
  private needsScrollAfter = false;
  private highlightTimeout: any = null;

  private onScroll = () => {
    const container = this.logContainer.nativeElement;
    const scrollTop = container.scrollTop;

    // Сохраняем позицию (для восстановления при повторном открытии)
    if (scrollTop > 0) {
      this.jobLogStore.setScroll(this.jobId, Math.round(scrollTop));
    }

    // Пока идёт программная анимация — не трогаем флаг намерения пользователя
    if (this.isScrolling) return;

    // Пользователь в самом низу (погрешность 2px) → автоскролл включить
    // Пользователь отмотал вверх → автоскролл заморозить
    const isAtBottom = container.scrollHeight - container.clientHeight - scrollTop < 2;
    this.jobLogStore.setUserScrolledUp(this.jobId, !isAtBottom);
  };

  constructor(private jobLogStore: JobLogStore, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.logs$ = this.jobLogStore.logsFor(this.jobId).pipe(
      startWith([] as string[]),
      pairwise(),
      tap(([prev, curr]) => {
        const action = this.jobLogStore.resolveScrollAction(this.jobId, prev, curr);

        if (action === 'RESTORE') {
          const saved = this.jobLogStore.getScroll(this.jobId);
          if (saved !== undefined) {
            requestAnimationFrame(() => {
              this.logContainer.nativeElement.scrollTop = saved;
            });
          }
          return;
        }

        if (action === 'SCROLL_TO_BOTTOM') {
          // Вся анимация и подсветка — нетронуты, живут в handleNewLine()
          requestAnimationFrame(() => this.handleNewLine());
        }
      }),
      map(([_, curr]) => curr)
    );
  }


  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.logContainer.nativeElement.addEventListener('scroll', this.onScroll);
    });
  }


  ngOnDestroy(): void {
    if (this.highlightTimeout) {
      clearTimeout(this.highlightTimeout);
    }
    if (this.logContainer?.nativeElement) {
      this.logContainer.nativeElement.removeEventListener('scroll', this.onScroll);
    }
  }

  private handleNewLine(): void {
    if (!this.logContainer?.nativeElement) return;

    // Если анимация уже идёт — не стартуем вторую. Через флаг запросим повторный скролл после её окончания
    if (this.isScrolling) {
      this.needsScrollAfter = true;
      return;
    }

    const container = this.logContainer.nativeElement;

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        void container.offsetHeight;

        container.classList.remove('highlight');
        void container.offsetHeight;
        container.classList.add('highlight');

        const target = container.scrollHeight - container.clientHeight;

        if (Math.abs(target - container.scrollTop) < 1) {
          container.scrollTop = target;
          if (this.highlightTimeout) clearTimeout(this.highlightTimeout);
          this.highlightTimeout = setTimeout(() => container.classList.remove('highlight'), 800);
          this.isScrolling = false;
          this.maybeScrollAgain();
          return;
        }

        this.isScrolling = true;
        const start = container.scrollTop;
        const startTime = performance.now();

        // Адаптивный duration: для малой разницы — короче (200–400ms), для большой — полный 800ms
        const diff = target - start;
        const duration = Math.min(this.scrollSpeed, Math.max(600, diff * 2));

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
            this.maybeScrollAgain();
          }
        };

        requestAnimationFrame(animate);
      }, 0);
    });
  }

  /** Если за время анимации пришли новые строки — докручиваем до нового дна */
  private maybeScrollAgain(): void {
    if (this.needsScrollAfter) {
      this.needsScrollAfter = false;
      requestAnimationFrame(() => this.handleNewLine());
    }
  }
}
