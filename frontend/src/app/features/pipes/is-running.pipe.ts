import { Pipe, PipeTransform } from '@angular/core';
import { Job } from '../../core/models/job';

@Pipe({
  name: 'jobStatus',
  pure: true,
  standalone: true
})
export class JobStatusPipe implements PipeTransform {
  transform(job: Job, runningJobIds: Set<string>): {
    isRunning: boolean;
    canDownload: boolean;
    canDelete: boolean;
  } {
    const isRunning = runningJobIds.has(job.id);
    return {
      isRunning,
      canDownload: !isRunning && !!job.outputFileName,
      canDelete: !isRunning
    };
  }
}
