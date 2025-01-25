import { Logger } from 'tslog';
export type { Logger };

export const logger = new Logger({
  name: 'main',
  // @ts-ignore This param exists but is not
  displayFunctionName: false,
  colorizePrettyLogs: process.env.LOG_COLOR === 'true' ? true : false,
  minLevel:
    process.env.LOG_LEVEL === 'silly'
      ? 0
      : process.env.LOG_LEVEL === 'trace'
        ? 1
        : process.env.LOG_LEVEL === 'debug'
          ? 2
          : process.env.LOG_LEVEL === 'info'
            ? 3
            : process.env.LOG_LEVEL === 'warn'
              ? 4
              : process.env.LOG_LEVEL === 'error'
                ? 5
                : process.env.LOG_LEVEL === 'fatal'
                  ? 6
                  : 3,
  displayDateTime: process.env.NODE_ENV === 'development',
});

export default logger;
