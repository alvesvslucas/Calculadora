import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// Execute app.js unchanged. Only the DOM and browser event dispatch are simulated.
const root = resolve(process.env.CALCULATOR_SOURCE_DIR || fileURLToPath(new URL('../', import.meta.url)));
const source = readFileSync(resolve(root, 'app.js'), 'utf8');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

function calculator() {
  let displayText = '';
  const display = {
    get innerText() { return displayText; },
    set innerText(value) { displayText = String(value); },
  };
  const documentListeners = new Map();
  const buttons = [...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)]
    .filter(([, attributes]) => /class="[^"]*\bbutton\b[^"]*"/.test(attributes))
    .map(([, , label]) => {
      const listeners = new Map();
      return {
        innerText: label.trim(),
        addEventListener(type, listener) { listeners.set(type, listener); },
        click() {
          assert.ok(listeners.has('click'), 'The real script registers the button listener.');
          listeners.get('click')({ target: this });
        },
      };
    });
  assert.ok(buttons.length > 0, 'Buttons are read from the real HTML.');

  const document = {
    getElementById(id) {
      assert.equal(id, 'tela');
      return display;
    },
    getElementsByClassName(name) {
      assert.equal(name, 'button');
      return buttons;
    },
    addEventListener(type, listener) { documentListeners.set(type, listener); },
  };
  vm.runInNewContext(source, { document }, { filename: resolve(root, 'app.js'), timeout: 1_000 });
  assert.ok(documentListeners.has('DOMContentLoaded'));
  documentListeners.get('DOMContentLoaded')();

  return {
    read: () => display.innerText,
    click(label) {
      const button = buttons.find(item => item.innerText === label);
      assert.ok(button, 'Button exists in index.html: ' + label);
      button.click();
    },
    key(key) {
      assert.ok(documentListeners.has('keydown'));
      let prevented = false;
      documentListeners.get('keydown')({ key, preventDefault() { prevented = true; } });
      return prevented;
    },
  };
}

test('2X3X4 pelos botões calcula 24 com todas as multiplicações', () => {
  const app = calculator();
  for (const label of ['2', 'X', '3', 'X', '4', '=']) app.click(label);
  assert.equal(app.read(), '24');
});

for (const [name, sequence, expected] of [
  ['soma', ['2', '+', '3', '='], '5'],
  ['subtração', ['9', '-', '4', '='], '5'],
  ['multiplicação', ['6', 'X', '7', '='], '42'],
  ['divisão', ['8', '/', '2', '='], '4'],
]) {
  test('operação básica: ' + name, () => {
    const app = calculator();
    for (const label of sequence) app.click(label);
    assert.equal(app.read(), expected);
  });
}

test('teclado registra operadores e Enter calcula a expressão', () => {
  const app = calculator();
  for (const key of ['2', '*', '3', '*', '4', 'Enter']) assert.equal(app.key(key), true);
  assert.equal(app.read(), '24');
});

test('botão ESC limpa a expressão', () => {
  const app = calculator();
  for (const label of ['2', '+', '3', 'ESC']) app.click(label);
  assert.equal(app.read(), '');
});

test('Escape limpa pelo teclado', () => {
  const app = calculator();
  for (const key of ['9', '-', '2', 'Enter', 'Escape']) app.key(key);
  assert.equal(app.read(), '');
});

test('Backspace remove somente o último caractere', () => {
  const app = calculator();
  for (const key of ['1', '2', '3', 'Backspace']) app.key(key);
  assert.equal(app.read(), '12');
  app.key('Enter');
  assert.equal(app.read(), '12');
});

test('expressão incompleta exibe Erro e permite novo cálculo após limpar', () => {
  const app = calculator();
  for (const key of ['2', '+', 'Enter']) app.key(key);
  assert.equal(app.read(), 'Erro');
  for (const key of ['Escape', '6', '/', '3', 'Enter']) app.key(key);
  assert.equal(app.read(), '2');
});
