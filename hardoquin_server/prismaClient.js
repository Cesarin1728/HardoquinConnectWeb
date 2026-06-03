const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

let prisma;

function getPrismaClient() {
    if (prisma) return prisma;

    if (!process.env.DATABASE_URL) {
        throw new Error('Falta configurar DATABASE_URL en hardoquin_server/.env');
    }

    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL
    });

    prisma = new PrismaClient({ adapter });
    return prisma;
}

module.exports = new Proxy({}, {
    get(_target, property) {
        const client = getPrismaClient();
        const value = client[property];

        if (typeof value === 'function') {
            return value.bind(client);
        }

        return value;
    }
});
