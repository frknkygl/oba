import { serialize, deserialize } from '../sim/state.js';
export const KEY = 'oba-kayit-1';
const def = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export function load(storage = def()) { try { return deserialize(storage.getItem(KEY)); } catch { return null; } }
export function store(s, storage = def()) { try { storage.setItem(KEY, serialize(s)); return true; } catch { return false; } }
export function clear(storage = def()) { try { storage.removeItem(KEY); } catch { /* depolama kapalı */ } }
