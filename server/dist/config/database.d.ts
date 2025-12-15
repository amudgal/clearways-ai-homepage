import { Pool } from 'pg';
export declare const pool: Pool;
export declare const query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
export declare const getClient: () => Promise<import("pg").PoolClient>;
//# sourceMappingURL=database.d.ts.map