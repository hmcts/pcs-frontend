declare module '@hmcts/nodejs-healthcheck' {
  const healthcheck: {
    addTo(app: import('express').Application, config: Record<string, unknown>): void;
    configure(config: unknown): void;
    up(): unknown;
    down(): unknown;
    status(healthy: boolean): unknown;
    web(url: string, options?: Record<string, unknown>): unknown;
    raw(check: () => Promise<unknown> | unknown): unknown;
  };
  export default healthcheck;
}
