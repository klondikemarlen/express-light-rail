export class JobSkippedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "JobSkippedError"
  }
}
