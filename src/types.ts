import type {MutationFunction, UseMutationOptions} from "@tanstack/react-query";

export interface ApiQueryFunction<T> {
  (args: {signal: AbortSignal}): T;
  map<R = T>(mapper: (result: T) => R): (args: {signal: AbortSignal}) => Promise<R>;
};

export type RevalidationFn<TData, TVariables> = (data: TData, params: TVariables) => void | Promise<void>;

export interface RevalidationParams<TData, TVariables> {
  /**
  * Wether to perform revalidation (calling `revalidationFn`) upon successful mutation
  * @default true
  */
  revalidate?: boolean;
  /**
   * Wether to await `revalidationFn` before resolving mutationFn
   * @default true
   */
  awaitRevalidation?: boolean;
  /**
  * Additional revalidation function to execute upon succesful mutation
  */
  revalidationFn?: RevalidationFn<TData, TVariables>;
}

export interface UseMutationParams<TData = unknown, TError = Error, TVariables = void, TContext = unknown>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn" | "mutationKey"> {
  revalidation?: RevalidationParams<TData, TVariables>;
}

export interface MutationParams<TData = unknown, TError = Error, TVariables = void, TContext = unknown>
  extends
  Omit<UseMutationOptions<TData, TError, TVariables, TContext>, "mutationFn" | "mutationKey"> {
  revalidationFn?: RevalidationFn<TData, TVariables>;
  mutationFn: MutationFunction<TData, TVariables>;
}
