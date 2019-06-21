import {PojoBuilder, TypePojo} from "./types";
import {namedTypes} from "ast-types/gen/namedTypes";
import {builders} from "ast-types";

export class Type  implements  PojoBuilder<TypePojo>{
    private node: namedTypes.Node;
    public constructor(nodeType: string, node: namedTypes.Node) {
        this.nodeType = nodeType;
        this.node = node;
    }
    private nodeType: string;
    protected _checkNodeType(node: namedTypes.Node): string {
        const nodeType = node.type;
        if(nodeType === "TypeAnnotation") {
            throw new Error('hi');
        } else if(nodeType === "TSTypePredicate") {
            return 'predicate';
        } else if (nodeType === "TSTypeAnnotation") {
            const ann = (this.node as namedTypes.TSTypeAnnotation).typeAnnotation; // K.TSTypeKind | K.TSTypeAnnotationKind;
            return 'annotation ' + this._checkNodeType(ann);
        } else if(nodeType === 'TSTypeReference') {
            const typeName1 = (node as namedTypes.TSTypeReference).typeName;
            if (typeName1.type === 'Identifier') {
                return 'reference ' + typeName1.name;
            } else {
                throw new Error(typeName1.type);
            }/*
    } else  if (nodeType === "TSTypeReference") {
        if (nodeTypeName.type === 'Identifier') {
            return nodeTypeName.name || 'x';
        } else {
            throw new Error(nodeTypeName.type);
        }
        //console.log('zz ' + nodeTypeName.type);
  */  } else if (nodeType === 'TSAnyKeyword') {
            return 'any';
        } else if (nodeType === 'TSArrayType') {
            // @ts-ignore
            return this._checkNodeType(node.elementType) + '[]';

        } else if (nodeType === 'TSTypeLiteral') {
            return node.members.map(member => member.type).join(' ');
        } else if (nodeType === 'TSNumberKeyword') {
            return 'number';
        } else if (nodeType === 'TSStringKeyword') {
            return 'string';
        } else if (nodeType === 'TSBooleanKeyword') {
            return 'boolean';
        } else if (nodeType === 'TSUnionType') {
            return 'union';
        } else if (nodeType === 'TSParenthesizedType') {
            return 'parenthesized';
        } else if (nodeType === 'TSFunctionType') {
            return 'function'
        } else {
            throw new Error(nodeType);
        }
    }

    public toPojo(): TypePojo {
        return { nodeType: this.nodeType };
    }

    public static fromPojo(type: TypePojo): Type {
        return new Type(type.nodeType, builders[type.nodeType]());
    }
}

