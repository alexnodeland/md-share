import { describe, expect, it } from 'vitest';
import { createUndoStack, type UndoSnapshot } from '../src/undoStack.ts';

const snap = (value: string, selectionStart = 0, selectionEnd = 0): UndoSnapshot => ({
  value,
  selectionStart,
  selectionEnd,
});

describe('createUndoStack', () => {
  it('starts empty: canUndo and canRedo both false', () => {
    const s = createUndoStack();
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });

  it('undo returns null when past is empty', () => {
    const s = createUndoStack();
    expect(s.undo(snap('anything'))).toBeNull();
  });

  it('redo returns null when future is empty', () => {
    const s = createUndoStack();
    expect(s.redo(snap('anything'))).toBeNull();
  });

  it('push then undo returns the pushed snapshot', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    const prev = s.undo(snap('b'));
    expect(prev).toEqual(snap('a'));
  });

  it('push tracks canUndo true and canRedo false', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    expect(s.canUndo()).toBe(true);
    expect(s.canRedo()).toBe(false);
  });

  it('after undo, canRedo becomes true', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    s.undo(snap('b'));
    expect(s.canRedo()).toBe(true);
    expect(s.canUndo()).toBe(false);
  });

  it('redo returns what was passed to undo', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    s.undo(snap('b'));
    const next = s.redo(snap('a'));
    expect(next).toEqual(snap('b'));
  });

  it('undo/redo round-trip over multiple snapshots', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    s.push(snap('b'));
    s.push(snap('c'));
    expect(s.undo(snap('d'))).toEqual(snap('c'));
    expect(s.undo(snap('c'))).toEqual(snap('b'));
    expect(s.undo(snap('b'))).toEqual(snap('a'));
    expect(s.undo(snap('a'))).toBeNull();
    expect(s.redo(snap('a'))).toEqual(snap('b'));
    expect(s.redo(snap('b'))).toEqual(snap('c'));
    expect(s.redo(snap('c'))).toEqual(snap('d'));
    expect(s.redo(snap('d'))).toBeNull();
  });

  it('pushing after undo clears the future (breaks redo)', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    s.push(snap('b'));
    s.undo(snap('c'));
    expect(s.canRedo()).toBe(true);
    s.push(snap('d'));
    expect(s.canRedo()).toBe(false);
    expect(s.redo(snap('x'))).toBeNull();
  });

  it('respects maxSize by evicting oldest past snapshots', () => {
    const s = createUndoStack(3);
    s.push(snap('a'));
    s.push(snap('b'));
    s.push(snap('c'));
    s.push(snap('d'));
    expect(s.undo(snap('x'))).toEqual(snap('d'));
    expect(s.undo(snap('d'))).toEqual(snap('c'));
    expect(s.undo(snap('c'))).toEqual(snap('b'));
    expect(s.undo(snap('b'))).toBeNull();
  });

  it('clear wipes both past and future', () => {
    const s = createUndoStack();
    s.push(snap('a'));
    s.undo(snap('b'));
    expect(s.canRedo()).toBe(true);
    s.clear();
    expect(s.canUndo()).toBe(false);
    expect(s.canRedo()).toBe(false);
  });

  it('uses the default maxSize of 200 when unspecified', () => {
    const s = createUndoStack();
    for (let i = 0; i < 250; i++) s.push(snap(String(i)));
    for (let i = 249; i >= 50; i--) {
      expect(s.undo(snap('x'))).toEqual(snap(String(i)));
    }
    expect(s.undo(snap('x'))).toBeNull();
  });
});
