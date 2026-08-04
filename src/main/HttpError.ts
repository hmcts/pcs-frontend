export class HTTPError extends Error {
  status: number;
  retryAfter?: string;

  constructor(message: string, status: number, retryAfter?: string) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
