export class HTTPError extends Error {
  status: number;
  retryAfter?: string;

  constructor(message: string, status: number, retryAfter?: string) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** CCD refused an event because the service's callback rejected it, giving these reasons. */
export class CallbackRejectedError extends HTTPError {
  readonly reasons: string[];

  constructor(reasons: string[], status: number) {
    super(`CCD callback rejected request: ${reasons.join('; ')}`, status);
    this.reasons = reasons;
  }
}
