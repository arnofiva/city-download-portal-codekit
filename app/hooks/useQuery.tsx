import Accessor from "@arcgis/core/core/Accessor";
import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import { useRef, useEffect } from "react";
import { useAccessorValue } from "./reactive";
import useInstance from "./useInstance";

type CacheEntry = { data: unknown, status: Query<any, any>['status'] };
class LRU {
  #max = 100
  #cache = new Map<string, CacheEntry>();

  constructor(max = 100) {
    this.#max = max;
  }

  get(key: string) {
    const item = this.#cache.get(key);
    if (item !== undefined) {
      this.#cache.delete(key);
      this.#cache.set(key, item);
    }
    return item;
  }

  set(key: string, val: CacheEntry) {
    if (this.#cache.has(key)) this.#cache.delete(key);
    else if (this.#cache.size === this.#max) this.#cache.delete(this.first());
    this.#cache.set(key, val);
  }

  first() {
    return this.#cache.keys().next().value;
  }
}

const cache = new LRU();

type QueryCallback<ReturnType, Key> = (args: {
  signal: AbortSignal,
  key: Key,
}) => Promise<ReturnType>

@subclass()
class Query<
  ReturnType,
  const Key extends ReadonlyArray<any>
> extends Accessor {
  @property()
  key?: Key

  @property()
  private _data?: NoInfer<ReturnType>;

  @property()
  get data(): NoInfer<ReturnType> | undefined {
    return this._data;
  }

  @property({ constructOnly: true })
  callback!: QueryCallback<ReturnType, Key>

  constructor(props: {
    key: Key
    callback: QueryCallback<ReturnType, Key>
  }) {
    super(props)
  }

  @property()
  status: 'idle' | 'loading' | 'success' | 'error' = 'idle'

  @property()
  enabled = true

  #sequence = 0;
  #abortController: AbortController | null = null

  setup() {
    this.addHandles([
      reactiveUtils.when(() => !this.enabled, () => this.#abortController?.abort('query disabled')),
      reactiveUtils.watch(() => JSON.stringify([this.key, this.enabled]), async () => {
        if (!this.enabled) return;

        const id = this.#sequence++;
        const stringifiedKey = this.key as any;

        const cached = cache.get(stringifiedKey)
        const cachedStatus = cached?.status;

        if (cached && cachedStatus !== 'error') {
          if (cached.status === 'loading') this.status = 'loading';

          this._data = await cached.data as any;
          this.status = 'success'
        } else {
          this.status = 'loading';
          const key = JSON.parse((stringifiedKey as any)) as Key;

          this.#abortController?.abort()
          this.#abortController = new AbortController();

          const data = this.callback({
            signal: this.#abortController.signal,
            key,
          });

          const cacheEntry: CacheEntry = { data, status: 'loading' };
          cache.set(stringifiedKey, cacheEntry)

          try {
            this._data = await data;
            cacheEntry.status = 'success'
            this.status = 'success'
          } catch (_error) {
            cacheEntry.status = 'error'
            if (this.#sequence === id) this.status = 'error'
          }
        }
      }, { initial: true })
    ])
    return () => {
      this.removeHandles()
    }
  }
}

export function useQuery<
  ReturnType,
  const Key extends ReadonlyArray<any> = []
>(params: {
  key: Key,
  callback: QueryCallback<ReturnType, Key>,
  enabled?: boolean
}) {
  const callback = useRef(params.callback)
  useEffect(() => {
    callback.current = params.callback;
  })

  const key = JSON.stringify(params.key);

  const process = useInstance(() => new Query({
    key: params.key,
    callback: (params) => callback.current(params),
  }))

  useEffect(() => {
    process.key = key as any
    process.enabled = params.enabled ?? true
  })

  const query = useAccessorValue(() => ({
    data: process.data,
    status: process.status,
  })) ?? { data: undefined, status: 'idle' }

  useEffect(() => {
    return process.setup()
  }, [process])

  return query;
}
