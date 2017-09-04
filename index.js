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

/**
 * @param {string|number|Array<string|number>|Promise|Function<string|number|Array<string|number>>} resolver
 * @returns {string|number|Array<string|number>}
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
 * Returns actions as an array of string|numbers
 * @param {string|number|Array<string|number>|Function<string|number|Array<string|number>>} value
 * @param {WhoCanOptions} options
 * @returns {Array<string|number>}
 */
async function getActions(value, options) {
  const resolved = await (options.resolveValueOrReturn || resolveValueOrReturn)(value);
  if (typeof resolved === 'string' || typeof resolved === 'number') {
    return [ resolved ];
  }
  if (!Array.isArray(resolved)) {
    throw new Error('Expected action to be an array or a string|number');
  }
  const allValid = resolved.every((item) => typeof item === 'string' || typeof item === 'number');
  if (!allValid) {
    throw new Error('Expected action to be an array or a string|number');
  }
  return resolved;
}

class WhoCanSingle {

  constructor() {
    this.map = {};
  }

  /**
   *
   * @param {string|number} identifier
   * @param {string|number} action
   * @param {string|number} target
   */
  allow(identifier, action, target) {
    this.map[identifier] = this.map[identifier] || {};
    this.map[identifier][target] = this.map[identifier][target] || [];
    if (this.map[identifier][target].includes(action)) {
      return;
    }
    this.map[identifier][target].push(action);
  }

  /**
   *
   * @param {string|number} identifier
   * @param {string|number} action
   * @param {string|number} target
   */
  disallow(identifier, action, target) {
    this.map[identifier] = this.map[identifier] || {};
    this.map[identifier][target] = this.map[identifier][target] || [];
    const index = this.map[identifier][target].indexOf(action)
    if (index === -1) {
      return;
    }
    this.map[identifier][target].splice(index, 1);
  }

  /**
   *
   * @param {string|number} identifier
   * @param {string|number} action
   * @param {string|number} target
   * @returns {boolean}
   */
  can(identifier, action, target) {
    return (
      this.map[identifier] &&
      this.map[identifier][target] &&
      this.map[identifier][target].includes(action)
    ) || false
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
   * @param {string|number|Promise|Function<string|number>} identifier
   * @param {string|number|Array<string|number>|Promise|Function<string|number|Array<string|number>|*>} actions
   * @param {string|number|Promise|Function<string|number>} target
   * @returns {WhoCanActionOptions}
   */
  async getOptions(identifier, actions, target) {
    const options = {
      identifier: await (this.options.resolveValueOrReturn || resolveValueOrReturn)(identifier),
      actions: await (this.options.getActions || getActions)(actions, this.options),
      target: await (this.options.resolveValueOrReturn || resolveValueOrReturn)(target)
    };
    if (typeof options.identifier !== 'string' && typeof options.identifier !== 'number') {
      throw new Error('Expected identifier to be a string or number');
    }
    if (typeof options.target !== 'string' && typeof options.identifier !== 'number') {
      throw new Error('Expected target to be a string or number');
    }
    return options;
  }

  /**
   * @param {string|number|Promise|Function<string|number>} identifier
   * @param {string|number|Array<string|number>|Promise|Function<string|number|Array<string|number>>} actions
   * @param {string|number|Promise|Function<string|number>} target
   * @param {*} rest
   */
  async allow(identifier, actions, target, ...rest) {
    const options = await this.getOptions(identifier, actions, target, ...rest);
    await Promise.all(
      options.actions.map((action) => this.backer.allow(options.identifier, action, options.target, options, this.options))
    )
  }

  /**
   * @param {string|number|Promise|Function<string|number>} identifier
   * @param {string|number|Array<string|number>|*|Promise|Function<string|number|Array<string|number>>} actions
   * @param {string|number|Promise|Function<string|number>} target
   * @param {*} rest
   */
  async disallow(identifier, actions, target, ...rest) {
    const options = await this.getOptions(identifier, actions, target, ...rest);
    await Promise.all(
      options.actions.map((action) => this.backer.disallow(options.identifier, action, options.target, options, this.options))
    )
  }

  /**
   * @param {string|number|Promise|Function<string|number>} identifier
   * @param {string|number|Array<string|number>|Promise|Function<string|number|Array<string|number>>} actions
   * @param {string|number|Promise|Function<string|number>} target
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
 * @property {string|number} identifier
 * @property {Array<string|number>} actions
 * @property {string|number} target
 */

/**
 * @typedef {object} WhoCanOptions
 * @property {Function} resolveValueOrReturn
 * @property {Function} getActions
 */