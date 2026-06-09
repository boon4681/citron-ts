
export const imports = String.raw`
import { Type, type TSchema, type Static, type TOptional } from '@sinclair/typebox'
`

export const builderImports = String.raw`
import { Type, type TSchema, type Static } from '@sinclair/typebox'
`

export const builderBase = String.raw`
const Nullable = <T extends TSchema>(T: T) => {
    return Type.Union([T, Type.Null()])
}

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export interface ClientConfig {
    baseUrl?: string
    fetch?: Fetch
    init?: RequestInit
}

type Slots = { path?: unknown; query?: unknown; body?: unknown; response?: unknown }

export type Result<T> = T | { error: any }

type InputKeys = 'path' | 'query' | 'body'

type ResponseOf<S extends Slots> = S extends { response: infer R } ? R : unknown

type Execute<S extends Slots> = {
    execute(): Promise<Response>
    execute(as: 'json'): Promise<Result<ResponseOf<S>>>
}

type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T]

type Builder<S extends Slots, Filled extends keyof S = never> =
    & { [K in Exclude<Extract<keyof S, InputKeys>, Filled>]-?: (v: Exclude<S[K], undefined>) => Builder<S, Filled | K> }
    & ([Exclude<Extract<RequiredKeys<S>, InputKeys>, Filled>] extends [never]
        ? Execute<S>
        : {})

type Client<R> = {
    [P in keyof R]: {
        [M in keyof R[P]]: () => Builder<R[P][M] extends Slots ? R[P][M] : {}>
    }
}

class RequestBuilder {
    private data: { path?: Record<string, unknown>; query?: Record<string, unknown>; body?: unknown } = {}
    constructor(
        private template: string,
        private method: string,
        private config: ClientConfig
    ) { }
    path(v: Record<string, unknown>) { this.data.path = v; return this }
    query(v: Record<string, unknown>) { this.data.query = v; return this }
    body(v: unknown) { this.data.body = v; return this }
    private async exec(): Promise<Response> {
        let path = this.template
        if (this.data.path) {
            for (const [k, val] of Object.entries(this.data.path)) {
                path = path.replace('{' + k + '}', encodeURIComponent(String(val)))
            }
        }
        const unresolved = path.match(/\{[^}]+\}/g)
        if (unresolved) {
            throw new Error('citron: missing path parameter(s) ' + unresolved.join(', ') + ' for ' + this.template)
        }
        const base = this.config.baseUrl ? this.config.baseUrl.replace(/\/$/, '') : ''
        let url = base + path
        if (this.data.query) {
            const qs = new URLSearchParams()
            for (const [k, val] of Object.entries(this.data.query)) {
                if (val !== undefined && val !== null) qs.append(k, String(val))
            }
            const s = qs.toString()
            if (s) url += '?' + s
        }
        const init: RequestInit = { ...this.config.init, method: this.method.toUpperCase() }
        if (this.data.body !== undefined && this.data.body !== null) {
            if (typeof FormData !== 'undefined' && this.data.body instanceof FormData) {
                init.body = this.data.body
            } else {
                init.body = JSON.stringify(this.data.body)
                init.headers = { 'content-type': 'application/json', ...(this.config.init?.headers as Record<string, string> ?? {}) }
            }
        }
        const f = this.config.fetch ?? fetch
        return f(url, init)
    }
    execute(): Promise<Response>
    execute(as: 'json'): Promise<Result<any>>
    async execute(as?: 'json'): Promise<unknown> {
        const res = await this.exec()
        if (as === 'json') {
            let data: any
            try {
                data = await res.json()
            } catch (error) {
                return { error }
            }
            return res.ok ? data : { error: data }
        }
        return res
    }
}

export const createClient = <R>(config: ClientConfig = {}): Client<R> => {
    return new Proxy({}, {
        get: (_t, path: string) => new Proxy({}, {
            get: (_t2, method: string) => () => new RequestBuilder(path, method, config)
        })
    }) as Client<R>
}
`

export const base = String.raw`
const Nullable = <T extends TSchema>(T: T) => {
    return Type.Union([T, Type.Null()])
}

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

type method = "get" | "post" | "delete" | "patch" | "put"

type Value<V extends readonly [...TSchema[], Fetch]> = {
    args: V
}

type MethodObject = Partial<{ [K in method]: Value<readonly [...TSchema[], Fetch]> }>

type Model<m extends paths, v extends MethodObject> = v

const c = <p extends paths>() => {
    return <v extends MethodObject>(type: v): Model<p, v> => {
        return type
    }
}

type extract_method<M extends MethodObject[method], O> = (
    ...args: M extends Value<infer V> ? { [K in keyof V]: V[K] extends TSchema ? Static<V[K]> : Fetch } : never
) => O

type citron<M extends MethodObject> = {
    [K in keyof M as M[K] extends Value<infer V> ? K : never]: M[K] extends Value<infer V>
    ? extract_method<Value<V>, unknown>
    : never;
}

type OptionalStatic<T extends TSchema> = T extends TOptional<infer K> ? Static<K> | undefined | void : Static<T>

export const Citron = <P extends keyof $Types, M extends keyof $Types[P]>(path: P) => {
    return {
        get: (a: any) => a,
        put: (a: any) => a,
        post: (a: any) => a,
        patch: (a: any) => a,
        delete: (a: any) => a
    } as unknown as {
        [K in M]: <O, F extends (
            ...args: $Types[P][K] extends extract_method<Value<infer V>, infer O>
                ? { [K in keyof V]: V[K] extends TSchema ? OptionalStatic<V[K]> : V[K] }
                : never
        ) => O>(t: F) => typeof t
    }
}
`