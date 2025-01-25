import * as fs from 'node:fs';
import {
  command,
  run,
  string,
  positional,
  subcommands,
  number,
  flag,
  option,
  optional,
} from 'cmd-ts';
import { DATA_PATH } from './consts.js';
import { sessionStart, testStart } from './engine/sessions.js';

fs.mkdirSync(DATA_PATH, { recursive: true });

// create new session
// resume session

const testCmd = command({
  name: 'test',
  description:
    'Opens a browser tab to chrome://gpu for testing browser configuration and capabilities.',
  args: {},
  version: '1.0.0',
  handler: async () => await testStart(),
});

const createSessionCmd = command({
  name: 'create',
  description:
    'Opens the browser without a session and saves the session data to a file once closed.',
  version: '1.0.0',
  args: {
    session_file_path: positional({ type: string, displayName: 'session_file_path' }),
  },
  handler: async ({ session_file_path }) => await sessionStart(undefined, session_file_path),
});

const resumeSessionCmd = command({
  name: 'create',
  description:
    'Opens the browser without a session and saves the session data to a file once closed.',
  version: '1.0.0',
  args: {
    session_file_path: positional({ type: string, displayName: 'session_file_path' }),
  },
  handler: async ({ session_file_path }) =>
    await sessionStart(session_file_path, session_file_path),
});

// const claudeCmd = command({
//   name: 'claude',
//   description: 'Analyzes the comment data using Anthropic Claude LLM.',
//   version: '1.0.0',
//   args: {
//     path: positional({ type: string, displayName: 'path' }),
//     skip: option({ type: optional(number), long: 'skip' }),
//     dryRun: flag({ long: 'dryrun' }),
//   },
//   handler: ({ path, dryRun, skip }) => claudeAnalyze(path, { dryRun, skip }),
// });

// const json2csvCmd = command({
//   name: 'json2csv',
//   description:
//     'Takes a path to the analzed JSON and turns it into a CSV for import into a spreadsheet.',
//   args: {
//     path: positional({ type: string, displayName: 'path' }),
//     after: option({ type: optional(string), long: 'after' }),
//   },
//   handler: ({ path, after }) => {
//     let options: undefined | Json2CsvOptions = undefined;
//     if (after) {
//       options ||= {};
//       options.after = new Date(after);
//       options.filePostfix = `_${options.after.toISOString().split('T')[0].replaceAll('-', '')}`;
//     }
//     return json2csv(path, options);
//   },
// });

const app = subcommands({
  name: 'buy-bot',
  cmds: { create: createSessionCmd, resume: resumeSessionCmd, test: testCmd },
});

run(app, process.argv.slice(2));
