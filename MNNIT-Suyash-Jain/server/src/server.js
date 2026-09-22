import app from './app.js';
import { connectDB } from './config/db.js';
import { seedDefaultUsers } from './controllers/auth.controller.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultUsers();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
