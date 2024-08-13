import Accessor from "@arcgis/core/core/Accessor";
import { subclass, property } from "@arcgis/core/core/accessorSupport/decorators";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import { useRef, useEffect, useMemo } from "react";
import { useAccessorValue } from "./reactive";
import useInstance from "./useInstance";

@subclass()
class CacheEntry extends Accessor {
  key: any

  @property({ constructOnly: true })
  cb: (signal: AbortController['signal']) => Promise<any> = async () => { };

  @property({ constructOnly: true })
  evict!: () => void;

  @property()
  private _data?: any

  @property()
  get data() {
    return this._data
  }

  @property()
  private _error: unknown

  get error() {
    return this._error;
  }

  @property()
  status: 'idle' | 'loading' | 'success' | 'error' | 'disabled' = 'loading'

  @property()
  observers = 0;

  #abortController?: AbortController;

  async fetch() {
    try {
      this.status = 'loading';
      this.#abortController?.abort()
      const controller = new AbortController()
      this.#abortController = controller;

      const data = await this.cb(this.#abortController.signal)

      controller.signal.throwIfAborted()

      this.status = 'success'
      this._data = data
      this._error = undefined
    } catch (error) {
      const isAbortError = typeof error === 'object' && error != null && 'name' in error && error.name === 'AbortError';
      if (!isAbortError) {
        this.status = 'error'
        this._error = error;
        this._data = undefined;
      }
    }
  }

  disable() {
    this.status = 'disabled'
  }

  enable() {
    this.status = 'idle'
  }

  initialize() {
    this.addHandles([
      reactiveUtils.watch(() => this.observers, (observers) => {
        if (observers === 0) {
          this.#abortController?.abort()
          this.evict()
        }
      }),
      reactiveUtils.when(() => this.status === 'disabled', () => this.#abortController?.abort()),
      reactiveUtils.watch(() => this.status, (current, previous) => {
        if (previous === 'disabled' && current === 'idle') this.fetch()
      })
    ])
  }
}

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

  delete(key: string) {
    this.#cache.delete(key);
  }

  first() {
    return this.#cache.keys().next().value;
  }
}

const cache = new LRU();

type QueryCallback<ReturnType> = (args: {
  signal: AbortSignal,
}) => Promise<ReturnType>

@subclass()
class Query<
  ReturnType,
  const Key extends ReadonlyArray<any>
> extends Accessor {
  @property()
  key?: Key

  get isDownload() {
    return this.key?.includes("download")
  }

  @property()
  private cacheEntry?: CacheEntry;

  @property()
  get status() {
    return this.cacheEntry?.status ?? 'idle'
  }

  @property()
  get data(): NoInfer<ReturnType> | undefined {
    return this.cacheEntry?.data;
  }

  @property()
  get error() {
    return this.cacheEntry?.error;
  }

  @property({ constructOnly: true })
  callback!: QueryCallback<ReturnType>

  constructor(props: {
    key: Key
    callback: QueryCallback<ReturnType>
  }) {
    super(props)
  }

  @property()
  enabled = true

  #maxTries = 1
  #tryCallback = async (signal: AbortController['signal']) => {
    let tries = 0;

    const attempt = async () => {
      if (signal.aborted) return this.data;

      return await this.callback({
        signal: signal
      })
    }

    let error: unknown;

    while (this.#maxTries > tries) {
      try {
        return await attempt();
      } catch (_error) {
        tries++;
        error = _error;
      }
    }

    throw error;
  }

  refresh = async () => {
    return this.cacheEntry?.fetch();
  }

  setup() {
    const key = this.key as any;
    const cached = cache.get(key)

    if (cached) {
      this.cacheEntry = cached
    } else {
      this.cacheEntry = new CacheEntry({ cb: this.#tryCallback, evict: () => cache.delete(key) })
      cache.set(key, this.cacheEntry)
    }

    this.addHandles([
      reactiveUtils.watch(() => this.status, (status) => {
        if (this.key?.includes('debug'))
          console.log(status)
      }),
      reactiveUtils.watch(() => JSON.stringify([this.key, this.enabled]), async () => {
        if (this.enabled) this.cacheEntry?.fetch();
      }, { initial: true }),
      reactiveUtils.watch(() => this.cacheEntry, (entry, oldEntry) => {
        if (entry) entry.observers++;
        if (oldEntry) oldEntry.observers--;
      }),
      reactiveUtils.when(() => !this.enabled, () => this.cacheEntry?.disable()),
      reactiveUtils.when(() => this.enabled, () => this.cacheEntry?.enable()),
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
  callback: QueryCallback<ReturnType>,
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

  const data = useAccessorValue(() => process.data);
  const error = useAccessorValue(() => process.error);
  const status = useAccessorValue(() => process.status);

  const query = useMemo(() => ({
    data,
    error,
    status: status ?? 'idle',
    retry: process.refresh
  }), [data, error, process.refresh, status])

  useEffect(() => {
    return process.setup()
  }, [process])

  return query;
}
