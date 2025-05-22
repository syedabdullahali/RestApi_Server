const Redis = require('ioredis');

const redis = new Redis({
  host:process.env.REDIX_HOST, // default Redis host
  port: process.env.REDIX_PORT,        // default Redis port
  password:  process.env.PASSWORD,
});

redis.on('connect',()=>{
    console.log("Conected Redis Database")
})

module.exports = redis;
