import {Injectable} from "@angular/core";
import {BehaviorSubject, Observable, of} from "rxjs";

export type ScrollAction =
  | 'NONE'
  | 'RESTORE'
  | 'SCROLL_TO_BOTTOM';

@Injectable({ providedIn: 'root' })
export class JobLogStore {
  private readonly logs = new Map<string, BehaviorSubject<string[]>>();
  private readonly scrollPositions = new Map<string, number>();

  // -------- logs --------

  logsFor(jobId: string): Observable<string[]> {
    if (!this.logs.has(jobId)) {
      this.logs.set(jobId, new BehaviorSubject<string[]>([]));
    }
    return this.logs.get(jobId)!.asObservable();
  }

  append(jobId: string, line: string) {
    if (!this.logs.has(jobId)) {
      this.logs.set(jobId, new BehaviorSubject<string[]>([]));
    }
    const subject = this.logs.get(jobId)!;
    subject.next([...subject.value, line]);
  }

  clearLogs(jobId: string) {
    this.logs.delete(jobId);
    this.scrollPositions.delete(jobId);
  }

  // -------- scroll --------

  setScroll(jobId: string, value: number) {
    this.scrollPositions.set(jobId, value);
  }

  getScroll(jobId: string): number | undefined {
    return this.scrollPositions.get(jobId);
  }
}
