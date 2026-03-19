import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {map} from 'rxjs/operators';
import {Task} from '../models/task';

@Injectable({providedIn: 'root'})
export class TaskStore {
  private readonly _tasks = new BehaviorSubject<Task[]>([]);
  readonly tasks$ = this._tasks.asObservable();

  // ---- mutations ----

  add(task: Task) {
    this._tasks.next([...this._tasks.value, task]);
  }

  /** Finish exactly one running task for job */
  finishOne(jobId: string) {
    const idx = this._tasks.value.findIndex(
      t => t.jobId === jobId && t.status === 'RUNNING'
    );
    if (idx === -1) return;

    const copy = [...this._tasks.value];
    copy.splice(idx, 1);
    this._tasks.next(copy);
  }

  // ---- derived (sync) ----

  runningCountForJob(jobId: string): number {
    return this._tasks.value.filter(
      t => t.jobId === jobId && t.status === 'RUNNING'
    ).length;
  }

  // ---- derived (reactive) ----

  readonly totalRunning$ = this.tasks$.pipe(
    map(tasks => tasks.filter(t => t.status === 'RUNNING').length)
  );
}
