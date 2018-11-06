#!/usr/bin/env node

const program = require('commander');
const fs = require('fs');
const yaml = require('js-yaml');
const log = require('loglevel');
const rdsc = require('../index');

const collect = (val, memo) => {
  memo.push(val);
  return memo;
}

program
  .option('-s, --schema [schema-name]', 'Built in schema to use')
  .option('-f, --schema-file [schema-file-path]', 'Arbitrary schema file to use')
  .option('-d, --desired <desired-state-file-path>', 'Desired state YAML file')
  .option('-t, --target <target-base-url>', 'Target base URL')
  .option('-c, --test-for-changes', 'If there are changes to be made exit with code 1, otherwise exit with code 0')
  .option('-v, --verbosity <verbosity-level>', 'Logging level (ERROR|WARN|INFO|DEBUG|TRACE)')
  .option('-H, --header [header]', 'Headers to pass to the API (e.g. for authentication)', collect, [])
  .parse(process.argv);

const validOptions = (program.schemaFile || program.schema)
  && program.desired
  && program.target;

if (!validOptions) {
  program.outputHelp();
  process.exit(1);
}

log.setLevel(program.verbosity || 'INFO', false);

const readYaml = filename => yaml.safeLoad(fs.readFileSync(filename, 'utf8'));

const headers =  {};

if (program.header) {
  for (let header of program.header) {
    const name = header.split(':')[0];
    const value = header.replace(`${name}:`, '').trim();
    headers[name] = value;
  }
}

const schemaFile = program.schemaFile || `./schemas/${program.schema}.yaml`;
log.debug(`Loading schema from ${schemaFile}`);
const schema = readYaml(schemaFile);
const desiredState = readYaml(program.desired);

const main = async () => {
  try {
    await rdsc(schema, desiredState, headers, program.target,
      program.verbosity, program.testForChanges);
  } catch (err) {
    log.error(err);
    process.exit(9);
  }
}

main();
