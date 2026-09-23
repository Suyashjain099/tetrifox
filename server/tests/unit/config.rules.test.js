import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from '../../src/domain/ConfigManager.js';
import { RoutingEngine } from '../../src/domain/RoutingEngine.js';

describe('Dynamic Business Rule Configuration & Rollback Protection', () => {
  let engine;

  beforeEach(() => {
    ConfigManager.reset();
    engine = new RoutingEngine();
  });

  it('evaluates default thresholds correctly', () => {
    const config = ConfigManager.getConfig();
    expect(config.mailMaxWeightKg).toBe(1.0);
    expect(config.regularMaxWeightKg).toBe(10.0);
    expect(config.insuranceMinThresholdEur).toBe(1000.0);

    const mailParcel = engine.route({ id: 'P-1', weightKg: 0.8, valueEur: 50 });
    expect(mailParcel.department).toBe('Mail');

    const regularParcel = engine.route({ id: 'P-2', weightKg: 5.0, valueEur: 50 });
    expect(regularParcel.department).toBe('Regular');

    const heavyParcel = engine.route({ id: 'P-3', weightKg: 12.0, valueEur: 50 });
    expect(heavyParcel.department).toBe('Heavy');
  });

  it('dynamically updates thresholds and affects routing outcomes immediately', () => {
    // Increase Mail max weight to 2.5kg and Regular max weight to 15.0kg
    ConfigManager.updateConfig({
      mailMaxWeightKg: 2.5,
      regularMaxWeightKg: 15.0,
      insuranceMinThresholdEur: 2000.0,
    });

    const updatedConfig = ConfigManager.getConfig();
    expect(updatedConfig.mailMaxWeightKg).toBe(2.5);
    expect(updatedConfig.regularMaxWeightKg).toBe(15.0);
    expect(updatedConfig.version).toBe(2);

    // 2.0kg was Regular under default rules, but now routes to Mail!
    const mailParcelNow = engine.route({ id: 'P-4', weightKg: 2.0, valueEur: 50 });
    expect(mailParcelNow.department).toBe('Mail');

    // 12.0kg was Heavy under default rules, but now routes to Regular!
    const regularParcelNow = engine.route({ id: 'P-5', weightKg: 12.0, valueEur: 50 });
    expect(regularParcelNow.department).toBe('Regular');

    // €1,500 required Insurance under default rules, but now clears as Regular without approval!
    const noInsuranceNow = engine.route({ id: 'P-6', weightKg: 5.0, valueEur: 1500 });
    expect(noInsuranceNow.department).toBe('Regular');
    expect(noInsuranceNow.requiresApproval).toBe(false);
  });

  it('rejects invalid configuration updates to enforce business safety', () => {
    // Reject setting Regular max weight less than Mail max weight
    expect(() => {
      ConfigManager.updateConfig({
        mailMaxWeightKg: 5.0,
        regularMaxWeightKg: 3.0,
        insuranceMinThresholdEur: 1000.0,
      });
    }).toThrow('Regular max weight (3kg) must be strictly greater than Mail max weight (5kg)');

    // Reject negative values
    expect(() => {
      ConfigManager.updateConfig({
        mailMaxWeightKg: -1.0,
        regularMaxWeightKg: 10.0,
        insuranceMinThresholdEur: 1000.0,
      });
    }).toThrow('Mail max weight must be a positive number greater than 0');
  });

  it('supports version rollback to restore previous business configuration', () => {
    ConfigManager.updateConfig({
      mailMaxWeightKg: 3.0,
      regularMaxWeightKg: 12.0,
      insuranceMinThresholdEur: 1500.0,
    });
    expect(ConfigManager.getConfig().mailMaxWeightKg).toBe(3.0);

    // Rollback
    const rolledBack = ConfigManager.rollback('Supervisor Alex');
    expect(rolledBack.mailMaxWeightKg).toBe(1.0);
    expect(rolledBack.regularMaxWeightKg).toBe(10.0);
    expect(rolledBack.insuranceMinThresholdEur).toBe(1000.0);

    // Parcel 2.0kg returns to Regular after rollback
    const parcelAfterRollback = engine.route({ id: 'P-7', weightKg: 2.0, valueEur: 50 });
    expect(parcelAfterRollback.department).toBe('Regular');
  });
});
