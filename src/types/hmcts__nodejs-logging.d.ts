declare module '@hmcts/nodejs-logging' {
  export class Logger {
    static getLogger(name: string): Logger;
    info(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    errorWithReq(...args: any[]): void;
  }
}

// Ensure the module is properly recognized
export {};
