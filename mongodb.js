
const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://gamepedia:gamepedia@clusterinf2003.1awimhh.mongodb.net/?retryWrites=true&w=majority&appName=ClusterINF2003';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

let db;

async function connectToMongoDB() {
    try {
        await client.connect();
        db = client.db('INF2003');
        console.log('Mongo Database is connected successfully');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
    }
}

function getDB() {
    if (!db) {
        throw new Error('MongoDB not initialized. Call connectToMongoDB first.');
    }
    return db;
}

module.exports = { connectToMongoDB, getDB };
