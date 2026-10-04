'use strict';

require('mocha');
const assert = require('assert');
const braces = require('..');
const { MAX_DEPTH } = require('../lib/constants');

const nested = (open, close, n, inner = 'a') => open.repeat(n) + inner + close.repeat(n);

describe('nesting depth guard (CVE-2026-93687)', () => {
  it('accepts brace nesting up to MAX_DEPTH', () => {
    const pattern = nested('{', '}', MAX_DEPTH);
    // Sin comas ni rangos un conjunto no se expande (semántica bash): queda literal.
    assert.deepStrictEqual(braces.expand(pattern), [pattern]);
    assert.strictEqual(typeof braces.compile(pattern), 'string');
    assert.strictEqual(typeof braces.stringify(braces.parse(pattern)), 'string');
    assert.doesNotThrow(() => braces(pattern));
  });

  it('rejects brace nesting beyond MAX_DEPTH with a SyntaxError in every entry point', () => {
    const pattern = nested('{', '}', MAX_DEPTH + 1);
    for (const fn of [braces.parse, braces.expand, braces.compile, braces.stringify, braces]) {
      assert.throws(() => fn(pattern), /Nesting depth exceeds maximum of 100/);
    }
  });

  it('rejects parenthesis nesting beyond MAX_DEPTH', () => {
    assert.doesNotThrow(() => braces.parse(nested('(', ')', MAX_DEPTH)));
    assert.throws(() => braces.parse(nested('(', ')', MAX_DEPTH + 1)), /Nesting depth exceeds maximum of 100/);
  });

  it('never surfaces a RangeError for deep input under the length limit', () => {
    const pattern = nested('{', '}', 4900);
    assert.ok(pattern.length < 10000);
    for (const fn of [braces.expand, braces.compile, braces.stringify]) {
      assert.throws(() => fn(pattern), err => err instanceof SyntaxError && !(err instanceof RangeError));
    }
  });

  it('guards caller-supplied ASTs in compile, expand and stringify', () => {
    const ast = { type: 'root', nodes: [] };
    let node = ast;
    for (let i = 0; i <= MAX_DEPTH + 1; i++) {
      const child = { type: 'brace', open: true, close: true, nodes: [] };
      node.nodes.push(child);
      node = child;
    }
    node.nodes.push({ type: 'text', value: 'a' });
    for (const fn of [braces.compile, braces.expand, braces.stringify]) {
      assert.throws(() => fn(ast), /Nesting depth exceeds maximum of 100/);
    }
  });
});
