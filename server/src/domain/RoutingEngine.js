import { InsuranceRule } from './rules/InsuranceRule.js';
import { InternationalCustomsRule, EU_COUNTRIES } from './rules/InternationalCustomsRule.js';
import { HeavyRule } from './rules/HeavyRule.js';
import { RegularRule } from './rules/RegularRule.js';
import { MailRule } from './rules/MailRule.js';
import { ConfigManager } from './ConfigManager.js';

export class RoutingEngine {
  #rules = [];

  constructor(customRules = []) {
    if (customRules && customRules.length > 0) {
      customRules.forEach((rule) => this.registerRule(rule));
    } else {
      this.registerDefaultRules();
    }
  }

  registerDefaultRules() {
    this.registerRule(new InsuranceRule()); // Priority 100
    this.registerRule(new InternationalCustomsRule()); // Priority 50
    this.registerRule(new HeavyRule()); // Priority 30
    this.registerRule(new RegularRule()); // Priority 20
    this.registerRule(new MailRule()); // Priority 10
  }

  registerRule(rule) {
    if (!rule || typeof rule.name !== 'string' || typeof rule.priority !== 'number') {
      throw new Error('Invalid rule instance provided to RoutingEngine');
    }

    const existingIndex = this.#rules.findIndex((r) => r.name === rule.name);
    if (existingIndex !== -1) {
      this.#rules[existingIndex] = rule;
    } else {
      this.#rules.push(rule);
    }
    this.#rules.sort((a, b) => b.priority - a.priority);
  }

  getRules() {
    return [...this.#rules];
  }

  buildRoutePlan(parcel, primaryResult) {
    const config = ConfigManager.getConfig();
    const hops = [];
    let hopNumber = 1;

    const isHighValue = parcel.valueEur > config.insuranceMinThresholdEur;
    const country = parcel.destinationCountry ? String(parcel.destinationCountry).trim().toUpperCase() : 'NL';
    const isNonEu = !EU_COUNTRIES.has(country);

    // Physical vehicle transport classification by weight
    let physicalDept = 'Mail';
    let physicalBay = 'Bay M-01 (High-Speed Automated Sorter)';
    let physicalReason = `Weight ${parcel.weightKg}kg <= ${config.mailMaxWeightKg}kg (Mail standard)`;
    let physicalAction = 'Automated sorting for courier bike & van dispatch';

    if (parcel.weightKg > config.regularMaxWeightKg) {
      physicalDept = 'Heavy';
      physicalBay = 'Bay H-04 (Pallet Freight & Forklift Bay)';
      physicalReason = `Weight ${parcel.weightKg}kg > ${config.regularMaxWeightKg}kg (Heavy threshold)`;
      physicalAction = 'Palletized loading for commercial freight haulage';
    } else if (parcel.weightKg > config.mailMaxWeightKg) {
      physicalDept = 'Regular';
      physicalBay = 'Bay R-02 (Standard Courier Delivery Van)';
      physicalReason = `Weight ${parcel.weightKg}kg <= ${config.regularMaxWeightKg}kg (Regular threshold)`;
      physicalAction = 'Standard parcel sorting for delivery van routes';
    }

    // Hop 1: If High Value -> Insurance Vault
    if (isHighValue) {
      hops.push({
        hop: hopNumber++,
        department: 'Insurance',
        bay: 'Bay S-01 (Secure Vault Escrow)',
        type: 'COMPLIANCE_HOLD',
        status: 'CURRENT_HOLD',
        reason: `Value €${parcel.valueEur.toFixed(2)} exceeds €${config.insuranceMinThresholdEur.toFixed(2)} threshold`,
        action: 'Supervisor liability sign-off and risk coverage review',
        isCurrentHop: true,
      });
    }

    // Hop 2: If Non-EU -> Customs Border Checkpoint
    if (isNonEu) {
      const isCurrent = !isHighValue;
      hops.push({
        hop: hopNumber++,
        department: 'Customs',
        bay: 'Bay C-02 (International Border Inspection)',
        type: 'CUSTOMS_CLEARANCE',
        status: isHighValue ? 'SCHEDULED_NEXT_HOP' : 'CURRENT_ACTIVE_HOP',
        reason: `Destination ${country} is outside the European Union`,
        action: 'Export tariff documentation & border security scanning',
        isCurrentHop: isCurrent,
      });
    }

    // Hop 3 (or 2, or 1): Final Physical Vehicle Transport
    const isCurrent = !isHighValue && !isNonEu;
    hops.push({
      hop: hopNumber++,
      department: physicalDept,
      bay: physicalBay,
      type: 'PHYSICAL_DISPATCH',
      status: (isHighValue || isNonEu) ? 'SCHEDULED_OUTBOUND' : 'READY_FOR_DISPATCH',
      reason: physicalReason,
      action: physicalAction,
      isCurrentHop: isCurrent,
    });

    return hops;
  }

  route(parcel) {
    if (!parcel || typeof parcel.weightKg !== 'number' || isNaN(parcel.weightKg) || parcel.weightKg < 0) {
      throw new Error(`Invalid parcel weight: ${parcel?.weightKg}`);
    }
    if (typeof parcel.valueEur !== 'number' || isNaN(parcel.valueEur) || parcel.valueEur < 0) {
      throw new Error(`Invalid parcel value: ${parcel?.valueEur}`);
    }

    const evaluatedRulesHistory = [];
    let primaryResult = null;

    for (const rule of this.#rules) {
      if (rule.isMatch(parcel)) {
        primaryResult = rule.evaluate(parcel, evaluatedRulesHistory);
        break;
      }
      evaluatedRulesHistory.push(rule.name);
    }

    if (!primaryResult) {
      throw new Error(`No matching routing rule found for parcel ID: ${parcel?.id ?? 'unknown'}`);
    }

    const routePlan = this.buildRoutePlan(parcel, primaryResult);

    return {
      ...primaryResult,
      routePlan,
    };
  }
}
