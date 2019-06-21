import { SimpleRegistry } from '../src/Registry';
import {Registry} from "../src/types";

test('1', () => {
    const r = new SimpleRegistry({runId: 0});
    r.init();
    const module = r.getModule('test', true);
    expect(r.getModule('test')).toStrictEqual(module);
    r.save();
});
