import { ConfigManager } from '../domain/ConfigManager.js';
import { RuleConfigModel } from '../models/RuleConfig.model.js';
import { logger } from '../utils/logger.js';

export const initRuleConfig = async () => {
  if (process.env.NODE_ENV === 'test_no_db') {
    return;
  }
  try {
    const existing = await RuleConfigModel.findOne().sort({ createdAt: -1 });
    if (existing) {
      ConfigManager.loadFromState(existing);
      console.log(`Loaded persisted Rule Configuration (v${existing.version}) from MongoDB`);
    } else {
      const fullState = ConfigManager.getFullState();
      await RuleConfigModel.create({
        ...fullState,
        updatedBy: 'Initial Seed',
      });
      console.log('Seeded default Rule Configuration (v1) into MongoDB');
    }
  } catch (error) {
    console.warn('Rule configuration MongoDB sync warning (init):', error.message);
  }
};

const persistConfigToDb = async (updatedBy) => {
  if (process.env.NODE_ENV === 'test_no_db') {
    return;
  }
  try {
    const fullState = ConfigManager.getFullState();
    const existing = await RuleConfigModel.findOne().sort({ createdAt: -1 });
    if (existing) {
      existing.mailMaxWeightKg = fullState.mailMaxWeightKg;
      existing.regularMaxWeightKg = fullState.regularMaxWeightKg;
      existing.insuranceMinThresholdEur = fullState.insuranceMinThresholdEur;
      existing.version = fullState.version;
      existing.history = fullState.history;
      existing.updatedBy = updatedBy;
      await existing.save();
    } else {
      await RuleConfigModel.create({
        ...fullState,
        updatedBy,
      });
    }
  } catch (dbError) {
    console.warn('Rule configuration MongoDB sync warning (save):', dbError.message);
  }
};

export const getRuleConfig = async (req, res) => {
  try {
    const config = ConfigManager.getConfig();
    const history = ConfigManager.getHistory();
    return res.status(200).json({
      success: true,
      config,
      history,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const updateRuleConfig = async (req, res) => {
  try {
    const { mailMaxWeightKg, regularMaxWeightKg, insuranceMinThresholdEur } = req.body;
    const updatedBy = req.user?.name || 'Supervisor';

    const newConfig = ConfigManager.updateConfig(
      {
        mailMaxWeightKg: Number(mailMaxWeightKg),
        regularMaxWeightKg: Number(regularMaxWeightKg),
        insuranceMinThresholdEur: Number(insuranceMinThresholdEur),
      },
      updatedBy
    );

    await persistConfigToDb(updatedBy);

    logger.info('DYNAMIC_RULE_CONFIG_UPDATED', {
      updatedBy,
      newConfig,
      user: req.user?.email,
      warehouseId: req.user?.warehouseId,
    });

    return res.status(200).json({
      success: true,
      message: 'Business routing rule thresholds updated successfully',
      config: newConfig,
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Configuration Update Failed',
      message: error.message,
    });
  }
};

export const rollbackRuleConfig = async (req, res) => {
  try {
    const updatedBy = req.user?.name || 'Supervisor';
    const rolledBackConfig = ConfigManager.rollback(updatedBy);

    await persistConfigToDb(updatedBy);

    logger.warn('DYNAMIC_RULE_CONFIG_ROLLED_BACK', {
      updatedBy,
      config: rolledBackConfig,
      user: req.user?.email,
      warehouseId: req.user?.warehouseId,
    });

    return res.status(200).json({
      success: true,
      message: 'Business routing rule configuration rolled back to previous version',
      config: rolledBackConfig,
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Rollback Failed',
      message: error.message,
    });
  }
};
