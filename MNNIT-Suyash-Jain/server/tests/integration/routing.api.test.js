import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../src/app.js';

describe('Routing API Integration Tests (Express + Ingestion + Security)', () => {
  const API_KEY = 'secret-api-key';

  beforeAll(() => {
    process.env.NODE_ENV = 'test_no_db';
    process.env.API_KEY = API_KEY;
  });

  describe('Security Middleware (X-API-Key Auth)', () => {
    it('returns 401 Unauthorized when X-API-Key header is missing', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .send({ weightKg: 0.5, valueEur: 50 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('returns 401 Unauthorized when X-API-Key is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('X-API-Key', 'invalid-key-123')
        .send({ weightKg: 0.5, valueEur: 50 });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/v1/route (Single Parcel Routing)', () => {
    it('routes single parcel correctly to Mail department', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('X-API-Key', API_KEY)
        .send({ id: 'SINGLE-1', weightKg: 0.5, valueEur: 50, recipient: { name: 'John Doe' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.department).toBe('Mail');
      expect(response.body.data.requiresApproval).toBe(false);
      expect(response.body.data.matchedRule).toBe('MailRule');
    });

    it('routes single high-value parcel to Insurance department requiring approval', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('X-API-Key', API_KEY)
        .send({ id: 'SINGLE-2', weightKg: 2.0, valueEur: 2500, recipient: { name: 'Alice Smith' } });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.department).toBe('Insurance');
      expect(response.body.data.requiresApproval).toBe(true);
      expect(response.body.data.matchedRule).toBe('InsuranceRule');
    });

    it('returns 400 Bad Request when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/v1/route')
        .set('X-API-Key', API_KEY)
        .send({ recipient: 'Invalid Payload' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });
  });

  describe('POST /api/v1/route/batch (JSON and Legacy XML Batch Ingestion)', () => {
    it('processes batch JSON array payload correctly', async () => {
      const jsonPayload = [
        { id: 'B1', weightKg: 0.5, valueEur: 10 },
        { id: 'B2', weightKg: 5.0, valueEur: 50 },
        { id: 'B3', weightKg: 20.0, valueEur: 100 },
        { id: 'B4', weightKg: 0.5, valueEur: 1500 },
      ];

      const response = await request(app)
        .post('/api/v1/route/batch')
        .set('X-API-Key', API_KEY)
        .send(jsonPayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.totalParcels).toBe(4);
      expect(response.body.summary.routedCounts).toEqual({
        Mail: 1,
        Regular: 1,
        Heavy: 1,
        Insurance: 1,
        Customs: 0,
      });
    });

    it('processes sample legacy Container_68465468.xml manifest upload safely', async () => {
      const xmlPath = path.resolve(process.cwd(), '../Container_68465468.xml');
      expect(fs.existsSync(xmlPath)).toBe(true);

      const response = await request(app)
        .post('/api/v1/route/batch')
        .set('X-API-Key', API_KEY)
        .attach('file', xmlPath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.fileType).toBe('XML');
      expect(response.body.summary.totalParcels).toBe(17);
      expect(response.body.summary.routedCounts.Insurance).toBeGreaterThan(0);
      expect(response.body.results.length).toBe(17);
    });

    it('safely blocks or ignores XXE entity injection attacks in XML parsing', async () => {
      const maliciousXml = `<?xml version="1.0"?>
      <!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
      <Container>
        <Id>XXE_TEST</Id>
        <parcels>
          <Parcel>
            <Receipient><Name>&xxe;</Name></Receipient>
            <Weight>1.0</Weight>
            <Value>100</Value>
          </Parcel>
        </parcels>
      </Container>`;

      const response = await request(app)
        .post('/api/v1/route/batch')
        .set('X-API-Key', API_KEY)
        .send({ xmlContent: maliciousXml });

      if (response.status === 200) {
        expect(response.body.results[0].recipient.name).not.toContain('root:');
      } else {
        expect(response.status).toBe(400);
      }
    });
  });

  describe('GET /api/v1/route/recent-approvals', () => {
    it('returns recent supervisor approvals list', async () => {
      const response = await request(app)
        .get('/api/v1/route/recent-approvals')
        .set('X-API-Key', API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.recentApprovals)).toBe(true);
    });
  });
});

