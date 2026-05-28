# Citron-ts

Turn your @hono/zod-openapi or `openapi.json not confirm` to typescript fetch types.

```ts
import { $Types, Citron } from "./citron"
const k = fetch

export const GetPet = Citron("/api/pet/{id}").get(
    (path, fetch = k) => {
        return fetch(b`/api/pet/${path.id}`).then(res=>res.json())
    }
);

console.log(await GetPet({ id: 1 }))
```

## Why?

i used to write code in my style to that why this happended. 

## Installation

```bash
# install with npm
npm install "@boon4681/citron-ts"
# install with yarn
yarn add "@boon4681/citron-ts"
```

## Usage

1. Setup config in citron.config.ts
```ts
import { defineConfig } from "./src";

export default defineConfig({
    schema: {
        url: 'http://localhost:3000/openapi.json',
        cookie: process.env['OPENAPI-COOKIE']
    },
    out:'./src'
})
```
2. Generate the schema from config:
```bash
citron pull
```

3. Use your types :
```ts
import { $Types, Citron } from "./citron"
const k = fetch

export const GetPet = Citron("/api/pet/{id}").get(
    (path, fetch = k) => {
        return fetch(b`/api/pet/${path.id}`).then(res=>res.json())
    }
);

console.log(await GetPet({ id:1 }))
```

## Experimental: builder adapter

An opt-in client style that removes the per-endpoint boilerplate. Instead of writing a resolver for every route, you call a typed builder where each setter (`.path()`/`.query()`/`.body()`) is enforced by the type, and you fire the request with `.execute()`.

Enable it in `citron.config.ts`:
```ts
export default defineConfig({
    schema: { url: 'http://localhost:3000/openapi.json' },
    out: './src',
    experimental: { adapter: 'builder' }
})
```

Generate the schema from config:
```bash
citron pull
```

```ts
import { createApi } from "./citron"

const api = createApi({
    baseUrl: "https://api.example.com",
    fetch: myFetch,                 // optional, defaults to global fetch
    init: { headers: { authorization: "Bearer ..." } }  // optional, merged into every request
})

// path param is required -> set it, then .execute()
const res = await api["/api/pet/{id}"].get().path({ id: 1 }).execute()
const pet = await res.json()

// no params / all-optional query
const all = await api["/api/pet"].get().execute()

// required body
await api["/api/pet"].post().body({ name: "rex" }).execute()
```

`.execute()` is the only way to send a request and returns `Promise<Response>`. Because it is gated on completion, forgetting a required slot fails to typecheck **at the call site**:
```ts
await api["/api/pet/{id}"].get().execute()   // ERROR: Property 'execute' does not exist (path missing)
```
The builder itself is not a promise — `await`-ing a chain without `.execute()` does not send anything.

`baseUrl` defaults to the OpenAPI `servers[0].url`, so `createApi()` with no arguments works when the document declares a server; pass `baseUrl` to override.

## Contributing

Ideas and contributions to the project are welcome.