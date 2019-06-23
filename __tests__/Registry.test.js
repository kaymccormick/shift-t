import {Registry} from "../src/types";
import {SimpleRegistry} from "../src/SimpleRegistry";

test('1', () => {
    const r = new SimpleRegistry({runId: 0});
    r.init();
    const module = r.getModule('test', true);
    expect(r.getModule('test')).toStrictEqual(module);
    r.save();
});

test('2', () => {
    const r = new SimpleRegistry({load: true});
    r.init();
    expect(r).toMatchSnapshot();
})

