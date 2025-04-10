declare module '@hmcts/nodejs-logging' {
  export class Logger {
    static getLogger(name: string): Logger;
    info(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    debug(...args: any[]): void;
    errorWithReq(...args: any[]): void;
  }
}
