import { ConfigManager } from '../ConfigManager.js';

export class HeavyRule {
  name = 'HeavyRule';
  priority = 30;

  isMatch(parcel) {
    const config = ConfigManager.getConfig();
    return parcel.weightKg > config.regularMaxWeightKg;
  }

  evaluate(parcel, evaluatedRulesHistory = []) {
    return {
      parcelId: parcel.id,
      department: 'Heavy',
      requiresApproval: false,
      matchedRule: this.name,
      evaluatedRules: [...evaluatedRulesHistory, this.name],
    };
  }
}
