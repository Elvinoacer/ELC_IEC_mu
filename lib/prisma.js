"use strict";
/**
 * Prisma Client Singleton
 *
 * Prevents multiple Prisma Client instances in development
 * due to Next.js hot-reloading.
 */
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
var client_1 = require("@/app/generated/prisma/client");
var pg_1 = require("pg");
var adapter_pg_1 = require("@prisma/adapter-pg");
var connectionString = process.env.DATABASE_URL;
var globalForPrisma = globalThis;
// Singleton Pool for connection reuse
var pool = (_a = globalForPrisma.pool) !== null && _a !== void 0 ? _a : new pg_1.Pool({ connectionString: connectionString });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.pool = pool;
var adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = (_b = globalForPrisma.prisma) !== null && _b !== void 0 ? _b : new client_1.PrismaClient({
    adapter: adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = exports.prisma;
}
exports.default = exports.prisma;
