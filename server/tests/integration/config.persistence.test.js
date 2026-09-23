import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { ConfigManager } from '../../src/domain/ConfigManager.js';

describe('Dynamic Rule Config Persistence & API Integration', () => {
  const JWT_SECRET = 'secret-jwt-key';
  let supervisorToken;
  let operatorToken;

  beforeAll(() => {
    process.env.NODE_ENV = 'test_no_db';
    process.env.JWT_SECRET = JWT_SECRET;

    supervisorToken = jwt.sign(
      { id: 'sup-1', email: 'supervisor@warehouse.com', name: 'Sarah Supervisor', role: 'Supervisor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    operatorToken = jwt.sign(
      { id: 'op-1', email: 'operator@warehouse.com', name: 'Alex Operator', role: 'Operator' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    ConfigManager.reset();
  });

  describe('In-Memory State Hydration & Extraction', () => {
    it('exports full state correctly via getFullState()', () => {
      const state = ConfigManager.getFullState();
      expect(state.mailMaxWeightKg).toBe(1.0);
      expect(state.regularMaxWeightKg).toBe(10.0);
      expect(state.insuranceMinThresholdEur).toBe(1000.0);
      expect(state.version).toBe(1);
      expect(Array.isArray(state.history)).toBe(true);
      expect(state.history.length).toBe(0);
    });

    it('hydrates in-memory state cleanly using loadFromState()', () => {
      const persistedState = {
        mailMaxWeightKg: 2.5,
        regularMaxWeightKg: 15.0,
        insuranceMinThresholdEur: 2500.0,
        version: 3,
        history: [
          {
            version: 1,
            mailMaxWeightKg: 1.0,
            regularMaxWeightKg: 10.0,
            insuranceMinThresholdEur: 1000.0,
            updatedAt: new Date().toISOString(),
            updatedBy: 'Sarah Supervisor',
          },
        ],
      };

      ConfigManager.loadFromState(persistedState);
      const current = ConfigManager.getConfig();
      expect(current.mailMaxWeightKg).toBe(2.5);
      expect(current.regularMaxWeightKg).toBe(15.0);
      expect(current.insuranceMinThresholdEur).toBe(2500.0);
      expect(current.version).toBe(3);
      expect(current.historyCount).toBe(1);
    });
  });

  describe('API Endpoints /api/v1/config/rules', () => {
    it('GET /api/v1/config/rules returns current configuration and history', async () => {
      const res = await request(app)
        .get('/api/v1/config/rules')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.mailMaxWeightKg).toBe(1.0);
      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('PUT /api/v1/config/rules updates thresholds and increments version', async () => {
      const res = await request(app)
        .put('/api/v1/config/rules')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          mailMaxWeightKg: 2.0,
          regularMaxWeightKg: 12.0,
          insuranceMinThresholdEur: 1500.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.mailMaxWeightKg).toBe(2.0);
      expect(res.body.config.version).toBe(2);
      expect(res.body.config.historyCount).toBe(1);

      // Verify immediate in-memory effect
      expect(ConfigManager.getConfig().mailMaxWeightKg).toBe(2.0);
    });

    it('POST /api/v1/config/rules/rollback rolls back to previous version', async () => {
      // First update
      ConfigManager.updateConfig(
        { mailMaxWeightKg: 2.0, regularMaxWeightKg: 12.0, insuranceMinThresholdEur: 1500.0 },
        'Sarah Supervisor'
      );

      // Now rollback
      const res = await request(app)
        .post('/api/v1/config/rules/rollback')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.config.mailMaxWeightKg).toBe(1.0);
      expect(res.body.config.regularMaxWeightKg).toBe(10.0);
    });

    it('blocks Operator role from updating configuration (RBAC)', async () => {
      const res = await request(app)
        .put('/api/v1/config/rules')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          mailMaxWeightKg: 2.0,
          regularMaxWeightKg: 12.0,
          insuranceMinThresholdEur: 1500.0,
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });
});
