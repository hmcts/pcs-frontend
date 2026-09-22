export enum ApplicationErrorCode {
  noApplicationIdInSession = 'noApplicationIdInSession',
  documentNotAvailable = 'documentNotAvailable',
}

export class ApplicationError extends Error {
  errorCode: ApplicationErrorCode;

  constructor(message: string, errorCode: ApplicationErrorCode) {
    super(message);
    this.errorCode = errorCode;
  }
}
