const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.on('error', (err) => console.error('Redis Error:', err));
client.connect().catch(console.error);

const getCache = async (key) => {
    try { const data = await client.get(key); return data ? JSON.parse(data) : null; } 
    catch { return null; } // Fallback to DB if Redis fails
};
const setCache = async (key, value, ttl = 3600) => {
    try { await client.set(key, JSON.stringify(value), { EX: ttl }); } catch {}
};
const clearCache = async (key) => {
    try { await client.del(key); } catch {}
};
module.exports = { getCache, setCache, clearCache };
