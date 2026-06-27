import type { buildDriverService } from '@onting/browser/builder.js';

type DriverService = Awaited<ReturnType<typeof buildDriverService>>;

export default function createDummyDriverService(serverURL: string): DriverService {
  return {
    async address() {
      return new URL(serverURL).host;
    },
    async [Symbol.asyncDispose]() {},
    isRunning() {
      return true;
    },
    async kill() {},
    start() {
      return Promise.resolve(serverURL);
    }
  };
}
