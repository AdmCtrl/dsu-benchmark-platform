import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {Job} from '../models/job';

export interface JobDto {
  id: string;
  inputFileName: string;
  outputFileName?: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JobService {

  private base = '/api/jobs'; // прокси перенаправит на orchestrator

  constructor(private http: HttpClient) { }

  createJob(file: File): Observable<Job> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(this.base, fd).pipe(
      map(dto => new Job(dto))
    );
  }

  list(): Observable<Job[]> {
    return this.http.get<JobDto[]>(this.base).pipe(
      map(arr => arr.map(dto => new Job(dto)))
    );
  }

  get(id: string): Observable<Job> {
    return this.http.get<JobDto>(`${this.base}/${id}`).pipe(
      map(dto => new Job(dto))
    );
  }

  run(id: string, body: Record<string, unknown> = {}): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/run`, body || {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  log(id: string): Observable<string> {
    return this.http.get(`${this.base}/${id}/log`, {responseType: 'text'});
  }

  outputLink(id: string): string {
    return `${this.base}/${id}/output`;
  }

  repair(): Observable<Job[]> {
  return this.http.post<JobDto[]>(`${this.base}/repair`, {}).pipe(
    map(arr => arr.map(dto => new Job(dto)))
  );
}
}


