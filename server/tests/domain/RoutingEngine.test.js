import { describe, it, expect, beforeEach } from 'vitest';
import { RoutingEngine } from '../../src/domain/RoutingEngine.js';

describe('RoutingEngine Domain Unit Tests (JavaScript)', () => {
  let engine;

  beforeEach(() => {
    engine = new RoutingEngine();
  });

  describe('Mail Department Routing (Weight <= 1.0 kg)', () => {
    it('routes boundary weight 0.99 kg to Mail department for EU destination', () => {
      const parcel = { id: 'P0_99', weightKg: 0.99, valueEur: 50, destinationCountry: 'NL' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Mail');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('MailRule');
    });

    it('routes boundary weight of exactly 1.0 kg to Mail department for EU destination', () => {
      const parcel = { id: 'P1_0', weightKg: 1.0, valueEur: 1000.00, destinationCountry: 'DE' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Mail');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('MailRule');
    });
  });

  describe('Regular Department Routing (1.0 kg < Weight <= 10.0 kg)', () => {
    it('routes boundary weight 1.01 kg to Regular department for EU destination', () => {
      const parcel = { id: 'P1_01', weightKg: 1.01, valueEur: 200, destinationCountry: 'FR' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('RegularRule');
    });

    it('routes boundary weight 9.99 kg to Regular department for EU destination', () => {
      const parcel = { id: 'P9_99', weightKg: 9.99, valueEur: 500, destinationCountry: 'ES' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('RegularRule');
    });

    it('routes boundary weight of exactly 10.0 kg to Regular department for EU destination', () => {
      const parcel = { id: 'P10_0', weightKg: 10.0, valueEur: 1000.00, destinationCountry: 'IT' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('RegularRule');
    });
  });

  describe('Heavy Department Routing (Weight > 10.0 kg)', () => {
    it('routes boundary weight 10.01 kg to Heavy department for EU destination', () => {
      const parcel = { id: 'P10_01', weightKg: 10.01, valueEur: 999.99, destinationCountry: 'NL' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Heavy');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('HeavyRule');
    });

    it('routes heavy parcel of 50.0 kg to Heavy department when value <= €1000.00', () => {
      const parcel = { id: 'P50_0', weightKg: 50.0, valueEur: 1000.00, destinationCountry: 'BE' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Heavy');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('HeavyRule');
    });
  });

  describe('International Customs Department Routing (Non-EU Destinations)', () => {
    it('routes light parcel (0.5 kg) to Customs department when destination is outside EU (US)', () => {
      const parcel = { id: 'P_CUSTOMS_1', weightKg: 0.5, valueEur: 100, destinationCountry: 'US' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Customs');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('CustomsRule');
      expect(result.evaluatedRules).toContain('InsuranceRule');
      expect(result.evaluatedRules.slice(-1)[0]).toBe('CustomsRule');
    });

    it('routes heavy parcel (25.0 kg) to Customs department when destination is outside EU (GB)', () => {
      const parcel = { id: 'P_CUSTOMS_2', weightKg: 25.0, valueEur: 500, destinationCountry: 'GB' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Customs');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('CustomsRule');
    });

    it('routes EU destination (DE, 0.5 kg) to Mail department instead of Customs', () => {
      const parcel = { id: 'P_EU_1', weightKg: 0.5, valueEur: 100, destinationCountry: 'DE' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Mail');
      expect(result.matchedRule).toBe('MailRule');
    });
  });

  describe('Insurance Approval Precedence Overrides (Value > €1,000)', () => {
    it('routes exact boundary value €1000.00 to weight category (not insurance)', () => {
      const parcel = { id: 'P_VAL_1000', weightKg: 5.0, valueEur: 1000.00, destinationCountry: 'NL' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Regular');
      expect(result.requiresApproval).toBe(false);
      expect(result.matchedRule).toBe('RegularRule');
    });

    it('overrides light weight (0.5 kg) and routes to Insurance department when value is €1000.01', () => {
      const parcel = { id: 'P_INS_LIGHT', weightKg: 0.5, valueEur: 1000.01, destinationCountry: 'NL' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Insurance');
      expect(result.requiresApproval).toBe(true);
      expect(result.matchedRule).toBe('InsuranceRule');
      expect(result.evaluatedRules).toEqual(['InsuranceRule']);
    });

    it('overrides non-EU destination (US) and routes to Insurance department when value > €1,000', () => {
      const parcel = { id: 'P_INS_CUSTOMS', weightKg: 2.0, valueEur: 2000.00, destinationCountry: 'US' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Insurance');
      expect(result.requiresApproval).toBe(true);
      expect(result.matchedRule).toBe('InsuranceRule');
    });
  });

  describe('Validation & Edge Cases', () => {
    it('throws error for negative weight', () => {
      const parcel = { id: 'P_ERR_1', weightKg: -1.0, valueEur: 100 };
      expect(() => engine.route(parcel)).toThrow('Invalid parcel weight');
    });

    it('throws error for negative value', () => {
      const parcel = { id: 'P_ERR_2', weightKg: 2.0, valueEur: -50 };
      expect(() => engine.route(parcel)).toThrow('Invalid parcel value');
    });

    it('throws error for NaN weight', () => {
      const parcel = { id: 'P_ERR_3', weightKg: NaN, valueEur: 100 };
      expect(() => engine.route(parcel)).toThrow('Invalid parcel weight');
    });
  });

  describe('Multi-Hop Route Itinerary (Complete Route Plan)', () => {
    it('generates 3-hop itinerary for high-value non-EU heavy parcel (€2000, 25kg, UK)', () => {
      const parcel = { id: 'P_MULTI_3', weightKg: 25.0, valueEur: 2000.0, destinationCountry: 'GB' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Insurance');
      expect(result.requiresApproval).toBe(true);
      expect(result.routePlan).toBeDefined();
      expect(result.routePlan.length).toBe(3);

      // Hop 1: Insurance Vault Escrow
      expect(result.routePlan[0].department).toBe('Insurance');
      expect(result.routePlan[0].status).toBe('CURRENT_HOLD');
      expect(result.routePlan[0].isCurrentHop).toBe(true);

      // Hop 2: Customs
      expect(result.routePlan[1].department).toBe('Customs');
      expect(result.routePlan[1].status).toBe('SCHEDULED_NEXT_HOP');
      expect(result.routePlan[1].isCurrentHop).toBe(false);

      // Hop 3: Heavy Outbound
      expect(result.routePlan[2].department).toBe('Heavy');
      expect(result.routePlan[2].status).toBe('SCHEDULED_OUTBOUND');
      expect(result.routePlan[2].isCurrentHop).toBe(false);
    });

    it('generates 2-hop itinerary for standard non-EU parcel (€25, 1.5kg, UK)', () => {
      const parcel = { id: 'P_MULTI_2', weightKg: 1.5, valueEur: 25.0, destinationCountry: 'GB' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Customs');
      expect(result.requiresApproval).toBe(false);
      expect(result.routePlan.length).toBe(2);

      // Hop 1: Customs
      expect(result.routePlan[0].department).toBe('Customs');
      expect(result.routePlan[0].status).toBe('CURRENT_ACTIVE_HOP');
      expect(result.routePlan[0].isCurrentHop).toBe(true);

      // Hop 2: Regular Outbound
      expect(result.routePlan[1].department).toBe('Regular');
      expect(result.routePlan[1].status).toBe('SCHEDULED_OUTBOUND');
    });

    it('generates 1-hop direct dispatch for domestic EU mail (€50, 0.5kg, NL)', () => {
      const parcel = { id: 'P_MULTI_1', weightKg: 0.5, valueEur: 50.0, destinationCountry: 'NL' };
      const result = engine.route(parcel);

      expect(result.department).toBe('Mail');
      expect(result.routePlan.length).toBe(1);
      expect(result.routePlan[0].department).toBe('Mail');
      expect(result.routePlan[0].status).toBe('READY_FOR_DISPATCH');
      expect(result.routePlan[0].isCurrentHop).toBe(true);
    });
  });
});
