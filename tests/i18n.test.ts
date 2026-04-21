import { describe, expect, it } from 'vitest';
import { createTranslator, type Dict, EN } from '../src/i18n.ts';

describe('createTranslator', () => {
  it('returns the dict value for a known key', () => {
    const t = createTranslator({ hello: 'Hello' });
    expect(t('hello')).toBe('Hello');
  });

  it('returns {key} for a missing key with no fallback', () => {
    const t = createTranslator({ hello: 'Hello' });
    expect(t('missing')).toBe('{missing}');
  });

  it('falls back to the second dict when the primary misses', () => {
    const primary: Dict = { hello: 'Hola' };
    const fallback: Dict = { hello: 'Hello', bye: 'Bye' };
    const t = createTranslator(primary, fallback);
    expect(t('hello')).toBe('Hola');
    expect(t('bye')).toBe('Bye');
  });

  it('returns {key} when both primary and fallback miss', () => {
    const t = createTranslator({ hello: 'Hola' }, { bye: 'Adios' });
    expect(t('missing')).toBe('{missing}');
  });

  it('substitutes {name} variables', () => {
    const t = createTranslator({ greet: 'Hello, {name}!' });
    expect(t('greet', { name: 'Ada' })).toBe('Hello, Ada!');
  });

  it('substitutes multiple variables', () => {
    const t = createTranslator({ pair: '{a} and {b}' });
    expect(t('pair', { a: 'x', b: 'y' })).toBe('x and y');
  });

  it('leaves unknown placeholders intact when the var is missing', () => {
    const t = createTranslator({ greet: 'Hello, {name}!' });
    expect(t('greet', {})).toBe('Hello, {name}!');
  });

  it('substitutes in fallback values too', () => {
    const t = createTranslator({}, { greet: 'Hi, {name}' });
    expect(t('greet', { name: 'Zed' })).toBe('Hi, Zed');
  });

  it('returns the template unchanged when no vars are passed', () => {
    const t = createTranslator({ greet: 'Hello, {name}!' });
    expect(t('greet')).toBe('Hello, {name}!');
  });

  it('handles unicode keys and values', () => {
    const t = createTranslator({ 日本語: 'こんにちは、{名前}さん' });
    expect(t('日本語', { 名前: '太郎' })).toBe('こんにちは、太郎さん');
    expect(t('不明')).toBe('{不明}');
  });
});

describe('EN dict', () => {
  it('ships a small set of default English strings', () => {
    expect(EN['share.title']).toBe('Share this document');
    expect(Object.keys(EN).length).toBeGreaterThanOrEqual(3);
  });
});
