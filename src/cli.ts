#!/usr/bin/env node

import { intro, outro, spinner } from "@clack/prompts";
import { Command } from "commander";
import { transform } from "./transformer";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const program = new Command();

program
    .name('citron-ts')
    .description('CLI to some JavaScript string utilities')
    .version('0.0.1', '-v');

program.command('pull')
    .description('Generate ts from openapi.json')
    .argument('<url>', 'openapi.json url')
    .option('--cookie <char>', 'cookie')
    .action(async (str, options) => {
        intro(`Generating ts file`);
        const s = spinner();
        s.start('Fetching openapi.json');
        const f = await fetch(str, {
            headers: {
                "Cookie": options.cookie
            },
            credentials: 'same-origin'
        }).then(a => a.json()).catch(a => {
            console.error(a)
        })
        await new Promise((rv) => setTimeout(rv, 500))
        s.stop('Fetching openapi.json');
        s.start('Transforming ...');
        const result = transform(f)
        if(!result) throw Error("FAILED")
        s.stop('Transforming ...');
        if (!existsSync("./lib")) {
            mkdirSync("./lib")
        }
        writeFileSync("./lib/citron.ts", result)
        
        outro(`You're all set!`);
    });

program.parse();