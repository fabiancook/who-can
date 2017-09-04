/*
 MIT License

 Copyright (c) 2017 Fabian Cook

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

async function resolveValueOrReturn(resolver) {
  if (resolver instanceof Function) {
    return resolver();
  }
  if (resolver && resolver.then) {
    return resolver;
  }
  return resolver;
}

/**
 * Returns actions as an array
 */
async function getActions(value, options) {
  const resolved = await (options.resolveValueOrReturn || resolveValueOrReturn)(value);
  if (!Array.isArray(resolved)) {
    return [ resolved ];
  }
  return resolved;
}

class WhoCanSingle {

  constructor() {
    this.map = new Map();
  }

  /**
   * @param identifier
   * @param action
   * @param target
   */
  allow(identifier, action, target) {
    let identifierMap;
    if (this.map.has(identifier)) {
      identifierMap = this.map.get(identifier);
    } else {
      identifierMap = new Map();
      this.map.set(identifier, identifierMap);
    }
    let targetArray;
    if (identifierMap.has(target)) {
      targetArray = identifierMap.get(target);
    } else {
      targetArray = [];
      identifierMap.set(target, targetArray);
    }
    if (targetArray.includes(action)) {
      return;
    }
    targetArray.push(action);
  }

  /**
   * @param identifier
   * @param action
   * @param target
   */
  disallow(identifier, action, target) {
    if (!this.map.has(identifier)) {
      return;
    }
    const identifierMap = this.map.get(identifier);
    if (!identifierMap.has(target)) {
      return;
    }
    const targetArray = identifierMap.get(target);
    const index = targetArray.indexOf(action);
    if (index === -1) {
      return;
    }
    targetArray.splice(index, 1);
  }

  /**
   * @param identifier
   * @param action
   * @param target
   * @returns {boolean}
   */
  can(identifier, action, target) {
    if (!this.map.has(identifier)) {
      return false;
    }
    const identifierMap = this.map.get(identifier);
    if (!identifierMap.has(target)) {
      return false;
    }
    const targetArray = identifierMap.get(target);
    return targetArray.includes(action);
  }

}

class WhoCan {

  /**
   * @param {{can: function, allow: function, disallow: function}} backer
   * @param {WhoCanOptions} options
   */
  constructor(backer, options) {
    /**
     * @type {WhoCanSingle}
     */
    this.backer = backer || new WhoCanSingle();
    /**
     * @type {WhoCanOptions}
     */
    this.options = options || {};
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   */
  async getOptions(identifier, actions, target, ...rest) {
    return {
      identifier: await (this.options.resolveValueOrReturn || resolveValueOrReturn)(identifier, this.options, ...rest),
      actions: await (this.options.getActions || getActions)(actions, this.options, ...rest),
      target: await (this.options.resolveValueOrReturn || resolveValueOrReturn)(target, this.options, ...rest)
    };
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   */
  async allow(identifier, actions, target, ...rest) {
    const options = await this.getOptions(identifier, actions, target, ...rest);
    await Promise.all(
      options.actions.map((action) => this.backer.allow(options.identifier, action, options.target, options, this.options))
    )
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   */
  async disallow(identifier, actions, target, ...rest) {
    const options = await this.getOptions(identifier, actions, target, ...rest);
    await Promise.all(
      options.actions.map((action) => this.backer.disallow(options.identifier, action, options.target, options, this.options))
    )
  }

  /**
   * @param {*|Promise|Function<*>} identifier
   * @param {*|[]|Promise|Function<*|[]>} actions
   * @param {*} target
   * @param {*} rest
   * @returns {boolean}
   */
  async can(identifier, actions, target, ...rest) {
    const options = await this.getOptions(identifier, actions, target, ...rest);
    const results = await Promise.all(
      options.actions.map((action) => this.backer.can(options.identifier, action, options.target, options, this.options))
    );
    return results.every(Boolean);
  }

}

if (typeof module !== 'undefined') {
  module.exports = WhoCan
} else if (typeof window !== 'undefined') {
  window.WhoCan = WhoCan;
}

/**
 * @typedef {object} WhoCanActionOptions
 * @property {*} identifier
 * @property {Array<*>} actions
 * @property {*} target
 */

/**
 * @typedef {object} WhoCanOptions
 * @property {Function} resolveValueOrReturn
 * @property {Function} getActions
 */