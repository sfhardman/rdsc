const clone = require('clone-deep');
const log = require('loglevel');
const expect = require('expect');
const match = require('./match');

class Entity {
  constructor(type, desiredStateProps, children, desiredAbsent,
      parentSubstitutionList, schema, testForChanges, fetchHelper) {
    this.type = type;
    this.schema = schema;

    this.testForChanges = testForChanges;

    const defaults = this.entitySchema.defaults || {};
    this.desiredStateProps = Object.assign({}, defaults, desiredStateProps);

    this.desiredAbsent = desiredAbsent;
    this.children = children;
    this.parentSubstitutionList = parentSubstitutionList;

    this.fetchHelper = fetchHelper;
    if (!this.entitySchema) {
      throw new Error(`Type not found in schema ${this.type}`);
    }
    this.injectDesiredStateProps();
    if (!this.keyValues.length) {
      throw new Error(`Entitity does not have any keys`);
    }
  }

  handleTestForChanges() {
    if (this.testForChanges) {
      log.error('Changes required\nExiting without making changes due to test-for-changes mode');
      process.exit(1);
    }
  }

  get entitySchema() {
    return this.schema[this.type];
  }

  get keyValues() {
    return this.entitySchema.keys
      .map(keyName => this.desiredStateProps[keyName])
      .filter(item => !!item);
  }

  get entityDescription() {
    const keys = this.entitySchema.keys
      .filter(keyName => !!this.desiredStateProps[keyName])
      .map(keyName => `${keyName}:${this.desiredStateProps[keyName]}`)
      .join(', ');
    return `${this.type}[${keys}]`;
  }

  get ownSubstitutionList() {
    return this.entitySchema.keys
      .map((keyName) => {
        const keyValue = this.desiredStateProps[keyName]
          || (this.currentState && this.currentState[keyName])
        return {
          replace: `{${this.type}.${keyName}}`,
          with: keyValue,
        };
      });
  }

  get fullSubstitutionList() {
    return this.ownSubstitutionList.concat(this.parentSubstitutionList);
  }

  subsituteOnProps(propsToInject) {
    const substitutionPattern = /{.*}/;
    const substitutions = this.fullSubstitutionList;
    for (let prop of Object.keys(propsToInject)) {
      const value = propsToInject[prop];
      const substitution = substitutions.find(a => a.replace === value);
      if (substitution) {
        propsToInject[prop] = substitution.with;
      } else if (value.constructor === Array) {
        for (let child of value) {
          this.subsituteOnProps(child);
        }
      } else if (value.constructor === Object) {
        this.subsituteOnProps(value);
      } else {
        if (substitutionPattern.test(value)) {
          delete propsToInject[prop];
        }
      }
    }
  }

  findMatchPropsToBeAbsent(matchOn, path, propsToBeAbsent) {
    const substitutionPattern = /{.*}/;
    const substitutions = this.fullSubstitutionList;
    for (let prop of Object.keys(matchOn)) {
      const value = matchOn[prop];
      const substitution = substitutions.find(a => a.replace === value);
      if (!substitution && value.constructor === Object) {
        this.findMatchPropsToBeAbsent(value, path.concat([prop]), propsToBeAbsent);
      } else if (!substitution && substitutionPattern.test(value)) {
        // there is a subsitituion that is supposed to happen, but the desired state
        // has no matching key, so require the prop to be absent
        propsToBeAbsent.push(path.concat([prop]));
      }
    }
  }

  injectDesiredStateProps() {
    if (!this.entitySchema.injectDesiredStateProps) {
      return;
    }
    const propsToInject = clone(this.entitySchema.injectDesiredStateProps);
    this.subsituteOnProps(propsToInject);
    Object.assign(this.desiredStateProps, propsToInject);
  }

  substituteUrl(url) {
    let result = url;
    for (let substitution of this.fullSubstitutionList) {
      result = result.replace(substitution.replace, substitution.with);
    }
    return result;
  }

