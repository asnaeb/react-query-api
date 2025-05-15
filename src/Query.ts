import {
  useQuery,
  useSuspenseQuery,
  type QueryClient,
  type SetDataOptions,
  type Updater,
  type UseQueryOptions,
  type UseSuspenseQueryOptions,
  type InfiniteQueryObserverResult,
  type NotifyOnChangeProps,
  type UseInfiniteQueryOptions,
  useInfiniteQuery,
  type QueryKey,
  type InfiniteData,
  type Enabled,
  type Query as TanstackQuery
} from "@tanstack/react-query";
import {isNullish} from "./utils.ts";

class AbstractQuery<TData> {
  constructor(
    protected readonly options: {queryKey: QueryKey},
    protected readonly queryClient: QueryClient
  ) {/**/}

  isFetching() {
    return this.queryClient.isFetching({queryKey: this.options.queryKey, exact: true});
  }

  refetchQuery() {
    return this.queryClient.refetchQueries({queryKey: this.options.queryKey, exact: true});
  }

  cancelQuery() {
    return this.queryClient.cancelQueries({queryKey: this.options.queryKey, exact: true});
  }

  invalidateQuery() {
    return this.queryClient.invalidateQueries({queryKey: this.options.queryKey, exact: true});
  }

  getQueryData() {
    return this.queryClient.getQueryData<TData>(this.options.queryKey);
  }

  setQueryData(data: Updater<NoInfer<TData> | undefined, NoInfer<TData> | undefined>, dataOptions?: SetDataOptions) {
    return this.queryClient.setQueryData<TData>(this.options.queryKey, data, dataOptions);
  }
}

class Query<TData = unknown, TError extends Error = Error> extends AbstractQuery<TData> {
  constructor(
    public readonly id: string,
    protected override options: UseQueryOptions<TData, TError>,
    queryClient: QueryClient
  ) {
    super(options, queryClient);
  }

  private mergeOptions<D = TData>(
    opt: Partial<UseQueryOptions<TData, TError, D>> | undefined
  ): UseQueryOptions<TData, TError, D> {
    if (!opt) {
      return this.options as unknown as UseQueryOptions<TData, TError, D>;
    }

    return {
      ...this.options,
      ...opt,
      queryKey: mergeQueryKeys(this.options.queryKey, opt.queryKey),
      enabled: mergeEnabled(this.options.enabled, opt.enabled),
      behavior: mergeBehaviors(this.options.behavior, opt.behavior),
      initialDataUpdatedAt: mergeInitialDataUpdatedAt(this.options.initialDataUpdatedAt, opt.initialDataUpdatedAt),
      notifyOnChangeProps: mergeNotifyOnChangeProps(this.options.notifyOnChangeProps, opt.notifyOnChangeProps),
      select: opt.select ?? this.options.select as unknown as (data: TData) => D,
      meta: {
        ...this.options.meta,
        ...opt.meta,
      }
    };
  }

  private mergeSuspenseOptions<D = TData>(
    opt: Partial<UseSuspenseQueryOptions<TData, TError, D>> | undefined
  ): UseSuspenseQueryOptions<TData, TError, D> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {enabled, ...mergedOptions} = this.mergeOptions(opt);

    return {
      ...mergedOptions,
      queryFn: (...args) => {
        if (typeof mergedOptions.queryFn !== "function") {
          throw Error();
        }

        return mergedOptions.queryFn(...args);
      }
    };
  }

  getQueryOptions<D = TData>(additionalOptions?: Partial<UseQueryOptions<TData, TError, D>>) {
    return this.mergeOptions(additionalOptions);
  }

  fetchQuery() {
    return this.queryClient.fetchQuery(this.options);
  }

  prefetchQuery() {
    return this.queryClient.prefetchQuery(this.options);
  }

  ensureQueryData() {
    return this.queryClient.ensureQueryData(this.options);
  }

  useQuery<TAdditionalData = TData>(additionalOptions?: Partial<UseQueryOptions<TData, TError, TAdditionalData>>) {
    return useQuery(this.mergeOptions(additionalOptions));
  }

  useSuspenseQuery<TAdditionalData = TData>(
    additionalOptions?: Partial<UseSuspenseQueryOptions<TData, TError, TAdditionalData>>
  ) {
    return useSuspenseQuery(this.mergeSuspenseOptions(additionalOptions));
  }
}

class InfiniteQuery<
  TQueryFnData = unknown,
  TData = TQueryFnData,
  TPageParam = unknown,
  TError extends Error = Error
