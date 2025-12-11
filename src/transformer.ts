import { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import CodeBlockWriter from "code-block-writer";
import { base, imports } from "./template";

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

export const transform = <T extends OpenAPIV3.Document>(schema: T) => {
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
                        if (k.requestBody && (k.requestBody as OpenAPIV3.RequestBodyObject).content['application/json']) {
                            const refless = (k.requestBody as OpenAPIV3.RequestBodyObject).content!['application/json']
                            result.write(toTypeBox(refless.schema))
                            result.write(",").newLine()
                        }
                        if (k.requestBody && (k.requestBody as OpenAPIV3.RequestBodyObject).content['multipart/form-data']) {
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