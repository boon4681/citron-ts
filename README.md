# Citron-ts

Turn your @hono/zod-openapi or `openapi.json not confirm` to typescript fetch types.

```ts
import { $Types } from "./lib/citron"
const k = fetch

const GetUser: $Types['/api/user/all']['get'] = (query, fetch = k) => {
    return fetch(`/api/user/all?page=${query.page}`)
}
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

1. Generate the schema from an OpenApi url (it can a be filepath too :
```bash
citron pull <url>
# or 
citron pull <url> --cookie <your-cookie>
# this will create citron.ts in ./lib
```

2. Load use your types :
```ts
import { $Types } from "./lib/citron"
const k = fetch

const GetUser: $Types['/api/user/all']['get'] = (query, fetch = k) => {
    return fetch(`/api/user/all?page=${query.page}`)
}
```

## Contributing

Ideas and contributions to the project are welcome.