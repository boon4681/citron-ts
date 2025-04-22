import { Type } from "@sinclair/typebox";

const configURLSchema = Type.Object({
    url: Type.String(),
    cookie: Type.Optional(Type.String())
})

const configFileSchema = Type.Object({
    file: Type.String()
})

export const configSchema = Type.Object({
    schema: Type.Union([
        configURLSchema,
        configFileSchema
    ]),
    out: Type.Optional(Type.String({ default: './src' }))
}, { additionalProperties: false })