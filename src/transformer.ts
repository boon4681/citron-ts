import { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import CodeBlockWriter from "code-block-writer";
import { base, imports, builderBase, builderImports } from "./template";

export interface TransformOptions {
    adapter?: 'function' | 'builder'
}

const _methods = ["get", "put", "post", "patch", "delete"]

const createWriter = () => {
    return new CodeBlockWriter({
        newLine: "\r\n",
        indentNumberOfSpaces: 4,
        useTabs: false,
        useSingleQuote: true
    })
}

function toTypeBox(schema: any): string {
    if (!schema || typeof schema !== 'object') throw new Error('Invalid schema');
    if ("anyOf" in schema) {
        const variants = schema.anyOf.map((subSchema: any) => toTypeBox(subSchema));
        return `Type.Union([${variants.join(', ')}])`;
    }
    if ("oneOf" in schema) {
        const variants = schema.oneOf.map((subSchema: any) => toTypeBox(subSchema));
        return `Type.Union([${variants.join(', ')}])`;
    }
    if ("allOf" in schema) {
        const variants = schema.allOf.map((subSchema: any) => toTypeBox(subSchema));
        return `Type.Intersect([${variants.join(', ')}])`;
    }
    if (Array.isArray(schema.enum)) {
        const literals = schema.enum.map((value: any) =>
            value === null ? "Type.Null()" : `Type.Literal(${JSON.stringify(value)})`
        );
        if (literals.length === 0) return "Type.Never()";
        if (literals.length === 1) return literals[0];
        return `Type.Union([${literals.join(', ')}])`;
    }
    switch (schema.type) {
        case 'string':
            return "Type.String()";
        case 'number':
            return "Type.Number()";
        case 'integer':
            return "Type.Integer()";
        case 'boolean':
            return "Type.Boolean()";
        case 'null':
            return "Type.Null()";
        case 'array':
            return `Type.Array(${toTypeBox(schema.items || { type: 'any' })})`;
        case 'object': {
            const props = schema.properties || {};
            const required = schema.required || [];

            const convertedProps: Record<string, string> = {};

            for (const key of Object.keys(props)) {
                const propSchema = toTypeBox(props[key]);
                let schema = props[key].nullable ? ` Nullable(${propSchema})` : propSchema
                convertedProps[key] = required.includes(key) ? schema : ` Type.Optional(${schema})`;
            }

            return `Type.Object({${Object.entries(convertedProps).map(([a, b]) => a + ":" + b).join(",")}})`;
        }
        default:
            return `Type.Any()`; // fallback
    }
}

export const transform = <T extends OpenAPIV3.Document>(schema: T, options: TransformOptions = {}) => {
    if (options.adapter === 'builder') return transformBuilder(schema)
    if (!schema.paths) return
    const result = createWriter()
    result.writeLine(imports)
    result.writeLine("type paths = " + Object.keys(schema.paths ?? {}).map(a => JSON.stringify(a)).join(" | "))
    result.writeLine(base)
    let counter = 1
    for (const path in schema.paths) {
        result.write("const $" + counter + " = c<" + JSON.stringify(path) + ">()").write("(").inlineBlock(() => {
            let methods = Object.keys(schema['paths'][path] ?? {}).filter(a => _methods.includes(a as any)) as unknown as ("get" | "put" | "post" | "patch" | "delete")[]
            for (let i = 0; i < methods.length; i++) {
                const method = methods[i]
                result.write(method + "").write(": ").inlineBlock(() => {
                    result.write("args: ").write("[").indent(() => {
                        const k = schema['paths'][path]![method]!
                        if (k.parameters) {
                            const refless = (k.parameters as OpenAPIV3.ParameterObject[])
                            const query = refless.filter(a => a['in'] == 'query')
                            const paths = refless.filter(a => a['in'] == 'path')
                            if (paths.length) {
                                const paths_result = createWriter()
                                paths_result.write("Type.Object(").inlineBlock(() => {
                                    for (let i = 0; i < paths.length; i++) {
                                        const k = paths[i]
                                        paths_result.write(k.name).write(": ")
                                        if (!k.required) {
                                            paths_result.write("Type.Optional(")
                                        }

                                        if (k.schema) {
                                            const refless = k.schema as OpenAPIV3.SchemaObject
                                            paths_result.write(toTypeBox(k.schema))
                                        }
                                        if (!k.required) {
                                            paths_result.write(")")
                                        }
                                        if (i < paths.length - 1) paths_result.write(",").newLine()
                                    }
                                }).write(")")
                                result.write(paths_result.toString())
                                result.write(",").newLine()
                            }
                            if (query.length) {
                                const query_result = createWriter()
                                const all_optional = query.filter(a => !a.required).length == query.length
                                if (all_optional) {
                                    query_result.write("Type.Optional(")
                                }

                                query_result.write("Type.Object(").inlineBlock(() => {
                                    for (let i = 0; i < query.length; i++) {
                                        const k = query[i]
                                        query_result.write(k.name).write(": ")
                                        if (!k.required) {
                                            query_result.write("Type.Optional(")
                                        }
                                        if (k.schema) {
                                            query_result.write(toTypeBox(k.schema))
                                        }
                                        if (!k.required) {
                                            query_result.write(")")
                                        }
                                        if (i < query.length - 1) query_result.write(",").newLine()
                                    }
                                }).write(")")
                                if (all_optional) {
                                    query_result.write(")")
                                }
                                result.write(query_result.toString())
                                result.write(",").newLine()
                            }
                        }
                        if (
                            k.requestBody &&
                            (k.requestBody as OpenAPIV3.RequestBodyObject).content['application/json'] &&
                            (k.requestBody as OpenAPIV3.RequestBodyObject).content['multipart/form-data']
                        ) {
                            const refless_json = (k.requestBody as OpenAPIV3.RequestBodyObject).content!['application/json']
                            const refless_form = (k.requestBody as OpenAPIV3.RequestBodyObject).content!['multipart/form-data']
                            result.write("Type.Union([")
                            result.write(toTypeBox(refless_json.schema))
                            result.write(",")
                            result.write(toTypeBox(refless_form.schema))
                            result.write("])")
                            result.write(",").newLine()
                        }
                        else if (k.requestBody && (k.requestBody as OpenAPIV3.RequestBodyObject).content['application/json']) {
                            const refless = (k.requestBody as OpenAPIV3.RequestBodyObject).content!['application/json']
                            result.write(toTypeBox(refless.schema))
                            result.write(",").newLine()
                        }
                        else if (k.requestBody && (k.requestBody as OpenAPIV3.RequestBodyObject).content['multipart/form-data']) {
                            const refless = (k.requestBody as OpenAPIV3.RequestBodyObject).content!['multipart/form-data']
                            if (refless.schema!)
                                result.write(toTypeBox(refless.schema))
                            result.write(",").newLine()
                        }
                        {
                            result.write("fetch")
                        }
                    }).write("] as const")
                })
                if (i < methods.length - 1) result.write(",").newLine()
            }
        }).write(");").newLine().newLine();
        counter++;
    }

    result.write("export interface $Types").block(() => {
        let counter = 1;
        for (const path in schema.paths) {
            result.write(JSON.stringify(path)).write(": ").write("citron<typeof $" + counter + ">").newLine()
            counter++;
        }
    })
    return result.toString()
}

type Slot = { name: 'path' | 'query' | 'body'; schema: string; optional: boolean; shape?: 'json' | 'formData' }

const paramsObject = (params: OpenAPIV3.ParameterObject[]): string => {
    const entries = params.map(p => {
        const inner = p.schema ? toTypeBox(p.schema) : 'Type.Any()'
        const v = p.required ? inner : `Type.Optional(${inner})`
        return `${JSON.stringify(p.name)}: ${v}`
    })
    return `Type.Object({${entries.join(', ')}})`
}

const bodySlot = (k: OpenAPIV3.OperationObject): Slot | undefined => {
    const rb = k.requestBody as OpenAPIV3.RequestBodyObject | undefined
    if (!rb || !rb.content) return undefined
    const json = rb.content['application/json']
    const form = rb.content['multipart/form-data']
    let schema: string | undefined
    let shape: 'json' | 'formData' | undefined
    if (json && form) { schema = `Type.Union([${toTypeBox(json.schema)}, ${toTypeBox(form.schema)}])`; shape = 'json' }
    else if (json) { schema = toTypeBox(json.schema); shape = 'json' }
    else if (form && form.schema) { schema = toTypeBox(form.schema); shape = 'formData' }
    if (!schema) return undefined
    return { name: 'body', schema, optional: rb.required !== true, shape }
}

const responseSchema = (k: OpenAPIV3.OperationObject): string | undefined => {
    const responses = k.responses as OpenAPIV3.ResponsesObject | undefined
    if (!responses) return undefined
    const codes = Object.keys(responses)
    const pick = codes.find(c => c === '200')
        ?? codes.find(c => c === '201')
        ?? codes.find(c => /^2\d\d$/.test(c))
        ?? (responses.default ? 'default' : undefined)
    if (!pick) return undefined
    const resp = responses[pick] as OpenAPIV3.ResponseObject
    if (!resp || !resp.content) return undefined
    const json = resp.content['application/json']
    if (!json || !json.schema) return undefined
    return toTypeBox(json.schema)
}

const methodSlots = (k: OpenAPIV3.OperationObject): Slot[] => {
    const slots: Slot[] = []
    if (k.parameters) {
        const refless = k.parameters as OpenAPIV3.ParameterObject[]
        const paths = refless.filter(a => a.in === 'path')
        const query = refless.filter(a => a.in === 'query')
        if (paths.length) slots.push({ name: 'path', schema: paramsObject(paths), optional: false })
        if (query.length) {
            const allOptional = query.every(a => !a.required)
            slots.push({ name: 'query', schema: paramsObject(query), optional: allOptional })
        }
    }
    const body = bodySlot(k)
    if (body) slots.push(body)
    return slots
}

const transformBuilder = <T extends OpenAPIV3.Document>(schema: T) => {
    if (!schema.paths) return
    const result = createWriter()
    result.writeLine(builderImports)

    const entries: { path: string; index: number; methods: { method: string; slots: Slot[]; response?: string }[] }[] = []
    let counter = 1
    for (const path in schema.paths) {
        const methods = Object.keys(schema.paths[path] ?? {})
            .filter(a => _methods.includes(a)) as ("get" | "put" | "post" | "patch" | "delete")[]
        entries.push({
            path,
            index: counter,
            methods: methods.map(method => ({
                method,
                slots: methodSlots(schema.paths![path]![method]!),
                response: responseSchema(schema.paths![path]![method]!)
            }))
        })
        counter++
    }

    result.writeLine(builderBase)

    for (const entry of entries) {
        result.write(`const $${entry.index} = `).inlineBlock(() => {
            for (let i = 0; i < entry.methods.length; i++) {
                const { method, slots, response } = entry.methods[i]
                result.write(method).write(": ").inlineBlock(() => {
                    for (let j = 0; j < slots.length; j++) {
                        const slot = slots[j]
                        result.write(slot.name).write(": ").write(slot.schema)
                        if (j < slots.length - 1 || response) result.write(",").newLine()
                    }
                    if (response) result.write("response: ").write(response)
                })
                if (i < entry.methods.length - 1) result.write(",").newLine()
            }
        }).write(";").newLine().newLine()
    }

    result.write("export type Routes = ").inlineBlock(() => {
        for (const entry of entries) {
            result.write(JSON.stringify(entry.path)).write(": ").inlineBlock(() => {
                for (let i = 0; i < entry.methods.length; i++) {
                    const { method, slots, response } = entry.methods[i]
                    result.write(method).write(": ").inlineBlock(() => {
                        for (let j = 0; j < slots.length; j++) {
                            const slot = slots[j]
                            const opt = slot.name === 'path' ? '' : (slot.optional ? '?' : '')
                            result.write(slot.name).write(opt).write(": ")
                                .write(`Static<typeof $${entry.index}.${method}.${slot.name}>`)
                            if (j < slots.length - 1 || response) result.write(",").newLine()
                        }
                        if (response) result.write("response: ").write(`Static<typeof $${entry.index}.${method}.response>`)
                    })
                    if (i < entry.methods.length - 1) result.write(",").newLine()
                }
            }).newLine()
        }
    }).newLine().newLine()

    result.write("const routes = ").inlineBlock(() => {
        for (let e = 0; e < entries.length; e++) {
            const entry = entries[e]
            const withBody = entry.methods.filter(m => m.slots.some(s => s.name === 'body'))
            if (!withBody.length) continue
            result.write(JSON.stringify(entry.path)).write(": ").inlineBlock(() => {
                for (let i = 0; i < withBody.length; i++) {
                    const m = withBody[i]
                    const body = m.slots.find(s => s.name === 'body')!
                    result.write(m.method).write(": ").write(`{ body: ${JSON.stringify(body.shape ?? 'json')} }`)
                    if (i < withBody.length - 1) result.write(",").newLine()
                }
            })
            if (e < entries.length - 1) result.write(",").newLine()
        }
    }).write(" as const").newLine().newLine()

    const serverUrl = schema.servers?.[0]?.url
    const defaultBase = typeof serverUrl === 'string' && serverUrl ? `baseUrl: ${JSON.stringify(serverUrl)}, ` : ''
    result.write(`export const createApi = (config: ClientConfig = {}) => createClient<Routes>(routes, { ${defaultBase}...config })`).newLine()
    return result.toString()
}