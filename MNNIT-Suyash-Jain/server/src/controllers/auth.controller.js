import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-jwt-key';

export const DEMO_USERS = [
  {
    _id: 'user-op-1',
    name: 'Alex Operator',
    email: 'operator@warehouse.com',
    password: 'Operator123!',
    role: 'Operator',
    warehouseId: 'WH-AMS-01',
  },
  {
    _id: 'user-sup-1',
    name: 'Sarah Supervisor',
    email: 'supervisor@warehouse.com',
    password: 'Supervisor123!',
    role: 'Supervisor',
    warehouseId: 'WH-AMS-01',
  },
  {
    _id: 'user-sup-2',
    name: 'Mark Supervisor (Rotterdam)',
    email: 'supervisor.rotterdam@warehouse.com',
    password: 'Supervisor123!',
    role: 'Supervisor',
    warehouseId: 'WH-RTM-01',
  },
];

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    // Check built-in demo users first
    const demoUser = DEMO_USERS.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (demoUser && (password === demoUser.password || password === 'Operator123!' || password === 'Supervisor123!')) {
      user = demoUser;
    } else if (mongoose.connection.readyState === 1) {
      try {
        const dbUser = await UserModel.findOne({ email: normalizedEmail });
        if (dbUser) {
          const isMatch = await bcrypt.compare(password, dbUser.password);
          if (isMatch) user = dbUser;
        }
      } catch (err) {
        console.warn('DB lookup failed, continuing with demo user check');
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const payload = {
      id: user._id || user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      warehouseId: user.warehouseId || 'WH-AMS-01',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return res.status(200).json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getMe = async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};

export const seedDefaultUsers = async () => {
  try {
    const operatorEmail = 'operator@warehouse.com';
    const supervisorEmail = 'supervisor@warehouse.com';
    const rotterdamSupervisorEmail = 'supervisor.rotterdam@warehouse.com';

    const existingOp = await UserModel.findOne({ email: operatorEmail });
    if (!existingOp) {
      const hashedPassword = await bcrypt.hash('Operator123!', 10);
      await UserModel.create({
        name: 'Alex Operator',
        email: operatorEmail,
        password: hashedPassword,
        role: 'Operator',
        warehouseId: 'WH-AMS-01',
      });
      console.log('Seeded demo Operator user (Amsterdam): operator@warehouse.com');
    }

    const existingSup = await UserModel.findOne({ email: supervisorEmail });
    if (!existingSup) {
      const hashedPassword = await bcrypt.hash('Supervisor123!', 10);
      await UserModel.create({
        name: 'Sarah Supervisor',
        email: supervisorEmail,
        password: hashedPassword,
        role: 'Supervisor',
        warehouseId: 'WH-AMS-01',
      });
      console.log('Seeded demo Supervisor user (Amsterdam): supervisor@warehouse.com');
    }

    const existingRtmSup = await UserModel.findOne({ email: rotterdamSupervisorEmail });
    if (!existingRtmSup) {
      const hashedPassword = await bcrypt.hash('Supervisor123!', 10);
      await UserModel.create({
        name: 'Mark Supervisor (Rotterdam)',
        email: rotterdamSupervisorEmail,
        password: hashedPassword,
        role: 'Supervisor',
        warehouseId: 'WH-RTM-01',
      });
      console.log('Seeded demo Supervisor user (Rotterdam): supervisor.rotterdam@warehouse.com');
    }
  } catch (error) {
    console.warn('User seeding warning:', error.message);
  }
};
