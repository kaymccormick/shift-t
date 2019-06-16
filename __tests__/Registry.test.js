import { Registry, SimpleRegistry } from '../src/Registry';

test('1', () => {
    const r = new SimpleRegistry({runId: 0});
    r.init();
    const module = r.getModule('test', true);
    expect(r.getModule('test')).toStrictEqual(module);
    r.save();
});
