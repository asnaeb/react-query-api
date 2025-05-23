import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  type QueryClient,
  type QueryFunction,
  hashKey,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import {InfiniteQuery, Query} from "./Query.ts";
import {
  type MutationParams
} from "./types.ts";
import {Mutation} from "./Mutation.ts";

abstract class QueryApi<TError extends Error = Error> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly queryCache: Record<string, Query<any, TError>> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly infiniteQueryCache: Record<string, InfiniteQuery<any, any, any, TError>> = {};
  private readonly queries: Array<string> = [];
  private readonly mutations: Array<string> = [];

  constructor(private readonly id: string, private readonly queryClient: QueryClient) {}

  protected createDefaultQueryKey(id: string) {
    if (this.queries.includes(id)) {
      throw Error(`Duplicate query with id "${id}" found in ${this.getApiId()} client`);
    }

    this.queries.push(id);

    return [id, this.getApiId()];
  }

  getQueryClient() {
    return this.queryClient;
  }

  getApiId() {
    return this.id;
  }

  protected createQuery<TData = unknown, A extends ReadonlyArray<unknown> = ReadonlyArray<unknown>>(
    id: string,
    factory: (...args: A) => Omit<
      UseQueryOptions<TData, TError>,
      "select" | "queryKey" | "queryFn"
    > & {queryKey?: QueryKey; queryFn: QueryFunction<TData, QueryKey, never>}
  ) {
    const baseQueryKey = this.createDefaultQueryKey(id);

    return Object.assign(
      (...args: A) => {
        const resolvedOptions = resolveQueryOptions(baseQueryKey, factory, args);
        const hashedKey = hashKey(resolvedOptions.queryKey);

        return (
          this.queryCache[hashedKey] ??= new Query(id, resolvedOptions, this.queryClient)
        ) as Query<TData, TError>;
      },
      {
        isFetchingAny: () => this.queryClient.isFetching({queryKey: baseQueryKey, type: "all", stale: true}),
        refetchAll: () => this.queryClient.refetchQueries({queryKey: baseQueryKey, type: "all", stale: true}),
        invalidateAll: () => this.queryClient.invalidateQueries({queryKey: baseQueryKey, type: "all", stale: true})
      }
    );
  }

  protected createInfiniteQuery<R, A extends ReadonlyArray<unknown>, J, P>(
    id: string,
    factory: (...args: A) => Omit<
      UseInfiniteQueryOptions<R, TError, J, R, QueryKey, P>,
      "select" | "queryKey" | "queryFn"
    > & {queryKey?: QueryKey; queryFn: QueryFunction<R, QueryKey, P>}
  ) {
    return (...args: A) => {
      const resolvedOptions = resolveQueryOptions(this.createDefaultQueryKey(id), factory, args);
      const hashedKey = hashKey(resolvedOptions.queryKey);

      return (
        this.infiniteQueryCache[hashedKey] ??= new InfiniteQuery(id, resolvedOptions, this.queryClient)
      ) as InfiniteQuery<R, J, P, TError>;
    };
  }

  protected createMutation<TData = unknown, TVariables = void, TContext = unknown>(
    id: string,
    {mutationFn, revalidationFn, ...mutationOptions}: MutationParams<TData, TError, TVariables, TContext>
  ) {
    if (this.mutations.includes(id)) {
      throw Error(`Duplicate mutation with id "${id}" found in ${this.getApiId()} client`);
    }

    this.mutations.push(id);

    const resolvedOptions = Object.freeze({
      ...mutationOptions,
      mutationKey: [id, this.getApiId()]
    }) satisfies UseMutationOptions<TData, TError, TVariables, TContext>;

    return new Mutation(id, {mutationFn, revalidationFn, ...resolvedOptions});
  }
}

function resolveQueryOptions<
  R,
  A extends ReadonlyArray<unknown>,
  F extends (...args: A) => {queryKey?: QueryKey; queryFn: QueryFunction<R, QueryKey>}
>(
  defaultQueryKey: Array<string>,
  factory: F,
  args: A
) {
  const {queryKey: maybeQueryKey, ...options} = factory(...args);

  const resolvedOptions = {
    ...options,
    queryKey: defaultQueryKey
  };

  if (Array.isArray(args) && args.length) {
    resolvedOptions.queryKey = [...resolvedOptions.queryKey, ...args];
  }

  if (Array.isArray(maybeQueryKey) && maybeQueryKey.length) {
    resolvedOptions.queryKey = [resolvedOptions.queryKey, ...maybeQueryKey];
  }

  return resolvedOptions as unknown as ReturnType<F> & {queryKey: QueryKey};
}

export {QueryApi};