  matchesAllCriteria(candidate, matchOn) {
    const itemToMatch = clone(matchOn);
    this.subsituteOnProps(itemToMatch);
    const propsToBeAbsent = []
    this.findMatchPropsToBeAbsent(matchOn, [], propsToBeAbsent);
    try {
      match(itemToMatch, candidate);
      for (let propToBeAbsent of propsToBeAbsent) {
        const propPath = propToBeAbsent.join('.');
        expect(candidate).not.toHaveProperty(propPath);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  async loadCurrentState() {
    if (this.entitySchema.actions.getOne) {
      const url = this.substituteUrl(this.entitySchema.actions.getOne.url);
      const method = this.entitySchema.actions.getOne.method || 'GET';
      this.currentState = await this.fetchHelper.fetchUrl(url, method, undefined, true, true);
    } else if (this.entitySchema.actions.getList) {
      const url = this.substituteUrl(this.entitySchema.actions.getList.url);
      const method = this.entitySchema.actions.getList.method || 'GET';
      let candidates = await this.fetchHelper.fetchUrl(url, method, undefined, true, true);
      if (this.entitySchema.actions.getList.itemsProp) {
        candidates = candidates[this.entitySchema.actions.getList.itemsProp];
      }
      const matchOn = this.entitySchema.actions.getList.matchOn;
      if (!matchOn) {
        throw new Error(`No matchOn criteria to use with getList for entity of type ${this.type}`);
      }
      this.currentState = candidates
        .find(candidate => this.matchesAllCriteria(candidate, matchOn));
    } else {
      throw new Error(`No action to get entity of type ${this.type}`);
    }
  }

  updatesRequired() {
    const currentState = clone(this.currentState);
    const desiredState = clone(this.desiredStateProps);
    if (this.entitySchema.ignoreMismatchedPropsForUpdate) {
      for (let ignoreProp of this.entitySchema.ignoreMismatchedPropsForUpdate) {
        delete currentState[ignoreProp];
        delete desiredState[ignoreProp];
      }
    }
    try {
      match(desiredState, currentState);
      log.debug(`No updates required for ${this.entityDescription}`);
      return false;
    } catch (e) {
      log.debug(e.message);
      return true;
    }
  };

  async addEntity() {
    log.info(`Add ${this.entityDescription}`);
    
    this.handleTestForChanges();

    if (!this.entitySchema.actions.add) {
      throw new Error(`No action to add entity of type ${this.type}`);
    }
    
    const url = this.substituteUrl(this.entitySchema.actions.add.url);
    const method = this.entitySchema.actions.add.method || 'POST'

    await this.fetchHelper.fetchUrl(url, method, this.desiredStateProps, false, false);
  };

  async deleteEntity() {
    log.info(`Delete ${this.entityDescription}`);

    this.handleTestForChanges();

    if (!this.entitySchema.actions.delete) {
      throw new Error(`No action to delete entity of type ${this.type}`);
    }

    const url = this.substituteUrl(this.entitySchema.actions.delete.url);
    const method = this.entitySchema.actions.delete.method || 'DELETE';

    await this.fetchHelper.fetchUrl(url, method, undefined, false, false);
  };

  async updateEntity() {
    log.info(`Update ${this.type} ${this.entityDescription}`);

    this.handleTestForChanges();

    if (!this.entitySchema.actions.update) {
      throw new Error(`No action to update entity of type ${this.type}`);
    }

    const url = this.substituteUrl(this.entitySchema.actions.update.url);
    const method = this.entitySchema.actions.update.method || 'PATCH';

    await this.fetchHelper.fetchUrl(url, method, this.desiredStateProps, false, false);
  };

  async processChildren() {
    if (!this.children) {
      return;
    }
    for (let childNode of this.children) {
      const childEntity = new Entity(
        childNode.type, 
        childNode.properties,
        childNode.children,
        childNode.absent,
        this.fullSubstitutionList, 
        this.schema,
        this.testForChanges,
        this.fetchHelper);
      await childEntity.process();
    }
  }

  async process() {
    await this.loadCurrentState();
    if (!this.currentState && !this.desiredAbsent) {
      await this.addEntity();
      await this.loadCurrentState();
    } else if (this.currentState && this.desiredAbsent) {
      await this.processChildren();
      await this.deleteEntity();
    } else if (this.currentState && !this.desiredAbsent && this.updatesRequired()) {
      await this.updateEntity();
    }
    if (!this.desiredAbsent) {
      await this.processChildren();
    }
  }
  
}

module.exports = Entity;
