import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';

describe('Auth & RBAC Integration Tests (JWT + Supervisor Approvals)', () => {
  const JWT_SECRET = 'secret-jwt-key';
  let operatorToken;
  let supervisorToken;

  beforeAll(() => {
    process.env.NODE_ENV = 'test_no_db';
    process.env.JWT_SECRET = JWT_SECRET;

    operatorToken = jwt.sign(
      { id: 'op-1', email: 'operator@warehouse.com', name: 'Alex Operator', role: 'Operator' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    supervisorToken = jwt.sign(
      { id: 'sup-1', email: 'supervisor@warehouse.com', name: 'Sarah Supervisor', role: 'Supervisor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('JWT Token Authentication', () => {
    it('authenticates demo operator user without requiring MongoDB', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'operator@warehouse.com', password: 'Operator123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('Operator');
    });

    it('authenticates demo supervisor user without requiring MongoDB', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'supervisor@warehouse.com', password: 'Supervisor123!' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.role).toBe('Supervisor');
    });

    it('returns 401 Unauthorized when no token or API key is provided', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .send({ weightKg: 0.5, valueEur: 50 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('authenticates successfully with Bearer JWT token', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ id: 'P-JWT-1', weightKg: 0.5, valueEur: 50 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.department).toBe('Mail');
    });
  });

  describe('Role-Based Access Control (RBAC) & Supervisor Approval Workflow', () => {
    it('blocks Operator role with 403 Forbidden when attempting to approve insurance clearance', async () => {
      const response = await request(app)
        .post('/api/v1/route/approve/PARCEL-INS-123')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain("Role 'Operator' is not authorized");
    });

    it('allows Supervisor role to approve high-value insurance parcel', async () => {
      const response = await request(app)
        .post('/api/v1/route/approve/PARCEL-INS-123')
        .set('Authorization', `Bearer ${supervisorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.parcel.approvalStatus).toBe('APPROVED');
      expect(response.body.parcel.releasedFromEscrow).toBe(true);
    });

    it('automatically clears insurance approval when supervisor evaluates a high-value parcel', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ id: 'P-SUP-HIGH', weightKg: 2.0, valueEur: 2500, recipient: { name: 'VIP Customer' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.department).toBe('Insurance');
      expect(response.body.data.requiresApproval).toBe(false);
      expect(response.body.data.approvalStatus).toBe('APPROVED');
      expect(response.body.data.approvedBy).toBe('Sarah Supervisor');
    });

    it('requires approval when operator evaluates a high-value parcel', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ id: 'P-OP-HIGH', weightKg: 2.0, valueEur: 2500, recipient: { name: 'Operator Customer' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.department).toBe('Insurance');
      expect(response.body.data.requiresApproval).toBe(true);
      expect(response.body.data.approvalStatus).toBe('PENDING');
    });
  });
});
