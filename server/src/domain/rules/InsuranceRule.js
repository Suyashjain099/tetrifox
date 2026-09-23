import { ConfigManager } from '../ConfigManager.js';

export class InsuranceRule {
  name = 'InsuranceRule';
  priority = 100;

  isMatch(parcel) {
    const config = ConfigManager.getConfig();
    return parcel.valueEur > config.insuranceMinThresholdEur;
  }

  evaluate(parcel, evaluatedRulesHistory = []) {
    return {
      parcelId: parcel.id,
      department: 'Insurance',
      requiresApproval: true,
      matchedRule: this.name,
      evaluatedRules: [...evaluatedRulesHistory, this.name],
    };
  }
}
