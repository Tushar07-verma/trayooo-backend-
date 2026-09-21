const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trayo_db';

  try {
    mongoose.set('strictQuery', false);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000, // Timeout fast if local MongoDB service is not started
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.warn(`[Database] MongoDB connection warning: ${error.message}`);
    console.info('[Database] Operating with resilient local fallback storage.');
    console.info('[Database] To use real MongoDB, start your local MongoDB daemon or set MONGODB_URI in backend/.env');
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('[Database] MongoDB disconnected.');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    console.log('[Database] MongoDB reconnected.');
  });
};

const getIsConnected = () => isConnected;

module.exports = {
  connectDB,
  getIsConnected,
};
