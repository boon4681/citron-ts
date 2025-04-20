
export const imports = String.raw`
import { Type, TSchema, Static } from '@sinclair/typebox'
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

type extract_method<M extends MethodObject[method]> = (
    ...args: M extends Value<infer V> ? { [K in keyof V]: V[K] extends TSchema ? Static<V[K]> : Fetch } : never
) => unknown

type citron<M extends MethodObject> = {
    [K in keyof M as M[K] extends Value<infer V> ? K : never]: M[K] extends Value<infer V>
    ? extract_method<Value<V>>
    : never;
}

export const Citron = <P extends keyof $Types, M extends keyof $Types[P]>(path: P) => {
    return {
        get: (a: any) => a,
        put: (a: any) => a,
        post: (a: any) => a,
        patch: (a: any) => a,
        delete: (a: any) => a
    } as unknown as { [K in M]: (t: $Types[P][K]) => typeof t }
}
`