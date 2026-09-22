export const EU_COUNTRIES = new Set([
  'NL', 'DE', 'FR', 'BE', 'ES', 'IT', 'AT', 'DK', 'SE', 'FI',
  'PL', 'IE', 'PT', 'GR', 'CZ', 'HU', 'SK', 'RO', 'BG', 'HR',
  'LT', 'LV', 'EE', 'SI', 'CY', 'MT', 'LU',
]);

export class InternationalCustomsRule {
  name = 'CustomsRule';
  priority = 50;

  isMatch(parcel) {
    if (!parcel.destinationCountry) {
      return false;
    }
    const country = String(parcel.destinationCountry).trim().toUpperCase();
    return !EU_COUNTRIES.has(country);
  }

  evaluate(parcel, evaluatedRulesHistory = []) {
    return {
      parcelId: parcel.id,
      department: 'Customs',
      requiresApproval: false,
      matchedRule: this.name,
      evaluatedRules: [...evaluatedRulesHistory, this.name],
    };
  }
}
