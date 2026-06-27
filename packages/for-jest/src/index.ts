import run from './run.ts';

console.log('Hello, World!');

await run('http://localhost:5000', { pipeConsole: true });

console.log('Test done.');
