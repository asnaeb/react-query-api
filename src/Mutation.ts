import {type MutationFunction, useMutation, type UseMutationOptions} from "@tanstack/react-query";
import type {MutationParams, RevalidationFn, UseMutationParams} from "./types.ts";

class Mutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown> {
  private readonly mutationFn: MutationFunction<TData, TVariables>;
  private readonly mutationOptions: UseMutationOptions<TData, TError, TVariables, TContext>;
  private readonly revalidationFn?: RevalidationFn<TData, TVariables>;

  constructor(
    public readonly id: string,
    {mutationFn, revalidationFn, ...mutationOptions}: MutationParams<TData, TError, TVariables, TContext>
  ) {
    this.mutationFn = mutationFn;
    this.revalidationFn = revalidationFn;
    this.mutationOptions = mutationOptions;
  }

  get mutate() {
    return this.mutationFn;
  }

  revalidate(data: TData, params: TVariables) {
    return this.revalidationFn?.(data, params);
  }

  useMutation<TAdditionalContext extends TContext = TContext>(
    {
      onMutate,
      onError,
      onSuccess,
      onSettled,
      revalidation,
      ...additionalOptions
    }: UseMutationParams<TData, TError, TVariables, TAdditionalContext>
  ) {
    const awaitRevalidation = revalidation?.awaitRevalidation ?? true;
    const revalidate = revalidation?.revalidate ?? true;

    let revalidationFn: ((data: TData, params: TVariables) => void) | undefined;

    if (this.revalidationFn || revalidation?.revalidationFn) {
      revalidationFn = (data: TData, params: TVariables) => Promise.all([
        this.revalidationFn?.(data, params),
        revalidation?.revalidationFn?.(data, params)
      ]);
    }

    return useMutation({
      ...this.mutationOptions,
      ...additionalOptions,
      mutationFn: async (params: TVariables) => {
        if (revalidate && revalidationFn) {
          const result = await this.mutationFn(params);

          if (awaitRevalidation) {
            await revalidationFn(result, params);
          }
          else {
            revalidationFn(result, params);
          }
          return result;
        }

        return this.mutationFn(params);
      },
      onMutate: params => {
        let ctx: unknown;

        if (this.mutationOptions.onMutate) {
          ctx = this.mutationOptions.onMutate(params);
        }

        if (onMutate) {
          ctx = onMutate(params);
        }

        return ctx as TAdditionalContext;
      },
      onSuccess: (data, params, ctx) => {
        this.mutationOptions.onSuccess?.(data, params, ctx);
        onSuccess?.(data, params, ctx);
      },
      onError: (...args) => {
        this.mutationOptions.onError?.(...args);
        onError?.(...args);
      },
      onSettled: (...args) => {
        this.mutationOptions.onSettled?.(...args);
        onSettled?.(...args);
      },
    });
  }
}

export {Mutation};
