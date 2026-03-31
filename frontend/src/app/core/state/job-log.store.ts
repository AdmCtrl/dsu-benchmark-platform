import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable} from "rxjs";

export type ScrollAction = 'NONE' | 'RESTORE' | 'SCROLL_TO_BOTTOM';

/**
 * Внутренняя очередь запусков для одного jobId.
 * "Кто первый прислал лог — того и показываем. Остальные ждут."
 */
interface ExecutionQueue {
  /** executionId-ы в порядке первого появления лога */
  order: string[];
  /** Активный executionId (чьи логи сейчас на экране). null — ещё никого */
  active: string | null;
  /** Буфер строк для неактивных запусков */
  buffers: Map<string, string[]>;
  /** Запуска которые прислали UPDATED(FINISHED) — то есть уже закончили работу */
  finished: Set<string>;
}

@Injectable({providedIn: 'root'})
export class JobLogStore {
  private readonly displayedLogs = new Map<string, BehaviorSubject<string[]>>();
  private readonly queues = new Map<string, ExecutionQueue>();
  private readonly scrollPositions = new Map<string, number>();
  private readonly userScrolledUp = new Map<string, boolean>();

  // -------- публичное API логов --------

  /** Реактивный поток строк для отображения в компоненте (только активный запуск) */
  logsFor(jobId: string): Observable<string[]> {
    return this.getDisplaySubject(jobId).asObservable();
  }

  /**
   * Добавить строку от конкретного запуска.
   * - Первый запуск, приславший лог → становится активным, строки идут на экран
   * - Активный запуск → строки идут на экран немедленно (live stream)
   * - Любой другой запуск → строки буферизуются до своей очереди
   */
  append(jobId: string, executionId: string | undefined, line: string): void {
    if (!executionId) {
      // Fallback для событий без executionId (не должно происходить с новым бэкендом)
      this.pushLine(jobId, line);
      return;
    }

    const q = this.getQueue(jobId);

    if (!q.active) {
      q.active = executionId;
      if (q.order.includes(executionId)) {
        // executionId уже знаком (был в буфере, но active сброшен) — просто стримим
        this.pushLine(jobId, line);
      } else {
        // Новый executionId
        q.order.push(executionId);
        if (q.order.length > 1) {
          // Не первый запуск — были предыдущие. Добавляем сепаратор.
          // (Гонка: advanceQueue не нашёл его в очереди, т.к. он ещё не логировал)
          const runNumber = q.order.length;
          const separator = `──── Run #${runNumber} ─────────────────────────────────────────`;
          const subj = this.getDisplaySubject(jobId);
          subj.next([...subj.value, separator]);
        }
        this.pushLine(jobId, line);
      }
    } else if (q.active === executionId) {
      // Активный запуск → показываем live
      this.pushLine(jobId, line);
    } else {
      // Другой запуск → буферизуем
      if (!q.order.includes(executionId)) {
        q.order.push(executionId);
      }
      const buf = q.buffers.get(executionId) ?? [];
      buf.push(line);
      q.buffers.set(executionId, buf);
    }
  }

  /**
   * Пометить запуск как завершённый (вызывается при UPDATED-событии с executionId).
   * Если этот запуск был активным — переключаемся на следующий в очереди.
   */
  markExecutionFinished(jobId: string, executionId: string): void {
    const q = this.getQueue(jobId);
    q.finished.add(executionId);
    if (q.active === executionId) {
      this.advanceQueue(jobId);
    }
  }

  clearLogs(jobId: string): void {
    this.displayedLogs.delete(jobId);
    this.queues.delete(jobId);
    this.scrollPositions.delete(jobId);
    this.userScrolledUp.delete(jobId);
  }

  // -------- scroll position --------

  setScroll(jobId: string, value: number): void {
    this.scrollPositions.set(jobId, value);
  }

  getScroll(jobId: string): number | undefined {
    return this.scrollPositions.get(jobId);
  }

  // -------- user scroll intent --------

  /** Компонент сообщает: пользователь отмотал вверх (true) или вернулся вниз (false) */
  setUserScrolledUp(jobId: string, value: boolean): void {
    this.userScrolledUp.set(jobId, value);
  }

  isUserScrolledUp(jobId: string): boolean {
    return this.userScrolledUp.get(jobId) ?? false;
  }

  // -------- scroll decision (чистая логика, без DOM) --------

  resolveScrollAction(jobId: string, prev: string[], curr: string[]): ScrollAction {
    if (prev.length === 0 && curr.length > 0) return 'RESTORE';
    if (curr.length > prev.length && !this.isUserScrolledUp(jobId)) return 'SCROLL_TO_BOTTOM';
    return 'NONE';
  }

  // -------- private --------

  private getDisplaySubject(jobId: string): BehaviorSubject<string[]> {
    if (!this.displayedLogs.has(jobId)) {
      this.displayedLogs.set(jobId, new BehaviorSubject<string[]>([]));
    }
    return this.displayedLogs.get(jobId)!;
  }

  private getQueue(jobId: string): ExecutionQueue {
    if (!this.queues.has(jobId)) {
      this.queues.set(jobId, {
        order: [],
        active: null,
        buffers: new Map(),
        finished: new Set()
      });
    }
    return this.queues.get(jobId)!;
  }

  private pushLine(jobId: string, line: string): void {
    const subj = this.getDisplaySubject(jobId);
    subj.next([...subj.value, line]);
  }

  /**
   * Перейти к следующему запуску в очереди.
   * Добавляет визуальный разделитель, сбрасывает буфер нового активного запуска.
   */
  private advanceQueue(jobId: string): void {
    const q = this.getQueue(jobId);
    const currentIndex = q.active !== null ? q.order.indexOf(q.active) : -1;
    const nextId = q.order[currentIndex + 1];

    if (!nextId) {
      q.active = null;
      return;
    }

    q.active = nextId;

    const runNumber = currentIndex + 2; // 1-indexed
    const separator = `──── Run #${runNumber} ─────────────────────────────────────────`;

    // Сбрасываем буфер следующего запуска вместе с разделителем — одна эмиссия
    const buffered = q.buffers.get(nextId) ?? [];
    q.buffers.delete(nextId);

    const subj = this.getDisplaySubject(jobId);
    subj.next([...subj.value, separator, ...buffered]);

    // Если этот запуск тоже уже завершён (финишировал пока ждал) — движемся дальше
    if (q.finished.has(nextId)) {
      this.advanceQueue(jobId);
    }
  }
}
