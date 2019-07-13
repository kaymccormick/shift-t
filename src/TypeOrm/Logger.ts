/** Typeorm logger */
import { Logger as WinstonLogger } from 'winston';
import {Logger as BaseLogger, QueryRunner} from 'typeorm';
export class Logger implements BaseLogger {
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    public constructor(private logger: WinstonLogger) {
    }
    public logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
        this.logger.debug({logger: true, query, parameters});
    }

    public logQueryError(error: string, query: string, parameters?: any[], queryRunner?: QueryRunner): void {
    }
    public logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): void { }
    public logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
    }
    public logMigration(message: string, queryRunner?: QueryRunner): void {
    }
    public log(level: "log" | "info" | "warn", message: any, queryRunner?: QueryRunner): void {
        const myLevel = level === "log" ? "debug" : level === "info" ? "info" : level === "warn" ? "warning" : "info";
        this.logger.log(myLevel, message);
    }
}

