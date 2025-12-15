"use strict";
// Database Configuration - AWS RDS PostgreSQL Connection
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
// Create connection pool
exports.pool = new pg_1.Pool(dbConfig);
// Test database connection
exports.pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});
exports.pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});
// Helper function to execute queries
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await exports.pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};
exports.query = query;
// Helper function to get a client from the pool for transactions
const getClient = async () => {
    const client = await exports.pool.connect();
    const query = client.query.bind(client);
    const release = client.release.bind(client);
    // Set a timeout on the client
    const timeout = setTimeout(() => {
        console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);
    client.release = () => {
        clearTimeout(timeout);
        return release();
    };
    return client;
};
exports.getClient = getClient;
//# sourceMappingURL=database.js.map