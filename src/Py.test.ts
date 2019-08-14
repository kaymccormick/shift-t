import * as Py from '../src/Py';

test('1', () => {
  const ary = new Py.PyArray();
  expect(ary).toBeDefined();
  expect(ary).toHaveLength(0);
  ary.append(1)
  expect(ary).toHaveLength(1);
  expect(ary[0]).toBe(1);
  ary.extend([3, 4])
  expect(ary).toHaveLength(3);
  expect(ary[1]).toBe(3);
  expect(ary[2]).toBe(4);
  const ary2 = ary.map(x => new Py.PyArray(x));
  expect(ary2).toMatchSnapshot();
  });
