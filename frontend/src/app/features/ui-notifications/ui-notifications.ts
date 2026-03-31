import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {UiStateService} from '../../core/state/ui-state.service';
import {UiMessage} from '../../core/models/ui-state.model';
import {Observable, tap, map} from 'rxjs';
import {ChangeDetectorRef} from '@angular/core';

import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-ui-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div *ngFor="let msg of messages$ | async; trackBy: trackById" 
           [@fadeSlide]
           [class]="'notification ' + msg.type"
           [id]="'msg-' + msg.id">
        <div class="msg-content">
          <span class="message-text">{{ msg.text }}</span>
          <div *ngIf="msg.progress !== undefined" class="progress-container">
            <div class="progress-bar" [style.width.%]="msg.progress"></div>
            <span class="progress-text">{{ msg.progress }}%</span>
          </div>
        </div>
        <button class="close-btn" (click)="close(msg.id)">×</button>
      </div>
    </div>
  `,
  styleUrls: ['./ui-notifications.css'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateX(100%)', 
          height: 0, 
          marginTop: 0, 
          marginBottom: 0, 
          paddingTop: 0, 
          paddingBottom: 0,
          overflow: 'hidden' 
        }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ 
            opacity: 1, 
            transform: 'translateX(0)', 
            height: '*', 
            marginTop: '*', 
            marginBottom: '*', 
            paddingTop: '*', 
            paddingBottom: '*' 
          }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', 
          style({ opacity: 0, transform: 'translateY(-100%)', height: 0, marginTop: 0, marginBottom: 0, padding: 0 }))
      ])
    ])
  ]
})
export class UiNotificationsComponent {
  messages$: Observable<UiMessage[]>;

  constructor(private uiState: UiStateService, private cd: ChangeDetectorRef) {
    this.messages$ = this.uiState.messages$.pipe(
      map(msgs => [...msgs].reverse()),
      tap(() => this.cd.detectChanges())
    );
  }

  trackById(index: number, msg: UiMessage): number {
    return msg.id;
  }

  close(id: number): void {
    this.uiState.removeMessage(id);
  }
}
