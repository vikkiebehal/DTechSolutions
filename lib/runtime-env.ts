import { AsyncLocalStorage } from 'node:async_hooks';

type RuntimeEnv = Record<string, string | undefined>;
const runtimeEnv = new AsyncLocalStorage<RuntimeEnv>();

/** Keep Worker bindings request-scoped; native Next.js reads its process environment. */
export function runWithRuntimeEnv<T>(env: RuntimeEnv, callback: () => T): T {
  return runtimeEnv.run(env, callback);
}
export function getEnquiryEnv(): RuntimeEnv {
  return runtimeEnv.getStore() ?? process.env;
}
