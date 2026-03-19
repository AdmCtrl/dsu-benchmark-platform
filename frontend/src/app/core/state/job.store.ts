import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Job} from '../models/job';

@Injectable({providedIn: 'root'})
export class JobStore {
  remove(id: string) {
    this._jobs.next(
      this._jobs.value.filter(j => j.id !== id)
    );
  }

  private readonly _jobs = new BehaviorSubject<Job[]>([]);
  readonly jobs$ = this._jobs.asObservable();

  add(job: Job) {
    this._jobs.next([...this._jobs.value, job]);
  }

  update(job: Job) {
    const updated = this._jobs.value.map(j => {
      if (j.id === job.id) {
        Object.assign(j, job); // мутируем существующий
        return j;
      }
      return j;
    });
    this._jobs.next([...updated]); // новый массив
  }

  setAll(jobs: Job[]) {
    this._jobs.next(jobs);
  }

  getJob(id: string): Job | undefined {
    return this._jobs.value.find(j => j.id === id);
  }
}
