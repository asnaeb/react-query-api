import type {ApiQueryFunction} from "./types.ts";
import {z} from "zod";

const RequestInitSchema = z.strictObject({
  method: z.string().optional(),
  keepalive: z.boolean().optional(),
  headers: z.union([
    z.instanceof(Headers),
    z.string().array().array(),
    z.record(z.string(), z.union([z.string(), z.string().array()]))
  ]).optional(),
  body: z.any().optional(),
  redirect: z.string().optional(),
  integrity: z.string().optional(),
  signal: z.instanceof(AbortSignal).optional(),
  credentials: z.string().optional(),
  mode: z.string().optional(),
  referrer: z.string().optional(),
  referrerPolicy: z.string().optional(),
  window: z.any().optional(),
  dispatcher: z.any().optional(),
  duplex: z.any().optional()
});

function createQueryFnArgs<A>(
  signal: AbortSignal,
  args?: A | RequestInit,
  init?: RequestInit
): [A | RequestInit, RequestInit?] {
  if (!args || RequestInitSchema.safeParse(args).success) {
    return [{...args as RequestInit, signal}];
  }
  return [args, {...init, signal}];
}

function createQueryFn<T, A>(
  fn: (args: A, init?: RequestInit) => Promise<T>,
  args: A,
  init?: RequestInit
): ApiQueryFunction<T>;
function createQueryFn<T>(
  fn: (init?: RequestInit) => Promise<T>,
  init?: RequestInit
): ApiQueryFunction<T>;
function createQueryFn<T, A>(
  fn: (args: A | RequestInit, init?: RequestInit) => Promise<T>,
  args?: A | RequestInit,
  init?: RequestInit
) {
  return Object.assign(
    ({signal}: {signal: AbortSignal}) => fn(...createQueryFnArgs(signal, args, init)),
    {
      map: <R = T>(mapper: (result: T) => R) => async ({signal}: {signal: AbortSignal}) => {
        const result = await fn(...createQueryFnArgs(signal, args, init));
        return mapper(result);
      }
    }
  );
}

export {createQueryFn};
