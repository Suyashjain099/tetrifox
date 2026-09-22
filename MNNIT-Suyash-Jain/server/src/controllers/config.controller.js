import { ConfigManager } from '../domain/ConfigManager.js';
import { logger } from '../utils/logger.js';

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