> extends AbstractQuery<TQueryFnData> {
  constructor(
    public readonly id: string,
    protected override options: UseInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryFnData,
      QueryKey,
      TPageParam
    >,
    queryClient: QueryClient
  ) {
    super(options, queryClient);
  }

  private mergeInfiniteOptions<D = TQueryFnData>(
    opt: Partial<UseInfiniteQueryOptions<TQueryFnData, TError, D, TQueryFnData, QueryKey, TPageParam>> | undefined
  ): UseInfiniteQueryOptions<TQueryFnData, TError, D, TQueryFnData, QueryKey, TPageParam> {
    if (!opt) {
      return this.options as unknown as UseInfiniteQueryOptions<
        TQueryFnData,
        TError,
        D,
        TQueryFnData,
        QueryKey,
        TPageParam
      >;
    }

    return {
      ...this.options,
      ...opt,
      queryKey: mergeQueryKeys(this.options.queryKey, opt.queryKey),
      enabled: mergeEnabled(this.options.enabled, opt.enabled),
      behavior: mergeBehaviors(this.options.behavior, opt.behavior),
      initialDataUpdatedAt: mergeInitialDataUpdatedAt(this.options.initialDataUpdatedAt, opt.initialDataUpdatedAt),
      notifyOnChangeProps: mergeNotifyOnChangeProps(this.options.notifyOnChangeProps, opt.notifyOnChangeProps),
      meta: {
        ...this.options.meta,
        ...opt.meta,
      },
      select: opt.select ?? this.options.select as unknown as (data: InfiniteData<TQueryFnData>) => D,
    };
  }

  getInfiniteQueryOptions<D = TQueryFnData>(
    additionalOptions?: Partial<UseInfiniteQueryOptions<TQueryFnData, TError, D, TQueryFnData, QueryKey, TPageParam>>
  ) {
    return this.mergeInfiniteOptions(additionalOptions);
  }

  fetchInfiniteQuery() {
    return this.queryClient.fetchInfiniteQuery(this.options);
  }

  prefetchInfiniteQuery() {
    return this.queryClient.prefetchInfiniteQuery(this.options);
  }

  ensureInfiniteQueryData() {
    return this.queryClient.ensureInfiniteQueryData(this.options);
  }

  useInfiniteQuery<D = TQueryFnData>(
    overrideOptions?: Partial<UseInfiniteQueryOptions<TQueryFnData, TError, D, TQueryFnData, QueryKey, TPageParam>>
  ) {
    return useInfiniteQuery(this.mergeInfiniteOptions(overrideOptions));
  }
}

function mergeQueryKeys(queryKey1: QueryKey, queryKey2: QueryKey | undefined) {
  let queryKey = queryKey1;

  if (!isNullish(queryKey2)) {
    queryKey = [queryKey, ...queryKey2];
  }

  return queryKey;
}

function mergeEnabled<T, Error, D>(
  enabled1: Enabled<T, Error, D> | undefined,
  enabled2: Enabled<T, Error, D> | undefined
) {
  return (data: TanstackQuery<T, Error, D>) => {
    let optEnabled;
    let addEnabled;

    if (typeof enabled1 === "function") {
      optEnabled = enabled1(data);
    }
    else if (typeof enabled1 === "boolean") {
      optEnabled = enabled1;
    }

    if (typeof enabled2 === "function") {
      addEnabled = enabled2(data);
    }
    else if (typeof enabled2 === "boolean") {
      addEnabled = enabled2;
    }

    return !(addEnabled === false || optEnabled === false);
  };
}

function mergeBehaviors<R, ApiError extends Error>(
  behavior1: UseQueryOptions<R, ApiError>["behavior"] | undefined,
  behavior2: UseQueryOptions<R, ApiError>["behavior"] | undefined
) {
  return {
    onFetch: (...args: Parameters<NonNullable<UseQueryOptions<R, ApiError>["behavior"]>["onFetch"]>) => {
      if (typeof behavior2?.onFetch === "function") {
        behavior2.onFetch(...args);
      }
      if (typeof behavior1?.onFetch === "function") {
        behavior1.onFetch(...args);
      }
    }
  };
}

function mergeInitialDataUpdatedAt(
  initialDataUpdatedAt1: number | (() => number | undefined) | undefined,
  initialDataUpdatedAt2: number | (() => number | undefined) | undefined
) {
  if (typeof initialDataUpdatedAt2 === "function") {
    return initialDataUpdatedAt2();
  }
  if (typeof initialDataUpdatedAt2 === "number") {
    return initialDataUpdatedAt2;
  }
  if (typeof initialDataUpdatedAt1 === "function") {
    return initialDataUpdatedAt1();
  }
  if (typeof initialDataUpdatedAt1 === "number") {
    return initialDataUpdatedAt1;
  }
}

function handleNotifyOnChangeProps(
  notifyOnChangeProps: NotifyOnChangeProps,
  props: Array<keyof InfiniteQueryObserverResult> = []
): "all" | typeof props | undefined {
  if (notifyOnChangeProps === "all") {
    return notifyOnChangeProps;
  }

  if (Array.isArray(notifyOnChangeProps)) {
    props.push(...notifyOnChangeProps);
    return props;
  }

  if (typeof notifyOnChangeProps === "function") {
    return handleNotifyOnChangeProps(notifyOnChangeProps(), props);
  }
}

function mergeNotifyOnChangeProps(
  notifyOnChangeProps1: NotifyOnChangeProps | undefined,
  notifyOnChangeProps2: NotifyOnChangeProps | undefined
) {
  const props: Array<keyof InfiniteQueryObserverResult> = [];

  const firstResult = handleNotifyOnChangeProps(notifyOnChangeProps2, props);

  if (firstResult === "all") {
    return firstResult;
  }

  const secondResult = handleNotifyOnChangeProps(notifyOnChangeProps1, props);

  if (secondResult === "all") {
    return secondResult;
  }

  if (props.length) {
    return Array.from(new Set(props));
  }
}

export {Query, InfiniteQuery};
