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

## Contributing

Ideas and contributions to the project are welcome.