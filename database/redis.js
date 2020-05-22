const redis = require("redis");
const REDIS_PORT = process.env.REDIS_PORT || 6379;

module.exports = redis.createClient(REDIS_PORT);
