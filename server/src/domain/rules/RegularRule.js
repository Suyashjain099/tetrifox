import { ConfigManager } from '../ConfigManager.js';

export class RegularRule {
  name = 'RegularRule';
  priority = 20;

  isMatch(parcel) {
    const config = ConfigManager.getConfig();
    return parcel.weightKg > config.mailMaxWeightKg && parcel.weightKg <= config.regularMaxWeightKg;
  }

  evaluate(parcel, evaluatedRulesHistory = []) {
    return {
      parcelId: parcel.id,
      department: 'Regular',
      requiresApproval: false,
      matchedRule: this.name,
      evaluatedRules: [...evaluatedRulesHistory, this.name],
    };
  }
}
