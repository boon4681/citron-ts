import 'dotenv/config'
import { intro, log, outro, spinner } from "@clack/prompts";
import { Command } from "commander";
import { transform } from "./transformer";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { load } from "./loader";
import { OpenAPIV3 } from 'openapi-types';
import { exit } from 'node:process';
import { join } from 'node:path';

const program = new Command();

program
    .name('citron-ts')
    .description('CLI to some JavaScript string utilities')
    .version('0.0.1', '-v');

program.command('pull')
    .description('Generate ts from openapi.json')
    .action(async (str, options) => {
        intro(`Generating ts file`);
        const s = spinner()
        const config = await load()
        let openapi_content: OpenAPIV3.Document | undefined = undefined
        if ('url' in config.schema) {
            s.start('Fetching openapi.json');
            openapi_content = await fetch(config.schema.url, {
                headers: {
                    "Cookie": config.schema.cookie ?? ''
                },
                credentials: 'same-origin'
            }).then(a => a.json()).catch(a => {
                log.error(a)
            })
            await new Promise((rv) => setTimeout(rv, 500))
            s.stop('Fetching openapi.json');
        }
        if (!openapi_content) {
            log.error("Cannot find openapi document.");
            exit(1)
        }
        s.start('Transforming to typescript');
        const result = transform(openapi_content)
        if (!result) throw Error("FAILED")
        s.stop('Transforming to typescript');
        if (!existsSync(config.out!)) {
            mkdirSync(config.out!)
        }
        writeFileSync(join(config.out!,"citron.ts"), result)
        outro(`You're all set!`);
    });

program.parse();