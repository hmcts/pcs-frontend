export class OIDCError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'OIDCError';
  }
}

export class OIDCAuthenticationError extends OIDCError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR');
  }
}

export class OIDCCallbackError extends OIDCError {
  constructor(message: string) {
    super(message, 'CALLBACK_ERROR');
  }
}
