
export const imports = String.raw`
import { Type, type TSchema, type Static } from '@sinclair/typebox'
`

export const base = String.raw`
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
                ? { [K in keyof V]: V[K] extends TSchema ? Static<V[K]> : V[K] }
                : never
        ) => O>(t: F) => typeof t
    }
}
`