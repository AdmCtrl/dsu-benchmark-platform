import {Injectable, NgZone} from '@angular/core';
import {Observable, ReplaySubject, Subject, BehaviorSubject} from 'rxjs';
import {JobEvent} from '../models/job-event';
import {JobLogStore} from '../state/job-log.store';

@Injectable({providedIn: 'root'})
export class JobEventsService {
  private eventsSubject = new ReplaySubject<JobEvent>(20);
  public readonly events$ = this.eventsSubject.asObservable();
  
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public readonly isConnected$ = this.connectedSubject.asObservable();
  
  private es?: EventSource;
  private readonly url = '/api/jobs/events';

  constructor(private zone: NgZone) {}

  connect(): void {
    if (this.es) return;
    this.es = new EventSource(this.url);
    
    this.es.onopen = () => {
      this.zone.run(() => this.connectedSubject.next(true));
    };

    this.es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as JobEvent;
        this.zone.run(() => this.eventsSubject.next(data));
      } catch (e) {
        console.error('❌ SSE parse error', event.data);
      }
    };
    
    this.es.onerror = () => {
      this.zone.run(() => this.connectedSubject.next(false));
    };

    // Надежный вочдог: EventSource может не замечать "молчаливый" разрыв связи.
    // Пингуем бекенд, чтобы точно знать, жив ли Spring.
    this.pingInterval = setInterval(() => {
      fetch('/api/jobs', { method: 'HEAD' })
        .then(res => {
          this.zone.run(() => this.connectedSubject.next(res.ok));
        })
        .catch(() => {
          this.zone.run(() => this.connectedSubject.next(false));
        });
    }, 3000);
  }

  private pingInterval: any;

  disconnect(): void {
    this.es?.close();
    this.es = undefined;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.connectedSubject.next(false);
  }
}
