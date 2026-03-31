import {Injectable, NgZone} from '@angular/core';
import {BehaviorSubject, catchError, debounceTime, distinctUntilChanged, finalize, map, Observable, tap, throwError} from 'rxjs';
import {UiMessage, UiMessageType} from '../models/ui-state.model';

@Injectable({providedIn: 'root'})
export class UiStateService {
  private _busyCount = new BehaviorSubject<number>(0);
  private _messages = new BehaviorSubject<UiMessage[]>([]);
  private _msgCounter = 0;

  /** Поток количества активных задач */
  busyCount$ = this._busyCount.asObservable();

  /** Поток всех активных уведомлений */
  messages$ = this._messages.asObservable();

  /** 
   * Глобальный флаг занятости с защитой от фликера (debounce).
   * Выставляется в true только если задачи идут дольше 150мс.
   * Выключается в false мгновенно.
   */
  isBusy$: Observable<boolean>;

  constructor(private zone: NgZone) {
    this.isBusy$ = this.busyCount$.pipe(
      map(count => count > 0),
      distinctUntilChanged(),
      // Этот хитрый оператор задерживает передачу true, но мгновенно пропускает false
      debounceTime(150),
      // Если к этому моменту все задачи уже закончились — игнорируем "вспышку"
      map(() => this._busyCount.value > 0),
      distinctUntilChanged()
    );
  }

  run<T>(label: string, obs$: Observable<T>, onContext?: (ctx: {id: number}) => void, options: {blocking?: boolean} = {blocking: true}): Observable<T> {
    if (options.blocking) this.incrementBusy();
    const msgId = this.show(label, 'info', true);
    if (onContext) onContext({id: msgId});

    return obs$.pipe(
      tap({
        complete: () => {
          // При полном завершении потока: показываем успех
          this.updateMessage(msgId, `Успешно: ${label}`, 'success', false);
          // Успех исчезнет сам через 3 секунды (согласно ТЗ)
          this.scheduleDismiss(msgId, 3000);
        }
      }),
      catchError(err => {
        // При ошибке: заменяем на "липкую" ошибку
        const errorText = err?.error?.message || err?.message || 'Неизвестная ошибка';
        this.updateMessage(msgId, `Ошибка: ${label} — ${errorText}`, 'error', true);
        return throwError(() => err);
      }),
      finalize(() => {
        if (options.blocking) this.decrementBusy();
      })
    );
  }

  show(text: string, type: UiMessageType, sticky = false): number {
    const id = ++this._msgCounter;
    const msg: UiMessage = {id, text, type, sticky};
    this.zone.run(() => {
      this._messages.next([...this._messages.value, msg]);
    });

    if (!sticky) {
      this.scheduleDismiss(id, 5000);
    }
    return id;
  }

  removeMessage(id: number): void {
    this.zone.run(() => {
      this._messages.next(this._messages.value.filter(m => m.id !== id));
    });
  }

  /** Обновить текст и тип сообщения */
  updateMessage(id: number, text: string, type?: UiMessageType, sticky?: boolean): void {
    const list = this._messages.value.map(m =>
      m.id === id ? {...m, text, type: type ?? m.type, sticky: sticky ?? m.sticky} : m
    );
    this.zone.run(() => {
      this._messages.next(list);
    });
  }

  /** Обновить прогресс-бар */
  updateProgress(id: number, progress: number): void {
    const list = this._messages.value.map(m =>
      m.id === id ? {...m, progress} : m
    );
    this.zone.run(() => {
      this._messages.next(list);
    });
  }

  private incrementBusy(): void {
    this._busyCount.next(this._busyCount.value + 1);
  }

  private decrementBusy(): void {
    const nextValue = Math.max(0, this._busyCount.value - 1);
    this._busyCount.next(nextValue);
  }

  private scheduleDismiss(id: number, delay: number): void {
    setTimeout(() => this.removeMessage(id), delay);
  }
}
