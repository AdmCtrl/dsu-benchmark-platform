import {Injectable, NgZone} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {JobEvent} from '../models/job-event';
import {JobLogStore} from '../state/job-log.store';

@Injectable({providedIn: 'root'})
export class JobEventsService {
  private eventsSubject = new Subject<JobEvent>();
  public readonly events$ = this.eventsSubject.asObservable();
  private es?: EventSource;
  private readonly url = '/api/jobs/events';

  constructor(private zone: NgZone) {}

  connect(): void {
    if (this.es) return;
    this.es = new EventSource(this.url);
    this.es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        this.zone.run(() => this.eventsSubject.next(data));
      } catch (e) {
        console.error('❌ SSE parse error', event.data);
      }
    };
    this.es.onerror = () => {
      this.disconnect();
    };
  }

  disconnect(): void {
    this.es?.close();
    this.es = undefined;
  }
}
