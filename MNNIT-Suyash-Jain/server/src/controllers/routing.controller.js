import mongoose from 'mongoose';
import { RoutingEngine } from '../domain/RoutingEngine.js';
import { ParcelModel } from '../models/Parcel.model.js';
import { BatchJobModel } from '../models/BatchJob.model.js';
import { parseXmlManifest } from '../utils/xmlParser.util.js';
import { logger } from '../utils/logger.js';
import { EU_COUNTRIES } from '../domain/rules/InternationalCustomsRule.js';

export const inMemoryParcels = [];
const engine = new RoutingEngine();

export const routeSingleParcel = async (req, res) => {
  try {
    const { weightKg, valueEur, recipient, destinationCountry, postalCode, id, warehouseId } = req.body;

    if (weightKg === undefined || valueEur === undefined) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'weightKg and valueEur are required fields',
      });
    }

    const assignedWarehouseId = warehouseId || req.user?.warehouseId || 'WH-AMS-01';

    const parcelInput = {
      id: id || `P-${Date.now()}`,
      weightKg: Number(weightKg),
      valueEur: Number(valueEur),
      recipient,
      destinationCountry: destinationCountry || 'NL',
      postalCode,
      warehouseId: assignedWarehouseId,
    };

    const routingResult = engine.route(parcelInput);

    const isSupervisor = req.user?.role === 'Supervisor' || req.user?.role === 'Admin';
    let approvalStatus = 'NOT_REQUIRED';
    let approvedBy = null;
    let approvedAt = null;

    if (routingResult.requiresApproval) {
      if (isSupervisor) {
        approvalStatus = 'APPROVED';
        approvedBy = req.user?.name || 'Supervisor';
        approvedAt = new Date();
        logger.info('HIGH_VALUE_PARCEL_AUTO_CLEARED_BY_SUPERVISOR', {
          parcelId: routingResult.parcelId,
          valueEur: parcelInput.valueEur,
          approvedBy,
          warehouseId: assignedWarehouseId,
        });
      } else {
        approvalStatus = 'PENDING';
        logger.warn('HIGH_VALUE_PARCEL_FLAGGED_FOR_INSURANCE', {
          parcelId: routingResult.parcelId,
          valueEur: parcelInput.valueEur,
          user: req.user?.email || req.user?.role || 'Operator',
          warehouseId: assignedWarehouseId,
        });
      }
    }

    let savedParcel = null;
    const isDbConnected = mongoose.connection.readyState === 1 && process.env.NODE_ENV !== 'test_no_db';
    if (isDbConnected) {
      try {
        savedParcel = await ParcelModel.create({
          parcelId: routingResult.parcelId,
          warehouseId: assignedWarehouseId,
          recipient: typeof recipient === 'object' ? recipient : { name: recipient || 'Unknown' },
          weightKg: parcelInput.weightKg,
          valueEur: parcelInput.valueEur,
          destinationCountry: parcelInput.destinationCountry,
          postalCode: parcelInput.postalCode,
          department: routingResult.department,
          requiresApproval: approvalStatus === 'PENDING',
          approvalStatus,
          approvedBy,
          approvedAt,
          releasedFromEscrow: false,
          matchedRule: routingResult.matchedRule,
          evaluatedRules: routingResult.evaluatedRules,
        });
      } catch (dbError) {
        console.warn('Database save warning (single route):', dbError.message);
      }
    }

    if (!savedParcel) {
      savedParcel = {
        _id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        parcelId: routingResult.parcelId,
        warehouseId: assignedWarehouseId,
        recipient: typeof recipient === 'object' ? recipient : { name: recipient || 'Unknown' },
        weightKg: parcelInput.weightKg,
        valueEur: parcelInput.valueEur,
        destinationCountry: parcelInput.destinationCountry,
        postalCode: parcelInput.postalCode,
        department: routingResult.department,
        requiresApproval: approvalStatus === 'PENDING',
        approvalStatus,
        approvedBy,
        approvedAt,
        releasedFromEscrow: false,
        matchedRule: routingResult.matchedRule,
        evaluatedRules: routingResult.evaluatedRules,
        createdAt: new Date(),
      };
      inMemoryParcels.unshift(savedParcel);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...routingResult,
        warehouseId: assignedWarehouseId,
        requiresApproval: approvalStatus === 'PENDING',
        approvalStatus,
        approvedBy,
        approvedAt,
        dbId: savedParcel ? savedParcel._id : undefined,
      },
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Routing Failed',
      message: error.message,
    });
  }
};

