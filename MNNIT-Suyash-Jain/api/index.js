import app from '../server/src/app.js';
import mongoose from 'mongoose';
import { connectDB } from '../server/src/config/db.js';
import { seedDefaultUsers } from '../server/src/controllers/auth.controller.js';

let isInitialized = false;

export default async function handler(req, res) {
  if (!isInitialized) {
    if (process.env.MONGODB_URI) {
      try {
        if (mongoose.connection.readyState === 0) {
          await connectDB();
          await seedDefaultUsers();
        }
      } catch (err) {
        console.warn('MongoDB not configured or connection failed. Running in standalone demo mode:', err.message);
      }
    }
    isInitialized = true;
  }

  return app(req, res);
}
