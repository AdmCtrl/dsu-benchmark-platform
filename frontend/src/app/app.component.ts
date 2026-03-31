import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FileUploaderComponent } from './features/file-uploader/file-uploader';
import { JobGridComponent } from './features/job-grid/job-grid';
import { UiNotificationsComponent } from './features/ui-notifications/ui-notifications';
import { JobEventsService } from './core/services/job-events.service';
import { JobLogStore } from './core/state/job-log.store';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-layout">
      <header class="app-header">
        <div class="header-left">
          <div class="status-indicator" [class.offline]="!(events.isConnected$ | async)">
            <span class="pulse"></span>
            {{ (events.isConnected$ | async) ? 'Live Monitoring Active' : 'Server Offline / Connecting...' }}
          </div>
        </div>
        <div class="header-center">
          <h1 class="gradient-text">DSU Benchmark Platform</h1>
        </div>
        <div class="header-right"></div>
      </header>
      
      <main class="app-content">
        <app-file-uploader #uploader></app-file-uploader>
        <app-job-grid></app-job-grid>
      </main>
      
      <app-ui-notifications></app-ui-notifications>
    </div>
  `,
  styles: [`
    .app-layout {
      height: 100vh;  /* FIXED HEIGHT TO 100VH TO AVOID GLOBAL SCROLL */
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
    }
    
    .app-header {
      width: 100%;
      max-width: 1400px;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      margin-bottom: 24px;
      flex-shrink: 0;
    }
    
    .header-left { display: flex; justify-content: flex-start; }
    .header-center { display: flex; justify-content: center; }
    .header-right { display: flex; justify-content: flex-end; }
    
    .gradient-text {
      font-size: 32px;
      margin: 0;
      background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 700;
    }
    
    .app-content {
      width: 100%;
      max-width: 1400px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      flex: 1;       /* ВАЖНО: забирает всю высоту */
      min-height: 0; /* позволяет потомкам сжиматься */
    }

    app-file-uploader {
      display: block;
      width: 100%;
      flex-shrink: 0; /* панель загрузки не сжимается */
    }
    
    app-job-grid {
      display: flex;
      flex-direction: column;
      width: 100%;
      flex: 1;       /* таблица занимает все остальное место */
      min-height: 0;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.05);
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid var(--glass-border);
      transition: all 0.5s ease-in-out; /* Плавная смена статуса */
    }
    
    .pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
      animation: pulse-animation 2s infinite;
      transition: background 0.5s ease-in-out, box-shadow 0.5s ease-in-out;
    }

    .status-indicator.offline {
      color: #fca5a5;
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .status-indicator.offline .pulse {
      background: #ef4444;
      animation: none;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    }
    
    @keyframes pulse-animation {
      0% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
    }
  `],
  standalone: true,
  imports: [FileUploaderComponent, JobGridComponent, UiNotificationsComponent, AsyncPipe]
})
export class AppComponent {
  constructor(public events: JobEventsService, private jobLogStore: JobLogStore) {}

  ngOnInit() {
  this.events.connect();

  // this.events.events$.subscribe(e => {
  //   if (e.type === 'LOG' && e.message) {
  //     this.jobLogStore.append(e.jobId, e.message);
  //     console.log(`месага: ${e.message}`);
  //   }
  // });
}
}


