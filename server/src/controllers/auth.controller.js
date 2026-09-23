import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-jwt-key';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    const payload = {
      id: user._id,
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
