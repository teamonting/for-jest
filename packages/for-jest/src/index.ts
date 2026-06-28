import test from 'node:test';
import BrowserRun from './BrowserRun.ts';

test('should run', async () => {
  const run = new BrowserRun('http://localhost:5000');

  run.addEventListener('console', ({ data, method }) => console.log(`[${method}]`, ...data));

  await run.successPromise;
});
