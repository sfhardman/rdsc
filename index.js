const program = require('commander');
const fs = require('fs');
const yaml = require('js-yaml');
const log = require('loglevel');
const Entity = require('./Entity');
const FetchHelper = require('./FetchHelper');

const main = async(schema, desiredState, headers, targetUrl, verbosity, testForChanges) => {
  log.setLevel(verbosity || 'INFO', false);
  const fetchHelper = new FetchHelper(targetUrl, headers);

  for (rootNode of desiredState) {
    const rootEntity = new Entity(
      rootNode.type, 
      rootNode.properties,
      rootNode.children,
      rootNode.absent,
      [], 
      schema,
      testForChanges,
      fetchHelper);
    await rootEntity.process();
  }
}

module.exports = main;

