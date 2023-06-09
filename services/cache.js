const mongoose = require('mongoose');
const exec = mongoose.Query.prototype.exec;
const redis = require('redis');
const util= require('util');
const keys = require('../config/keys');

const client = redis.createClient(keys.redisUrl,{
    username:'default',
    password:'Nf9Uzpjeou19feKVWmKPpNEjOeyu3xvG'
});

client.hget= util.promisify(client.hget);

mongoose.Query.prototype.cache =  function(options={}){
    this.useCache = true;
    this.hashKey = JSON.stringify(options.key|| '');
    return this;
}

mongoose.Query.prototype.exec = async function(){
    if(!this.useCache){
        return exec.apply(this, arguments);
    }

    const key = JSON.stringify(Object.assign({},this.getQuery(),{ collection:this.mongooseCollection.name }));
    const cachedValue = await client.hget(this.hashKey,key);
    if(cachedValue) {
        const doc = JSON.parse(cachedValue);
        return Array.isArray(doc) ? doc.map(d=> new this.model(d)) : new this.model(doc);
    }
    const result = await exec.apply(this, arguments);
    client.hset(this.hashKey,key, JSON.stringify(result));
    return result;
}

module.exports = {
    clearHash(hashKey){
        client.del(JSON.stringify(hashKey));
    }
}