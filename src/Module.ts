import {ModuleClass} from "./ModuleClass";
import {Map} from 'immutable';
import {ExportPojo, ModuleClassPojo, ModulePojo, ReferencePojo} from "./types";
import {Export} from "./Export";
import {Interface} from "./Interface";
import {namedTypes} from 'ast-types';
import {Reference} from "./Reference";

interface ExportArgs {
    localName: string;
    exportName: string;

}

class VariableReference extends Reference {

}

class Module {
    public name: string;
    public classes: Map<string, ModuleClass> = Map<string, ModuleClass>();
    public exports: Map<string, Export> = Map<string, Export>();
    public  imported: {};
    public  defaultExport: undefined | string;
    private interfaces: Map<string, Interface> = Map<string, Interface>();
    private references: Map<string, Reference> = Map<string, Reference>();

    public constructor(name: string) {
        this.name = name;
        this.imported = {};
        this.defaultExport = undefined;
    }

    public addExport(args: ExportArgs) {
        this.exports = this.exports.set(args.localName, new Export(args.exportName));
    }

    public getClassNames(): string[] {
        return Object.keys(this.classes);
    }

    public toPojo(): ModulePojo {
        // const c = {};
        // const e = {};
        // Object.keys(this.exported).forEach(k => {
        //     e[k] = this.exported[k].toPojo();
        // });
        // Object.keys(this.classes).forEach(cn => {
        //     const v = this.classes[cn];
        //     if(v.toPojo) {
        //         c[cn] = v.toPojo();
        //     } else {
        //         throw new Error('NoPojo');
        //     }
        // });
        // return {
        //     imported: this.imported,
        //     exported: e,
        //     name: this.name,
        //     classes: c,
        //     defaultExport: this.defaultExport
        // };
        const m: ModulePojo = {
            name: this.name,
            exports: this.exports.map((c: Export): ExportPojo => c.toPojo()),
            classes: this.classes.map((c: ModuleClass): ModuleClassPojo => c.toPojo()),
            references: this.references.map((c: Reference): ReferencePojo => c.toPojo()),
        };
        return m;
    }

    public getClass(name: any, createClass: boolean = false): ModuleClass {
        if(this.classes.has(name)) {
            const newVar = this.classes.get(name);
            if(newVar === undefined) {
                throw new Error('undefined class');
            }
            return newVar;
        } else if(createClass) {
            const c = new ModuleClass(name);
            this.classes.set(name, c);
            return c;
        } else {
            throw new Error('no such class');
        }
    }

    public toString(): string {
        return this.name;
    }

    public addImport(name: string, full: string, isDefault?: boolean): void {

    }

    public static fromPojo(v: ModulePojo) {
        const module1 = new Module(v.name);
        module1.exports = Map<string, ExportPojo>(v.exports).map((v: ExportPojo): Export => Export.fromPojo(v));
        return module1;
    }

    public addInterface(name: string) {
        this.interfaces = this.interfaces.set(name, new Interface(name));
    }

    public getReference(kind: "MemberExpression", objectname: any, Propertyname: string): void {


    }

    public getReference1(super_: namedTypes.Node) {//namedTypes.Identifier | namedTypes.FunctionExpression | namedTypes.ThisExpression | namedTypes.ArrayExpression | namedTypes.ObjectExpression | namedTypes.Literal | namedTypes.SequenceExpression | namedTypes.UnaryExpression | namedTypes.BinaryExpression | namedTypes.AssignmentExpression | namedTypes.MemberExpression | namedTypes.UpdateExpression | namedTypes.LogicalExpression | namedTypes.ConditionalExpression | namedTypes.NewExpression | namedTypes.CallExpression | namedTypes.ArrowFunctionExpression | namedTypes.YieldExpression | namedTypes.GeneratorExpression | namedTypes.ComprehensionExpression | namedTypes.ClassExpression | namedTypes.TaggedTemplateExpression | namedTypes.TemplateLiteral | namedTypes.AwaitExpression | namedTypes.JSXIdentifier | namedTypes.JSXExpressionContainer | namedTypes.JSXMemberExpression | namedTypes.JSXElement | namedTypes.JSXFragment | namedTypes.JSXText | namedTypes.JSXEmptyExpression | namedTypes.JSXSpreadChild | namedTypes.TypeCastExpression | namedTypes.DoExpression | namedTypes.Super | namedTypes.BindExpression | namedTypes.MetaProperty | namedTypes.ParenthesizedExpression | namedTypes.DirectiveLiteral | namedTypes.StringLiteral | namedTypes.NumericLiteral | namedTypes.BigIntLiteral | namedTypes.NullLiteral | namedTypes.BooleanLiteral | namedTypes.RegExpLiteral | namedTypes.PrivateName | namedTypes.Import | namedTypes.TSAsExpression | namedTypes.TSNonNullExpression | namedTypes.TSTypeParameter | namedTypes.TSTypeAssertion | namedTypes.OptionalMemberExpression | namedTypes.OptionalCallExpression | | AssignmentExpression | BinaryExpression | CallExpression | ConditionalExpression | FunctionExpression | Identifier | StringLiteral | NumericLiteral | NullLiteral | BooleanLiteral | RegExpLiteral | LogicalExpression | MemberExpression | NewExpression | ObjectExpression | SequenceExpression | ParenthesizedExpression | ThisExpression | UnaryExpression | UpdateExpression | ArrowFunctionExpression | ClassExpression | MetaProperty | Super | TaggedTemplateExpression | TemplateLiteral | YieldExpression | TypeCastExpression | JSXElement | JSXFragment | AwaitExpression | BindExpression | OptionalMemberExpression | PipelinePrimaryTopicReference | OptionalCallExpression | Import | DoExpression | BigIntLiteral | TSAsExpression | TSTypeAssertion | TSNonNullExpression) {
        const ref = new Reference(this);
        switch(super_.type) {
            case "Identifier":
                const name = (super_ as namedTypes.Identifier).name;
                ref.name = name;
                break;
            case "MemberExpression":
                const expressionKind = (super_ as namedTypes.MemberExpression).object;
                let objectExp: string;
                if (expressionKind.type === "Identifier") {
                    objectExp = expressionKind.name;
                } else {

                    throw new Error(expressionKind.type);
                }
                ref.name = objectExp;
                break;
            default:
                throw new Error(super_.type);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.references = this.references.set(ref.name!, ref);
        return 'x';
    }
}
export { Module };
