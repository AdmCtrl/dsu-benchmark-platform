export class Job {
  id!: string;
  inputFileName!: string;
  outputFileName?: string;
  status!: string;
  createdAt!: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;

  constructor(dto: any) {
    Object.assign(this, dto);
  }

  get isDone(): boolean {
    return this.status === 'FINISHED';
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  get createdDate(): Date {
    return new Date(this.createdAt);
  }
}
