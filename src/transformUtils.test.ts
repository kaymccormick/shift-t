import { TransformUtils } from './transformUtils';
import { Connection } from 'typeorm';
import { fromNodes } from "jscodeshift/src/Collection";
import { EntityCore } from "classModel";

jest.mock('typeorm');
jest.mock('jscodeshift/src/Collection');

beforeEach(() => {
    Connection.mockClear();
    fromNodes.mockClear();
});

test('1', () => {
    return TransformUtils.processClassDeclarations(new Connection(),
        module, fromNodes());
});
