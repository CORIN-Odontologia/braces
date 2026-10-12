'use strict';

require('mocha');
const assert = require('assert').strict;
const braces = require('..');

describe('compatibilidad de escapeInvalid con la protección de profundidad', () => {
  const literales = [
    '{1..10}', '{10..1..2}', '{01..05}', '{a..f..2}',
    '${var}', '{abc}', '{1..3..x}', '{a{b,c}d}',
    '{a..z}', '{{{{x}}}}', '{{{{}a}}}}'
  ];

  for (const input of literales) {
    it(`conserva el texto de stringify: ${input}`, () => {
      assert.equal(braces.stringify(input, { escapeInvalid: true }), input);
      assert.equal(braces.stringify(braces.parse(input), { escapeInvalid: true }), input);
    });
  }

  it('no agrega escapes al expandir variables o rangos inválidos literales', () => {
    for (const input of ['${var}', '{1..3..x}']) {
      assert.deepEqual(braces.expand(input, { escapeInvalid: true }), [input]);
    }
  });

  it('conserva el escape explícito de un nodo marcado inválido por el llamador', () => {
    assert.equal(braces.stringify({ type: 'open', value: '{', invalid: true }, { escapeInvalid: true }), '\\{');
    assert.equal(braces.stringify({ type: 'open', value: '{', invalid: true }), '{');
  });

  it('rechaza también un AST cíclico sin agotar la pila', () => {
    const ast = { type: 'root', nodes: [] };
    ast.nodes.push(ast);
    assert.throws(() => braces.stringify(ast, { escapeInvalid: true }), err =>
      err instanceof SyntaxError && /Nesting depth/.test(err.message));
  });
});
