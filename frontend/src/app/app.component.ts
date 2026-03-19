import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FileUploaderComponent } from './features/file-uploader/file-uploader';
import { JobGridComponent } from './features/job-grid/job-grid';
import { JobEventsService } from './core/services/job-events.service';
import { JobLogStore } from './core/state/job-log.store';

@Component({
  selector: 'app-root',
  template: `
    <h1>DSU Benchmark Platform</h1>
    <app-file-uploader #uploader></app-file-uploader>
    <app-job-grid></app-job-grid>
<!--        <app-job-grid [busy]="(uploader.busy$ | async) ?? false"></app-job-grid>-->
  `,
  standalone: true,
  imports: [FileUploaderComponent, JobGridComponent]
//     imports: [FileUploaderComponent, JobGridComponent, AsyncPipe]
})
export class AppComponent {
  constructor(  private events: JobEventsService, private jobLogStore: JobLogStore) {}

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


