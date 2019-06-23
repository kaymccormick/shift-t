import {ModuleClass} from "./ModuleClass";
import {Map} from 'immutable';
import {ExportPojo, ImportPojo, ModuleClassPojo, ModulePojo, ReferencePojo} from "./types";
import {Export} from "./Export";
import {Interface} from "./Interface";
import {namedTypes} from 'ast-types';
import {Reference} from "./Reference";
import {Import} from "./Import";

interface ExportArgs {
    localName: string;
    exportName: string|undefined;
    isDefaultExport?: boolean;
}

class VariableReference extends Reference {

}

class Module {
    public key: string;
    public name: string;
    public classes: Map<string, ModuleClass> = Map<string, ModuleClass>();
    public exports: Map<string, Export> = Map<string, Export>();
    public imports: Map<string, Import> = Map<string, Import>();
    public defaultExport: undefined | string = undefined;
    public interfaces: Map<string, Interface> = Map<string, Interface>();
    public references: Map<string, Reference> = Map<string, Reference>();

    public constructor(key: string, name: string) {
        this.key = key;
        this.name = name;
    }

    public addExport(args: ExportArgs) {
        this.exports = this.exports.set(args.localName, new Export(args.localName, args.exportName, args.isDefaultExport));
    }

    public getClassNames(): string[] {
        return Object.keys(this.classes);
    }

    public toPojo(): ModulePojo {
        const m: ModulePojo = {
            name: this.name,
	    key: this.key,
            exports: this.exports.map((c: Export): ExportPojo => c.toPojo()),
            imports: this.imports.map((c: Import): ImportPojo => c.toPojo()),
            classes: this.classes.map((c: ModuleClass): ModuleClassPojo => c.toPojo()),
            references: this.references.map((c: Reference): ReferencePojo => c.toPojo()),
        };
        return m;
    }

    public getClass(name: string, createClass: boolean = false): ModuleClass {
        if(this.classes.has(name)) {
            const newVar = this.classes.get(name);
            if(newVar === undefined) {
                throw new Error('undefined class');
            }
            return newVar;
        } else if(createClass) {
            const c = new ModuleClass(name, this.key);
            this.classes = this.classes.set(name, c);
            return c;
        } else {
            throw new Error('no such class');
        }
    }

    public toString(): string {
        return this.name;
    }

    public addImport(name: string, full: string, isDefault?: boolean, isNamespaceImport?: boolean): Import {
        const import1 = new Import(name, full, isDefault || false, isNamespaceImport ||false);
        this.imports = this.imports.set(name, import1);
        return import1;
    }

    public static fromPojo(v: ModulePojo) {
        const module1 = new Module(v.key, v.name);
        module1.exports = Map<string, ExportPojo>(v.exports).map((v: ExportPojo): Export => Export.fromPojo(v));
        module1.classes = Map<string, ModuleClassPojo>(v.classes).map((v: ModuleClassPojo): ModuleClass => ModuleClass.fromPojo(v));
        module1.imports  =Map<string, ImportPojo>(v.imports).map((v: ImportPojo): Import => Import.fromPojo(v));
        module1.references =Map<string, ReferencePojo>(v.references).map((v: ReferencePojo): Reference=> Reference.fromPojo(v));
        return module1;
    }

    public addInterface(name: string) {
        this.interfaces = this.interfaces.set(name, new Interface(name));
    }

    public getReference(kind: "MemberExpression", objectname: any, Propertyname: string): void {


    }

    public getReference1(super_: namedTypes.Node): Reference {//namedTypes.Identifier | namedTypes.FunctionExpression | namedTypes.ThisExpression | namedTypes.ArrayExpression | namedTypes.ObjectExpression | namedTypes.Literal | namedTypes.SequenceExpression | namedTypes.UnaryExpression | namedTypes.BinaryExpression | namedTypes.AssignmentExpression | namedTypes.MemberExpression | namedTypes.UpdateExpression | namedTypes.LogicalExpression | namedTypes.ConditionalExpression | namedTypes.NewExpression | namedTypes.CallExpression | namedTypes.ArrowFunctionExpression | namedTypes.YieldExpression | namedTypes.GeneratorExpression | namedTypes.ComprehensionExpression | namedTypes.ClassExpression | namedTypes.TaggedTemplateExpression | namedTypes.TemplateLiteral | namedTypes.AwaitExpression | namedTypes.JSXIdentifier | namedTypes.JSXExpressionContainer | namedTypes.JSXMemberExpression | namedTypes.JSXElement | namedTypes.JSXFragment | namedTypes.JSXText | namedTypes.JSXEmptyExpression | namedTypes.JSXSpreadChild | namedTypes.TypeCastExpression | namedTypes.DoExpression | namedTypes.Super | namedTypes.BindExpression | namedTypes.MetaProperty | namedTypes.ParenthesizedExpression | namedTypes.DirectiveLiteral | namedTypes.StringLiteral | namedTypes.NumericLiteral | namedTypes.BigIntLiteral | namedTypes.NullLiteral | namedTypes.BooleanLiteral | namedTypes.RegExpLiteral | namedTypes.PrivateName | namedTypes.Import | namedTypes.TSAsExpression | namedTypes.TSNonNullExpression | namedTypes.TSTypeParameter | namedTypes.TSTypeAssertion | namedTypes.OptionalMemberExpression | namedTypes.OptionalCallExpression | | AssignmentExpression | BinaryExpression | CallExpression | ConditionalExpression | FunctionExpression | Identifier | StringLiteral | NumericLiteral | NullLiteral | BooleanLiteral | RegExpLiteral | LogicalExpression | MemberExpression | NewExpression | ObjectExpression | SequenceExpression | ParenthesizedExpression | ThisExpression | UnaryExpression | UpdateExpression | ArrowFunctionExpression | ClassExpression | MetaProperty | Super | TaggedTemplateExpression | TemplateLiteral | YieldExpression | TypeCastExpression | JSXElement | JSXFragment | AwaitExpression | BindExpression | OptionalMemberExpression | PipelinePrimaryTopicReference | OptionalCallExpression | Import | DoExpression | BigIntLiteral | TSAsExpression | TSTypeAssertion | TSNonNullExpression) {
        const ref = new Reference();
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
                let propertyExp: string|undefined = undefined;
                const exp2 = (super_ as namedTypes.MemberExpression).property;
                if(exp2.type === "Identifier") {
                    propertyExp = exp2.name;
                }
                if(propertyExp !== undefined) {
                    ref.property = propertyExp;
                }
                break;
            default:
                throw new Error(super_.type);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.references = this.references.set(ref.name!, ref);
        return ref;
    }
}
export { Module };
