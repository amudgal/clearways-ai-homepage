"use strict";
// Database Configuration - AWS RDS PostgreSQL Connection
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = exports.query = exports.testConnection = exports.pool = void 0;
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
    connectionTimeoutMillis: 10000, // Increased to 10 seconds
    statement_timeout: 30000, // 30 seconds for query timeout
    query_timeout: 30000, // 30 seconds for query timeout
};
// Create connection pool
exports.pool = new pg_1.Pool(dbConfig);
// Test database connection on startup
const testConnection = async () => {
    try {
        const client = await exports.pool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connection test successful:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ Database connection test failed:', error.message);
        console.error('Connection details:', {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            ssl: process.env.DB_SSL,
        });
        return false;
    }
};
exports.testConnection = testConnection;
// Test database connection
exports.pool.on('connect', (client) => {
    console.log('✅ Connected to PostgreSQL database');
});
exports.pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    // Don't exit process, just log the error
    // The pool will handle reconnection
});
// Validate database configuration on startup
if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) {
    console.error('❌ Database configuration missing! Please set DB_HOST, DB_NAME, and DB_USER environment variables.');
    console.error('Current config:', {
        host: process.env.DB_HOST || 'NOT SET',
        port: process.env.DB_PORT || '5432',
        database: process.env.DB_NAME || 'NOT SET',
        user: process.env.DB_USER || 'NOT SET',
        ssl: process.env.DB_SSL || 'false',
    });
}
// Helper function to execute queries with retry logic
const query = async (text, params, retries = 2) => {
    const start = Date.now();
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await exports.pool.query(text, params);
            const duration = Date.now() - start;
            if (duration > 1000) {
                console.log('Executed query', { text: text.substring(0, 100), duration, rows: res.rowCount });
            }
            return res;
        }
        catch (error) {
            lastError = error;
            // If it's a connection error and we have retries left, wait and retry
            if (attempt < retries && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout'))) {
                const waitTime = (attempt + 1) * 1000; // Exponential backoff
                console.warn(`Database query failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${waitTime}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            // For other errors or if we're out of retries, throw immediately
            console.error('Database query error:', error);
            throw error;
        }
    }
    // If we get here, all retries failed
    throw lastError || new Error('Database query failed after retries');
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