export const routeBatchParcels = async (req, res) => {
  const batchId = `BATCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let filename = 'inline-payload';
  let fileType = 'JSON';
  let containerId = null;
  let rawParcels = [];

  try {
    if (req.file) {
      filename = req.file.originalname;
      const fileBuffer = req.file.buffer.toString('utf-8');

      if (req.file.originalname.endsWith('.xml') || req.file.mimetype.includes('xml') || fileBuffer.trim().startsWith('<')) {
        fileType = 'XML';
        const xmlParsed = parseXmlManifest(fileBuffer);
        rawParcels = xmlParsed.parcels;
        containerId = xmlParsed.containerId || null;
      } else {
        fileType = 'JSON';
        const parsedJson = JSON.parse(fileBuffer);
        rawParcels = Array.isArray(parsedJson) ? parsedJson : (parsedJson.parcels || [parsedJson]);
      }
    } else if (req.body && (Array.isArray(req.body) || Array.isArray(req.body.parcels))) {
      fileType = 'JSON';
      rawParcels = Array.isArray(req.body) ? req.body : req.body.parcels;
    } else if (req.body && typeof req.body.xmlContent === 'string') {
      fileType = 'XML';
      const xmlParsed = parseXmlManifest(req.body.xmlContent);
      rawParcels = xmlParsed.parcels;
      containerId = xmlParsed.containerId || null;
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No batch file uploaded or invalid JSON/XML payload',
      });
    }

    const assignedWarehouseId = req.body.warehouseId || req.user?.warehouseId || 'WH-AMS-01';
    const isSupervisor = req.user?.role === 'Supervisor' || req.user?.role === 'Admin';
    const routedCounts = { Mail: 0, Regular: 0, Heavy: 0, Insurance: 0, Customs: 0 };
    const processedParcels = [];

    for (let i = 0; i < rawParcels.length; i++) {
      const item = rawParcels[i];
      const parcelInput = {
        id: item.id || `P-${batchId}-${i + 1}`,
        weightKg: Number(item.weightKg ?? item.Weight ?? 0),
        valueEur: Number(item.valueEur ?? item.Value ?? 0),
        recipient: item.recipient || item.Receipient || { name: 'Unknown' },
        destinationCountry: item.destinationCountry || item.DestinationCountry || 'NL',
        postalCode: item.postalCode || (item.Receipient?.Address?.PostalCode) || '',
        warehouseId: assignedWarehouseId,
      };

      const routingResult = engine.route(parcelInput);
      routedCounts[routingResult.department] = (routedCounts[routingResult.department] || 0) + 1;

      let approvalStatus = 'NOT_REQUIRED';
      let approvedBy = null;
      let approvedAt = null;

      if (routingResult.requiresApproval) {
        if (isSupervisor) {
          approvalStatus = 'APPROVED';
          approvedBy = req.user?.name || 'Supervisor';
          approvedAt = new Date();
        } else {
          approvalStatus = 'PENDING';
        }
      }

      processedParcels.push({
        parcelId: routingResult.parcelId,
        warehouseId: assignedWarehouseId,
        recipient: typeof parcelInput.recipient === 'object' ? parcelInput.recipient : { name: parcelInput.recipient },
        weightKg: parcelInput.weightKg,
        valueEur: parcelInput.valueEur,
        destinationCountry: parcelInput.destinationCountry,
        postalCode: parcelInput.postalCode,
        department: routingResult.department,
        requiresApproval: approvalStatus === 'PENDING',
        approvalStatus,
        approvedBy,
        approvedAt,
        releasedFromEscrow: false,
        matchedRule: routingResult.matchedRule,
        evaluatedRules: routingResult.evaluatedRules,
        batchId,
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1 && process.env.NODE_ENV !== 'test_no_db';
    if (isDbConnected) {
      try {
        await ParcelModel.insertMany(processedParcels);
        await BatchJobModel.create({
          batchId,
          filename,
          fileType,
          totalParcels: processedParcels.length,
          routedCounts,
          status: 'COMPLETED',
        });
      } catch (dbError) {
        console.warn('Database save warning (batch route):', dbError.message);
      }
    } else {
      processedParcels.forEach((p) => {
        inMemoryParcels.unshift({
          ...p,
          _id: p._id || `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date(),
        });
      });
    }

    return res.status(200).json({
      success: true,
      batchId,
      summary: {
        filename,
        fileType,
        containerId,
        totalParcels: processedParcels.length,
        routedCounts,
        status: 'COMPLETED',
      },
      results: processedParcels,
    });
  } catch (error) {
    return res.status(400).json({
      error: 'Batch Processing Failed',
      message: error.message,
    });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'test_no_db') {
      return res.status(200).json({ success: true, pendingParcels: [] });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      let pending = inMemoryParcels.filter((p) => p.approvalStatus === 'PENDING');
      if (req.user?.warehouseId && req.user?.role !== 'Admin') {
        pending = pending.filter((p) => p.warehouseId === req.user.warehouseId);
      }
      return res.status(200).json({
        success: true,
        warehouseId: req.user?.warehouseId || 'WH-AMS-01',
        pendingParcels: pending,
      });
    }

    const filter = { approvalStatus: 'PENDING' };
    if (req.user?.warehouseId && req.user?.role !== 'Admin') {
      filter.warehouseId = req.user.warehouseId;
    }

    const pendingParcels = await ParcelModel.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      warehouseId: req.user?.warehouseId || 'WH-AMS-01',
      pendingParcels,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const approveParcel = async (req, res) => {
  try {
    const { id } = req.params;
    const supervisorName = req.user?.name || 'Supervisor';

    if (process.env.NODE_ENV === 'test_no_db') {
      return res.status(200).json({
        success: true,
        message: `Parcel ${id} approved by ${supervisorName}`,
        parcel: { parcelId: id, approvalStatus: 'APPROVED', approvedBy: supervisorName, approvedAt: new Date(), releasedFromEscrow: true },
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      const parcel = inMemoryParcels.find((p) => p._id === id || p.parcelId === id);
      if (!parcel) {
        return res.status(404).json({ error: 'Not Found', message: 'Parcel record not found' });
      }
      parcel.requiresApproval = false;
      parcel.approvalStatus = 'APPROVED';
      parcel.approvedBy = supervisorName;
      parcel.approvedAt = new Date();
      parcel.releasedFromEscrow = true;

      return res.status(200).json({
        success: true,
        message: `Insurance clearance approved for parcel ${parcel.parcelId}`,
        parcel,
      });
    }

    const parcel = await ParcelModel.findByIdAndUpdate(
      id,
      {
        requiresApproval: false,
        approvalStatus: 'APPROVED',
        approvedBy: supervisorName,
        approvedAt: new Date(),
        releasedFromEscrow: true,
      },
      { new: true }
    );

    if (!parcel) {
      return res.status(404).json({ error: 'Not Found', message: 'Parcel record not found' });
    }

    logger.info('INSURANCE_PARCEL_APPROVED_BY_SUPERVISOR', {
      parcelId: parcel.parcelId,
      approvedBy: supervisorName,
      warehouseId: req.user?.warehouseId,
    });

    return res.status(200).json({
      success: true,
      message: `Insurance clearance approved for parcel ${parcel.parcelId}`,
      parcel,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getRecentApprovals = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'test_no_db') {
      return res.status(200).json({ success: true, recentApprovals: [] });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    let approvedParcels = [];

    if (isDbConnected) {
      const filter = { approvalStatus: 'APPROVED', releasedFromEscrow: true };
      if (req.user?.warehouseId && req.user?.role !== 'Admin') {
        filter.warehouseId = req.user.warehouseId;
      }

      approvedParcels = await ParcelModel.find(filter)
        .sort({ approvedAt: -1 })
        .limit(6)
        .lean();
    } else {
      let filtered = inMemoryParcels.filter((p) => p.approvalStatus === 'APPROVED' && p.releasedFromEscrow);
      if (req.user?.warehouseId && req.user?.role !== 'Admin') {
        filtered = filtered.filter((p) => p.warehouseId === req.user.warehouseId);
      }
      approvedParcels = filtered.slice(0, 6);
    }

    const formatted = approvedParcels.map((p) => {
      const country = p.destinationCountry ? String(p.destinationCountry).trim().toUpperCase() : 'NL';
      const isNonEu = !EU_COUNTRIES.has(country);

      let targetDept = 'Regular';
      let targetBay = 'Bay R-02 (Standard Delivery Van)';

      if (isNonEu) {
        targetDept = 'Customs';
        targetBay = 'Bay C-02 (International Border Clearance)';
      } else if (p.weightKg > 10.0) {
        targetDept = 'Heavy';
        targetBay = 'Bay H-04 (Pallet Freight Loading)';
      } else if (p.weightKg <= 1.0) {
        targetDept = 'Mail';
        targetBay = 'Bay M-01 (High-Speed Automated Sorter)';
      }

      return {
        id: p._id,
        parcelId: p.parcelId,
        recipient: p.recipient?.name || 'Customer',
        weightKg: p.weightKg,
        valueEur: p.valueEur,
        destinationCountry: country,
        approvedBy: p.approvedBy || 'Supervisor',
        approvedAt: p.approvedAt,
        releasedDepartment: targetDept,
        releasedBay: targetBay,
        dispatchOrder: `Release from Vault S-01 -> Move to ${targetBay}`,
      };
    });

    return res.status(200).json({
      success: true,
      recentApprovals: formatted,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getAnalyticsMetrics = async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'test_no_db') {
      return res.status(200).json({
        success: true,
        data: {
          totalParcels: 0,
          pendingApprovals: 0,
          approvedInsurance: 0,
          departmentBreakdown: { Mail: 0, Regular: 0, Heavy: 0, Insurance: 0, Customs: 0 },
          anomalyAlerts: [],
        },
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    let allParcels = [];
    if (isDbConnected) {
      const warehouseIdFilter = req.user?.warehouseId && req.user?.role !== 'Admin' ? { warehouseId: req.user.warehouseId } : {};
      allParcels = await ParcelModel.find(warehouseIdFilter).sort({ createdAt: -1 });
    } else {
      allParcels = req.user?.warehouseId && req.user?.role !== 'Admin'
        ? inMemoryParcels.filter((p) => p.warehouseId === req.user.warehouseId)
        : inMemoryParcels;
    }
    const totalParcels = allParcels.length;

    const departmentBreakdown = { Mail: 0, Regular: 0, Heavy: 0, Insurance: 0, Customs: 0 };
    let pendingApprovals = 0;
    let approvedInsurance = 0;
    let highValueCount = 0;
    let heavyCount = 0;

    let latestInsuranceParcel = null;
    let latestHeavyParcel = null;
    let latestCustomsParcel = null;

    const extremeValueParcels = [];
    const extremeWeightParcels = [];

    allParcels.forEach((p) => {
      departmentBreakdown[p.department] = (departmentBreakdown[p.department] || 0) + 1;
      if (p.approvalStatus === 'PENDING') pendingApprovals++;
      if (p.approvalStatus === 'APPROVED') approvedInsurance++;
      if (p.valueEur > 1000) {
        highValueCount++;
        if (!latestInsuranceParcel) latestInsuranceParcel = p;
      }
      if (p.weightKg > 10) {
        heavyCount++;
        if (!latestHeavyParcel) latestHeavyParcel = p;
      }
      if (p.department === 'Customs' && !latestCustomsParcel) {
        latestCustomsParcel = p;
      }

      // Detect individual extreme value outliers (Declared value >= €2,500)
      if (p.valueEur >= 2500) {
        extremeValueParcels.push(p);
      }
      // Detect individual extreme weight outliers (Declared weight >= 20kg)
      if (p.weightKg >= 20) {
        extremeWeightParcels.push(p);
      }
    });

    const anomalyAlerts = [];

    if (totalParcels > 0) {
      // 1. Facility Statistical Ratio Anomaly: High-Value Insurance Surge (>15% nominal baseline)
      const insuranceRatio = Math.round((departmentBreakdown.Insurance / totalParcels) * 100);
      if (insuranceRatio > 15 && departmentBreakdown.Insurance >= 1) {
        anomalyAlerts.push({
          id: 'ANOMALY-RATIO-INSURANCE',
          level: insuranceRatio > 35 ? 'CRITICAL' : 'WARNING',
          type: 'FACILITY_ANOMALY',
          title: `High-Value Insurance Surge (${insuranceRatio}% vs 15% Nominal SLA)`,
          message: `${departmentBreakdown.Insurance} of ${totalParcels} total consignments (${insuranceRatio}%) diverted to Vault S-01. Statistical deviation exceeds nominal 15% threshold.`,
          timestamp: latestInsuranceParcel?.createdAt ? new Date(latestInsuranceParcel.createdAt).toISOString() : new Date().toISOString(),
        });
      }

      // 2. Facility Statistical Capacity Anomaly: Heavy Freight Spike (>12% conveyor load)
      const heavyRatio = Math.round((departmentBreakdown.Heavy / totalParcels) * 100);
      if (heavyRatio > 12 && departmentBreakdown.Heavy >= 2) {
        anomalyAlerts.push({
          id: 'ANOMALY-RATIO-HEAVY',
          level: 'WARNING',
          type: 'FACILITY_ANOMALY',
          title: `Heavy Freight Conveyor Spike (${heavyRatio}%)`,
          message: `${departmentBreakdown.Heavy} heavy freight units queued for pallet transport (Bay H-04). Conveyor capacity running at ${heavyRatio}%.`,
          timestamp: latestHeavyParcel?.createdAt ? new Date(latestHeavyParcel.createdAt).toISOString() : new Date().toISOString(),
        });
      }

      // 3. Facility Statistical Customs Surge (>20% non-EU destinations)
      const customsRatio = Math.round((departmentBreakdown.Customs / totalParcels) * 100);
      if (customsRatio > 20 && departmentBreakdown.Customs >= 2) {
        anomalyAlerts.push({
          id: 'ANOMALY-RATIO-CUSTOMS',
          level: 'WARNING',
          type: 'FACILITY_ANOMALY',
          title: `Cross-Border Customs Volume Surge (${customsRatio}%)`,
          message: `${departmentBreakdown.Customs} international consignments flagged for UPU border customs documentation (Bay C-02).`,
          timestamp: latestCustomsParcel?.createdAt ? new Date(latestCustomsParcel.createdAt).toISOString() : new Date().toISOString(),
        });
      }

      // 4. Individual Consignment Outlier Records: Highest Valuation Parcels (Value >= €2,500)
      extremeValueParcels
        .sort((a, b) => b.valueEur - a.valueEur)
        .slice(0, 5)
        .forEach((p) => {
          const excessPct = Math.round((p.valueEur / 1000) * 100);
          anomalyAlerts.push({
            id: `OUTLIER-VAL-${p.parcelId}`,
            level: p.valueEur >= 5000 ? 'CRITICAL' : 'WARNING',
            type: 'EXTREME_OUTLIER',
            title: `Extreme Valuation Outlier: ${p.parcelId} (€${Number(p.valueEur).toLocaleString()})`,
            message: `Declared consignment valuation of €${Number(p.valueEur).toLocaleString()} (${p.destinationCountry || 'Intl'}) exceeds standard diverter threshold by ${excessPct}%. Vault escrow custody active.`,
            timestamp: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
          });
        });

      // 5. Individual Consignment Outlier Records: Heaviest Consignments (Weight >= 20kg)
      extremeWeightParcels
        .sort((a, b) => b.weightKg - a.weightKg)
        .slice(0, 5)
        .forEach((p) => {
          anomalyAlerts.push({
            id: `OUTLIER-WT-${p.parcelId}`,
            level: 'WARNING',
            type: 'EXTREME_OUTLIER',
            title: `Overweight Consignment Outlier: ${p.parcelId} (${p.weightKg} kg)`,
            message: `Consignment weight (${p.weightKg} kg to ${p.destinationCountry || 'NL'}) exceeds automated belt sorter tolerance (>10kg). Palletized freight transfer assigned.`,
            timestamp: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
          });
        });
    }

    // Sort all anomaly and outlier records chronologically (most recent first)
    anomalyAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
      success: true,
      data: {
        warehouseId: req.user?.warehouseId || 'WH-AMS-01',
        totalParcels,
        pendingApprovals,
        approvedInsurance,
        departmentBreakdown,
        anomalyAlerts,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const resetAnalyticsMetrics = async (req, res) => {
  try {
    const warehouseIdFilter = req.user?.warehouseId && req.user?.role !== 'Admin'
      ? { warehouseId: req.user.warehouseId }
      : {};

    let deletedCount = 0;
    const isDbConnected = mongoose.connection.readyState === 1 && process.env.NODE_ENV !== 'test_no_db';
    if (isDbConnected) {
      const pResult = await ParcelModel.deleteMany(warehouseIdFilter);
      await BatchJobModel.deleteMany(warehouseIdFilter);
      deletedCount = pResult.deletedCount || 0;
    } else {
      if (req.user?.warehouseId && req.user?.role !== 'Admin') {
        for (let i = inMemoryParcels.length - 1; i >= 0; i--) {
          if (inMemoryParcels[i].warehouseId === req.user.warehouseId) {
            inMemoryParcels.splice(i, 1);
            deletedCount++;
          }
        }
      } else {
        deletedCount = inMemoryParcels.length;
        inMemoryParcels.length = 0;
      }
    }

    logger.info('FACILITY_TELEMETRY_HISTORY_RESET', {
      user: req.user?.email || req.user?.name || 'Authorized User',
      warehouseId: req.user?.warehouseId || 'WH-AMS-01',
      deletedCount,
    });

    return res.status(200).json({
      success: true,
      message: 'Facility telemetry and parcel routing history reset to zero successfully',
      deletedCount,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};


