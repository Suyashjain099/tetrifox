export class ConfigManager {
  static #config = {
    mailMaxWeightKg: 1.0,
    regularMaxWeightKg: 10.0,
    insuranceMinThresholdEur: 1000.0,
    version: 1,
    history: [],
  };

  static getConfig() {
    return {
      mailMaxWeightKg: this.#config.mailMaxWeightKg,
      regularMaxWeightKg: this.#config.regularMaxWeightKg,
      insuranceMinThresholdEur: this.#config.insuranceMinThresholdEur,
      version: this.#config.version,
      historyCount: this.#config.history.length,
    };
  }

  static getHistory() {
    return [...this.#config.history];
  }

  static validateConfig(newConfig) {
    const { mailMaxWeightKg, regularMaxWeightKg, insuranceMinThresholdEur } = newConfig;

    if (typeof mailMaxWeightKg !== 'number' || isNaN(mailMaxWeightKg) || mailMaxWeightKg <= 0) {
      throw new Error('Mail max weight must be a positive number greater than 0');
    }
    if (typeof regularMaxWeightKg !== 'number' || isNaN(regularMaxWeightKg) || regularMaxWeightKg <= mailMaxWeightKg) {
      throw new Error(`Regular max weight (${regularMaxWeightKg}kg) must be strictly greater than Mail max weight (${mailMaxWeightKg}kg)`);
    }
    if (typeof insuranceMinThresholdEur !== 'number' || isNaN(insuranceMinThresholdEur) || insuranceMinThresholdEur <= 0) {
      throw new Error('Insurance threshold must be a positive amount in Euros (€)');
    }

    return true;
  }

  static updateConfig(newConfig, updatedBy = 'Supervisor') {
    this.validateConfig(newConfig);

    this.#config.history.push({
      version: this.#config.version,
      mailMaxWeightKg: this.#config.mailMaxWeightKg,
      regularMaxWeightKg: this.#config.regularMaxWeightKg,
      insuranceMinThresholdEur: this.#config.insuranceMinThresholdEur,
      updatedAt: new Date().toISOString(),
      updatedBy,
    });

    this.#config.mailMaxWeightKg = Number(newConfig.mailMaxWeightKg);
    this.#config.regularMaxWeightKg = Number(newConfig.regularMaxWeightKg);
    this.#config.insuranceMinThresholdEur = Number(newConfig.insuranceMinThresholdEur);
    this.#config.version += 1;

    return this.getConfig();
  }

  static rollback(updatedBy = 'Supervisor') {
    if (this.#config.history.length === 0) {
      throw new Error('No previous configuration version available for rollback');
    }

    const previousConfig = this.#config.history.pop();
    this.#config.mailMaxWeightKg = previousConfig.mailMaxWeightKg;
    this.#config.regularMaxWeightKg = previousConfig.regularMaxWeightKg;
    this.#config.insuranceMinThresholdEur = previousConfig.insuranceMinThresholdEur;
    this.#config.version += 1;

    return this.getConfig();
  }

  static reset() {
    this.#config = {
      mailMaxWeightKg: 1.0,
      regularMaxWeightKg: 10.0,
      insuranceMinThresholdEur: 1000.0,
      version: 1,
      history: [],
    };
  }
}
