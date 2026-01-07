export class Logger implements TLogger {
  scope: string;
  clear: boolean;
  style?: string;

  constructor(scope: string, clear: boolean = false, style?: string) {
    this.scope = scope;
    this.clear = clear;
    this.style = style;

    if (this.clear) console.clear();
  }

  formatArgs(args: any[], color: string) {
    return [
      `%c[${this.scope}]:`,
      `color: ${color}; font-weight: bold;`,
      ...args,
    ];
  }

  log(...args: any[]) {
    console.log(...this.formatArgs(args, "white"));
  }

  info(...args: any[]) {
    console.info(...this.formatArgs(args, "#2196F3"));
  }

  debug(...args: any[]) {
    console.debug(...this.formatArgs(args, "gray"));
  }

  warn(...args: any[]) {
    console.warn(...this.formatArgs(args, "orange"));
  }

  error(...args: any[]) {
    console.error(...this.formatArgs(args, "red"));
  }
}
