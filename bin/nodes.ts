/**
 * Perform code generation procedures based on the type information stored
 * in the classModel database.
 */
import {Promise} from 'bluebird';
import { Map, List } from 'immutable';
import fs from 'fs';
import {namedTypes} from 'ast-types/gen/namedTypes';
import * as k from 'ast-types/gen/kinds';
import {builders as b} from 'ast-types';
import {print} from 'recast';
import EntityCore from "classModel/lib/src/entityCore";
import {createConnection} from "../src/TypeOrm/Factory";
import { Connection } from 'typeorm';
import  winston, { format } from 'winston';
import { Pojo } from 'classModel';

const outStream = fs.createWriteStream('out.graph', { encoding: 'utf-8'});
//outStream = process.stdout;
console.log = (arg): void => { process.stderr.write(`${arg}\n`); };

outStream.write('digraph \{\n');

const consoleTransport  = new winston.transports.Console(
    {level: 'debug'});
const file = new winston.transports.File({level: 'debug', filename:
      'nodes.log'})
const loggerTransports = [consoleTransport, file];
const logger = winston.createLogger({format: format.json(),
    transports:loggerTransports});

createConnection(logger).then((connection: Connection): Promise<void> => {
    const projectRepo = connection.getRepository(EntityCore.Project);
    return projectRepo.find({ relations: ['modules', 'modules.classes', 'modules.classes.superClass', 'modules.classes.superClass.module', 'modules.classes.subClasses', 'modules.classes.subClasses.module'], where: {name: 'docutils-js'}}).then((projects): never|EntityCore.Project => {
        if(!projects.length) {
            throw new Error(`couldn't find project`);
        }
        return projects[0];
    }).then((project): void => {
        let classIdMap= Map<number, EntityCore.Class>();
        let childrenMap = Map<number, List<number>>();
        let cary = Map<string, Map<string, EntityCore.Class>>();
        if(!project.modules) {
            return;
        }
	    project.modules.forEach((m): void => {
	      if(!m.classes) {
	      return;
	      }
	      let mod = Map<string, EntityCore.Class>();
	      m.classes.forEach((c: EntityCore.Class): void => {
	      if(!c || !c.name) {
	      return;
	      }
	      if(c.superClassId) {
	        if(!childrenMap.has(c.superClassId)) {
		  childrenMap = childrenMap.set(c.superClassId, List<number>([c.id!]));
		  } else {
		  childrenMap = childrenMap.set(c.superClassId,childrenMap.get(c.superClassId)!.push(c.id!));
		  }
		  }
	        classIdMap = classIdMap.set(c.id!, c);
	        mod = mod.set(c.name, c);
            });
            cary = cary.set(m.name!, mod);
        });

        const nodes = cary.get('src/nodes');
	    if(!nodes) {
	    return;
	    }
	    const node = nodes.get('Node');
	    const findLeaves = (cn: EntityCore.Class, leaves: EntityCore.Class[]) => {
	    const x = childrenMap.get(cn.id!);
	    if(!x|| x.count() === 0) {
	      leaves.push(cn);
	      } else {
	      x.forEach(id => {
	        findLeaves(classIdMap.get(id!)!, leaves);
                });
            }
        };
        const isa = (cid: number , d_: EntityCore.Class): boolean =>{
            //	console.log(`checking to see that ${d_.name} is not an instance of ${cid}`);
            const c_ = classIdMap.get(cid);
            if(!c_) {
                throw new Error('');
            }
            let c2: EntityCore.Class|undefined = d_;
            while(c2) {
                //	console.log(`checking ${c2.id} againsg ${cid}`);
	  if(c2.id === cid) {
	    return true;
	  }
	  if(!c2.superClassId) {
	  c2 = undefined;
	  } else{
	    c2 = classIdMap.get(c2.superClassId);
	 }
            }
            return false;
        };

        const textClass = nodes.get('Text')!;
        const textElementClass = nodes.get('TextElement')!;
        const elementClass = nodes.get('Element')!;
	  
        const leaves: EntityCore.Class[]= [];
        findLeaves(node!, leaves);
	const typesFile:namedTypes.File = b.file(b.program([b.importDeclaration([b.importNamespaceSpecifier(b.identifier('nodes'))], b.stringLiteral('./nodes'), 'value'), 		b.exportDeclaration(true, b.objectExpression(
		        leaves.map(l => {
           
        const file: namedTypes.File =
		b.file(b.program([
		b.importDeclaration([b.importSpecifier(b.identifier('NodeInterface')), b.importSpecifier(b.identifier('Attributes'))], b.stringLiteral('./types'), 'value'),
		b.importDeclaration([b.importNamespaceSpecifier(b.identifier('nodes'))], b.stringLiteral('./nodes'), 'value'),
		b.exportDeclaration(true, b.objectExpression(
		        leaves.map(l => {
		            //			console.log(JSON.stringify(l.astNode));
		            const p: k.PatternKind[] = [];
		            const a: k.ExpressionKind[] = [];
		            if(l.name ==='Text') {
		                p.push(b.identifier.from({
		                name: 'data', optional: false,
		                typeAnnotation:b.tsTypeAnnotation(b.tsStringKeyword())}));
		                a.push(b.identifier('data'));
		            }
		            p.push(	b.identifier.from({
		                name: 'rawsource', optional: true,
		                typeAnnotation:b.tsTypeAnnotation(b.tsStringKeyword())}) );
		            a.push(b.identifier('rawsource'));

		            if(isa(textElementClass.id!, l)) {
		                p.push(b.identifier.from({ name: 'text', optional: true, typeAnnotation: b.tsTypeAnnotation(b.tsStringKeyword())}));
		                a.push(b.identifier('text'));
		            }

		            if(isa(elementClass.id!, l)) {
		                //			console.log('children');
		                p.push(b.assignmentPattern(
		            b.identifier.from({ name: 'children', typeAnnotation: b.tsTypeAnnotation(b.tsArrayType(b.tsTypeReference(b.identifier('NodeElement')))) }),
			    b.arrayExpression([])),
		                b.assignmentPattern(
		            b.identifier.from({ name: 'attributes', typeAnnotation: b.tsTypeAnnotation(b.tsTypeReference(b.identifier('Attributes')))}),
			    b.objectExpression([])));
		                a.push(b.identifier('children'), b.identifier('attributes'));
		            }

//l			    p[p.length - 1].comments = [b.commentLine('eslint-disable-next-line @typescript-eslint/camelcase', true, false)];
		            const prop = b.property("init",
		            b.identifier(l.name!),
		            b.arrowFunctionExpression.from({ returnType: b.tsTypeAnnotation.from({ typeAnnotation: b.tsTypeReference(b.tsQualifiedName.from({comments: [b.commentLine('eslint-disable-next-line @typescript-eslint/camelcase', true, false)], left: b.identifier('nodes'), right: b.identifier(l.name!) }))}),
			    params: p, body: b.newExpression(b.memberExpression(b.identifier('nodes'),
		                b.identifier(l.name!)), a) }));
		            prop.comments = [b.commentLine('eslint-disable-next-line @typescript-eslint/camelcase')];
			    return prop;
			    })))]));


        fs.writeFileSync('factory.ts', print(file).code, 'utf-8');
        console.log(`leaves is ${leaves.map(l => l.name)}`);
	    
        /*            const nm = project.modules!.find((m) => {
                return m.name && m.name.endsWith('src/nodes');
            });
	    const classRepo = connection.getRepository(EntityCore.Class);
	    return classRepo.find({relations: ['superClass'], where: {moduleId: nm!.id}}).then(classes => { classes.forEach(c => { outStream.write(` "${c.name}"${c.superClass ? ` -> ${c.superClass.name!}` : ''};\n`); }); });
	    */

    }).then(() => {
        outStream.write('\n\}\n');
        outStream.close();
        return connection.close();
    });
});

