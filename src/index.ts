import { Static } from "@sinclair/typebox"
import { RequestOptions } from "node:https"
import { configSchema } from "./validator"

export const defineConfig = (config: Static<typeof configSchema>) => {
    return config
}