import { ConfigManager } from '../ConfigManager.js';

export class MailRule {
  name = 'MailRule';
  priority = 10;

  isMatch(parcel) {
    const config = ConfigManager.getConfig();
    return parcel.weightKg <= config.mailMaxWeightKg;
  }

  evaluate(parcel, evaluatedRulesHistory = []) {
    return {
      parcelId: parcel.id,
      department: 'Mail',
      requiresApproval: false,
      matchedRule: this.name,
      evaluatedRules: [...evaluatedRulesHistory, this.name],
    };
  }
}
