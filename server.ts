import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  generateAMVDataForProduct,
  getBaseMonograph,
  buildFullAMVDataFromMonograph,
  MonographDefinition,
} from './src/services/pharmaDatabase';
import { buildFullRSAMVData } from './src/services/rsPharmaDatabase';
import { buildFullDissolutionAMVData } from './src/services/dissolutionPharmaDatabase';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Lazy-initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to safely extract JSON from AI response text
function extractJSONFromText(text: string): any {
  if (!text) return null;
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  // If still not clean JSON, find outer-most curly braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

// In-memory document cache and circuit breaker for API rate limits
const monographCache = new Map<string, any>();
let aiCircuitBreakerUntil = 0;

// AMV Synthesis API: Generates accurate compendial HPLC validation data
app.post('/api/generate-amv', async (req, res) => {
  const { productName, documentNo, batchNo, companyName, fpsFileData } = req.body;

  if (!productName || typeof productName !== 'string') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  // Check cache first for rapid response
  const cacheKey = `${productName.trim().toLowerCase()}_${documentNo || ''}_${batchNo || ''}_${companyName || ''}` + (fpsFileData ? '_fps' : '');
  if (monographCache.has(cacheKey)) {
    return res.json({ data: monographCache.get(cacheKey), source: 'cache' });
  }

  // Base data generated from our comprehensive compendium library & synthesizer
  const baseMono = getBaseMonograph(productName);
  const fallbackData = buildFullAMVDataFromMonograph(productName, baseMono, {
    documentNo: documentNo || undefined,
    validationBatchNo: batchNo || undefined,
    companyName: companyName || undefined,
  });

  const ai = getAIClient();
  // If no AI key configured or rate-limit circuit breaker active, use local compendium directly
  if (!ai || Date.now() < aiCircuitBreakerUntil) {
    monographCache.set(cacheKey, fallbackData);
    return res.json({ data: fallbackData, source: 'compendium' });
  }

  try {
    let prompt = `You are a Principal Pharmaceutical Quality Control Scientist and Pharmacopeial Compendia Expert.
Retrieve and verify against the official United States Pharmacopeia (USP-NF), British Pharmacopoeia (BP), European Pharmacopoeia (Ph. Eur.), and international compendial databases the authentic HPLC Assay method for: "${productName}".

Candidate baseline data:
- Active: ${baseMono.activeSubstance}
- Label Claim: ${baseMono.labelClaim}
- Official Reference: ${baseMono.reference}
- Column: ${baseMono.chromatographicConditions.column}
- Mobile Phase: ${baseMono.chromatographicConditions.mobilePhase}
- Flow Rate: ${baseMono.chromatographicConditions.flowRate}
- Wavelength: ${baseMono.chromatographicConditions.detectionWavelength}
- Diluent: ${baseMono.chromatographicConditions.diluent}

Cross-reference exact compendial chromatographic conditions:
1. Exact USP column classification (e.g. USP L1 C18, L7 C8, L8 Amino, L11 Phenyl, L57) with exact dimensions (length, internal diameter, particle size e.g. 5 µm or 3.5 µm).
2. Exact mobile phase: precise buffer molarities (e.g., 0.05 M KH2PO4, 0.02 M NaH2PO4, 0.05 M Ammonium Acetate, etc.), exact pH adjustment and acid/base modifier (orthophosphoric acid, triethylamine, sodium hydroxide), organic solvents (Acetonitrile, Methanol, THF) and exact volume ratios (v/v).
3. Exact flow rate (mL/min), detection wavelength (UV nm), injection volume (µL), column temperature (°C), run time (min), and diluent.
4. Step-by-step standard and sample preparation with real volumetric dilutions and filtration (0.45 µm nylon/PVDF).
5. Chemical reagents list with analytical/HPLC grades.

Return ONLY a valid JSON object matching this structure:
{
  "activeSubstance": "exact active substance name",
  "labelClaim": "exact label claim (e.g. 500 mg per tablet)",
  "reference": "official compendial reference (e.g. USP 2026 Monograph, BP 2026 Monograph, Ph. Eur. 11th Ed., USP <621>, ICH Q2(R2))",
  "column": "exact column stationary phase, dimensions and particle size (e.g. USP L1 C18, 4.6 mm x 250 mm, 5 µm)",
  "mobilePhase": "exact mobile phase buffer molarity, pH, organic solvent and ratio (v/v)",
  "flowRate": "flow rate with unit (e.g. 1.0 mL/min)",
  "flowRateNum": 1.0,
  "detectionWavelength": "wavelength string (e.g. UV at 243 nm)",
  "wavelengthNum": 243,
  "injectionVolume": "injection volume string (e.g. 10 µL)",
  "injectionVolumeNum": 10,
  "columnTemperature": "column temperature (e.g. 30 °C)",
  "columnTempNum": 30,
  "runTime": "run time (e.g. 12.0 min)",
  "runTimeNum": 12.0,
  "diluent": "exact diluent composition",
  "workingConcentration": "working target concentration (e.g. 0.05 mg/mL)",
  "workingConcNum": 0.05,
  "approxRetentionTime": "approximate retention time (e.g. 5.2 min)",
  "retentionTimeNum": 5.2,
  "nominalArea": 2400000,
  "targetNominalWeight": 50.0,
  "mobilePhaseBufferPH": 3.0,
  "note": "detailed buffer preparation instructions and pH adjustment details",
  "standardSolution": "step-by-step weighing, dissolving, and diluting instructions for standard",
  "sampleSolution": "step-by-step crushing, weighing, extracting, sonicating, filtering, and diluting instructions for sample",
  "reagentsList": ["Acetonitrile", "Potassium Dihydrogen Phosphate", "Orthophosphoric Acid", "Milli-Q Water"]
}`;

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<string | null>((resolve) => {
      timer = setTimeout(() => resolve(null), 4000);
    });

    const callAI = async (): Promise<string | null> => {
      try {
        const contentsParts = [];
        if (fpsFileData && fpsFileData.base64 && fpsFileData.mimeType) {
          contentsParts.push({
            inlineData: {
              data: fpsFileData.base64,
              mimeType: fpsFileData.mimeType
            }
          });
          prompt = `[CRITICAL INSTRUCTION: A Finished Product Specification (FPS) document has been uploaded. You MUST extract the analytical method parameters (Mobile phase, column, wavelength, temperature, flow rate, injection volume, diluent, standard/sample preparation, etc.) exactly from this uploaded document and use them strictly, overriding any compendial or internal knowledge.]\n\n` + prompt;
        }
        contentsParts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: contentsParts,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response?.text) {
          return response.text;
        }
      } catch (callErr: any) {
        // If quota exceeded (429) or service unavailable (503), trip circuit breaker for 5 minutes
        const errStr = String(callErr?.message || callErr);
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('503')) {
          aiCircuitBreakerUntil = Date.now() + 5 * 60 * 1000;
        }
      }
      return null;
    };

    const aiResponseText = await Promise.race([
      callAI().finally(() => {
        if (timer) clearTimeout(timer);
      }),
      timeoutPromise,
    ]);

    if (aiResponseText) {
      try {
        const parsed = extractJSONFromText(aiResponseText);
        if (parsed && (parsed.activeSubstance || parsed.column || parsed.mobilePhase)) {
          const synthMono: MonographDefinition = {
            activeSubstance: parsed.activeSubstance || baseMono.activeSubstance,
            labelClaim: parsed.labelClaim || baseMono.labelClaim,
            reference: parsed.reference || baseMono.reference,
            chromatographicConditions: {
              column: parsed.column || baseMono.chromatographicConditions.column,
              mobilePhase: parsed.mobilePhase || baseMono.chromatographicConditions.mobilePhase,
              flowRate: parsed.flowRate || baseMono.chromatographicConditions.flowRate,
              detectionWavelength:
                parsed.detectionWavelength || baseMono.chromatographicConditions.detectionWavelength,
              injectionVolume:
                parsed.injectionVolume || baseMono.chromatographicConditions.injectionVolume,
              columnTemperature:
                parsed.columnTemperature || baseMono.chromatographicConditions.columnTemperature,
              runTime: parsed.runTime || baseMono.chromatographicConditions.runTime,
              diluent: parsed.diluent || baseMono.chromatographicConditions.diluent,
              workingConcentration:
                parsed.workingConcentration || baseMono.chromatographicConditions.workingConcentration,
              approxRetentionTime:
                parsed.approxRetentionTime || baseMono.chromatographicConditions.approxRetentionTime,
              note: parsed.note || baseMono.chromatographicConditions.note,
            },
            solutionPreparation: {
              standardSolution:
                parsed.standardSolution || baseMono.solutionPreparation.standardSolution,
              sampleSolution:
                parsed.sampleSolution || baseMono.solutionPreparation.sampleSolution,
            },
            retentionTimeMin: parsed.retentionTimeNum
              ? Number(parsed.retentionTimeNum)
              : parseFloat(parsed.approxRetentionTime) || baseMono.retentionTimeMin,
            targetNominalWeight: parsed.targetNominalWeight
              ? Number(parsed.targetNominalWeight)
              : baseMono.targetNominalWeight,
            nominalArea: parsed.nominalArea
              ? Number(parsed.nominalArea)
              : baseMono.nominalArea,
            workingConcNum: parsed.workingConcNum
              ? Number(parsed.workingConcNum)
              : baseMono.workingConcNum,
            flowRateNum: parsed.flowRateNum
              ? Number(parsed.flowRateNum)
              : parseFloat(parsed.flowRate) || baseMono.flowRateNum,
            columnTempNum: parsed.columnTempNum
              ? Number(parsed.columnTempNum)
              : parseFloat(parsed.columnTemperature) || baseMono.columnTempNum,
            mobilePhaseBufferPH:
              parsed.mobilePhaseBufferPH !== undefined
                ? Number(parsed.mobilePhaseBufferPH)
                : baseMono.mobilePhaseBufferPH,
            reagents:
              Array.isArray(parsed.reagentsList) && parsed.reagentsList.length > 0
                ? parsed.reagentsList
                : baseMono.reagents,
          };

          // Build complete customized validation data
          const customFullDocument = buildFullAMVDataFromMonograph(productName, synthMono, {
            documentNo,
            validationBatchNo: batchNo,
            companyName: companyName || undefined,
          });

          monographCache.set(cacheKey, customFullDocument);
          return res.json({ data: customFullDocument, source: 'ai_compendium' });
        }
      } catch (_parseErr) {
        // Seamless fallback
      }
    }
  } catch (_e) {
    // Seamless fallback
  }

  monographCache.set(cacheKey, fallbackData);
  return res.json({ data: fallbackData, source: 'compendium' });
});

// Related Substances (RS AMC) Synthesis API: Full 16-section protocol & report
app.post('/api/generate-rs-amv', async (req, res) => {
  const { productName, protocolNo, batchNo, companyName, fpsFileData } = req.body;

  if (!productName || typeof productName !== 'string') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const cacheKey = `rs_${productName.trim().toLowerCase()}_${protocolNo || ''}_${batchNo || ''}` + (fpsFileData ? '_fps' : '');
  if (monographCache.has(cacheKey)) {
    return res.json({ data: monographCache.get(cacheKey), source: 'cache' });
  }

  // Fallback data using our comprehensive compendium library & dynamic math engine
  const fallbackData = buildFullRSAMVData(productName, {
    protocolNo: protocolNo || undefined,
    batchNo: batchNo || undefined,
    companyName: companyName || undefined,
  });

  const ai = getAIClient();
  if (!ai || Date.now() < aiCircuitBreakerUntil) {
    monographCache.set(cacheKey, fallbackData);
    return res.json({ data: fallbackData, source: 'rs_compendium' });
  }

  try {
    const candidateChrom = fallbackData.methodSummary.chromatographicConditions;
    let prompt = `You are a Principal Pharmaceutical Quality Control Scientist and Impurity Profiling Expert.
Retrieve and verify against the official United States Pharmacopeia (USP-NF), British Pharmacopoeia (BP), European Pharmacopoeia (Ph. Eur.), and ICH Q3A/Q3B guidelines the authentic Related Substances (Organic Impurities) HPLC/GC method for: "${productName}".

Candidate baseline data:
- Reference: ${fallbackData.reference}
- Column: ${candidateChrom.column}
- Mobile Phase: ${candidateChrom.carrierGasOrMobilePhase}
- Flow Rate: ${candidateChrom.injectionTempOrFlowRate}
- Wavelength: ${candidateChrom.detectorTempOrWavelength}
- Diluent: ${candidateChrom.diluent}

Cross-reference exact compendial criteria:
1. Exact official specified impurity name (e.g., "4-Aminophenol (Impurity K)" for Paracetamol, "Dicyandiamide (Impurity A)" for Metformin, "Atorvastatin Lactone (Impurity A)", "Pantoprazole Sulfone (Impurity A)", "Omeprazole Sulfone (Impurity D)", etc.).
2. Accurate Relative Retention Times (RRT) or retention times (activeRtMin and impurityRtMin).
3. Authentic stationary phase (USP column classification L1, L7, L11, L8 with exact length, diameter, and particle size).
4. Exact mobile phase buffer, molarity, pH, modifier, and organic proportions (v/v).
5. Exact flow rate (mL/min), detection wavelength (UV nm), injection volume (µL), and nominal impurity limit (ppm).

Return ONLY a valid JSON object matching this structure:
{
  "productName": "${productName}",
  "labelClaim": "exact label claim",
  "reference": "official compendial reference (e.g. BP 2026 Monograph, USP 2026 Monograph, Ph. Eur. 11th Ed., ICH Q2(R2) & Q3A/B)",
  "technique": "HPLC",
  "detector": "UV at 245 nm",
  "column": "exact column stationary phase, dimensions and particle size (e.g. USP L1 C18, 4.6 mm x 250 mm, 5 µm)",
  "carrierGasOrMobilePhase": "exact mobile phase buffer molarity, pH, organic solvent and ratio (v/v)",
  "injectionTempOrFlowRate": "flow rate with unit (e.g. 1.0 mL/min)",
  "detectorTempOrWavelength": "UV wavelength (e.g. 245 nm)",
  "injectionVolume": "injection volume (e.g. 20 µL)",
  "diluent": "exact diluent composition",
  "impurityName": "exact official specified impurity name",
  "activeRtMin": 8.5,
  "impurityRtMin": 3.8,
  "nominalPpm": 250
}`;

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<string | null>((resolve) => {
      timer = setTimeout(() => resolve(null), 4000);
    });

    const callAI = async (): Promise<string | null> => {
      try {
        const contentsParts = [];
        if (fpsFileData && fpsFileData.base64 && fpsFileData.mimeType) {
          contentsParts.push({
            inlineData: {
              data: fpsFileData.base64,
              mimeType: fpsFileData.mimeType
            }
          });
          prompt = `[CRITICAL INSTRUCTION: A Finished Product Specification (FPS) document has been uploaded. You MUST extract the analytical method parameters (Mobile phase, column, wavelength, temperature, flow rate, injection volume, diluent, standard/sample preparation, etc.) exactly from this uploaded document and use them strictly, overriding any compendial or internal knowledge.]\n\n` + prompt;
        }
        contentsParts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: contentsParts,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response?.text) return response.text;
      } catch (callErr: any) {
        const errStr = String(callErr?.message || callErr);
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('503')) {
          aiCircuitBreakerUntil = Date.now() + 5 * 60 * 1000;
        }
      }
      return null;
    };

    const aiResponseText = await Promise.race([
      callAI().finally(() => {
        if (timer) clearTimeout(timer);
      }),
      timeoutPromise,
    ]);

    if (aiResponseText) {
      const parsed = extractJSONFromText(aiResponseText);
      if (parsed && (parsed.impurityName || parsed.column || parsed.carrierGasOrMobilePhase)) {
        const verifiedRSData = buildFullRSAMVData(productName, {
          protocolNo: protocolNo || undefined,
          batchNo: batchNo || undefined,
          companyName: companyName || undefined,
          verifiedMonograph: {
            reference: parsed.reference || undefined,
            column: parsed.column || undefined,
            carrierGasOrMobilePhase: parsed.carrierGasOrMobilePhase || undefined,
            injectionTempOrFlowRate: parsed.injectionTempOrFlowRate || undefined,
            detectorTempOrWavelength: parsed.detectorTempOrWavelength || undefined,
            impurityName: parsed.impurityName || undefined,
            activeRtMin: parsed.activeRtMin ? Number(parsed.activeRtMin) : undefined,
            impurityRtMin: parsed.impurityRtMin ? Number(parsed.impurityRtMin) : undefined,
            nominalPpm: parsed.nominalPpm ? Number(parsed.nominalPpm) : undefined,
          },
        });
        monographCache.set(cacheKey, verifiedRSData);
        return res.json({ data: verifiedRSData, source: 'ai_rs_compendium' });
      }
    }
  } catch (_e) {
    // Seamless fallback
  }

  monographCache.set(cacheKey, fallbackData);
  return res.json({ data: fallbackData, source: 'rs_compendium' });
});

// Dissolution Method Verification Synthesis API: Protocol & Report
app.post('/api/generate-dissolution-amv', async (req, res) => {
  const { productName, protocolNo, batchNo, companyName, date, fpsFileData } = req.body;

  if (!productName || typeof productName !== 'string') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  const cacheKey = `diss_${productName.trim().toLowerCase()}_${protocolNo || ''}_${batchNo || ''}` + (fpsFileData ? '_fps' : '');
  if (monographCache.has(cacheKey)) {
    const cached = monographCache.get(cacheKey);
    const prodFirst = productName.trim().toLowerCase().split(' ')[0];
    if (cached && String(cached.productName || '').toLowerCase().includes(prodFirst)) {
      return res.json({
        data: cached,
        source: 'cache_hit',
        timestamp: new Date().toISOString(),
        verifiedSource: 'Compendial Cache Layer',
      });
    }
    monographCache.delete(cacheKey);
  }

  const fallbackData = buildFullDissolutionAMVData(productName, {
    protocolNo: protocolNo || undefined,
    batchNo: batchNo || undefined,
    companyName: companyName || undefined,
    date: date || undefined,
  });

  const ai = getAIClient();
  if (!ai || Date.now() < aiCircuitBreakerUntil) {
    monographCache.set(cacheKey, fallbackData);
    return res.json({
      data: fallbackData,
      source: 'dissolution_compendium',
      timestamp: new Date().toISOString(),
      verifiedSource: fallbackData.reference,
    });
  }

  try {
    const candidateChrom = fallbackData.methodSummary.chromatographicConditions;
    const candidateDiss = fallbackData.methodSummary.dissolutionConditions;
    let prompt = `You are a Principal Pharmaceutical Quality Control Scientist and Dissolution Testing Expert.
Retrieve and verify against the official United States Pharmacopeia (USP <711> & individual monographs), British Pharmacopoeia (BP Appendix XII B1), European Pharmacopoeia (Ph. Eur. 2.9.3), and US FDA Dissolution Database the authentic Dissolution test method for: "${productName}".

Candidate baseline data:
- Reference: ${fallbackData.reference}
- Medium: ${candidateDiss.medium}
- Apparatus: ${candidateDiss.apparatus}
- Speed: ${candidateDiss.paddleSpeed}
- Sampling Time: ${candidateDiss.samplingTime}
- Q-Limit: ${fallbackData.methodSummary.monographLimits.limit}
- Column: ${candidateChrom.column}
- Mobile Phase: ${candidateChrom.mobilePhase}
- Flow Rate: ${candidateChrom.flowRate}
- Wavelength: ${candidateChrom.detectionWavelength}

Cross-reference exact compendial criteria:
1. Exact dissolution medium and volume (e.g., 900 mL 0.01M/0.1M HCl; 900 mL 0.05 M Phosphate buffer pH 6.8; 500 mL 0.25% SLS; or 2-stage enteric: 0.1 N HCl 120 min then pH 6.8 phosphate buffer).
2. Exact compendial apparatus: USP Apparatus 2 (paddle) or Apparatus 1 (basket), and rotational speed (50 rpm, 75 rpm, or 100 rpm).
3. Medium temperature: 37 °C ± 0.5 °C.
4. Sampling time point: 30 minutes, 45 minutes, or 60 minutes.
5. Acceptance Q-Limit: Not less than 75 % (Q) or 80 % (Q) of label claim.
6. Analytical finish: HPLC or UV spectrophotometry conditions (column, mobile phase, flow rate, detection wavelength nm).

Return ONLY a valid JSON object matching this structure:
{
  "productName": "${productName}",
  "labelClaim": "exact label claim",
  "reference": "official compendial reference (e.g. USP Monograph, BP Appendix XII B1, FDA Dissolution Database)",
  "qLimit": "Not less than 80 % (Q) of the stated amount",
  "samplingTime": "45 minutes",
  "medium": "exact dissolution medium and volume (e.g. 900 mL of 0.05 M Phosphate buffer pH 6.8)",
  "apparatus": "Apparatus 2 (paddle)",
  "paddleSpeed": "50 revolutions per minute",
  "diluent": "exact diluent",
  "wavelength": "UV at 243 nm",
  "wavelengthNum": 243,
  "column": "column stationary phase and dimensions (e.g. USP L1 C18, 4.6 mm x 150 mm, 5 µm)",
  "mobilePhase": "exact mobile phase composition",
  "flowRate": "flow rate with unit (e.g. 1.0 mL/min)"
}`;

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<string | null>((resolve) => {
      timer = setTimeout(() => resolve(null), 4000);
    });

    const callAI = async (): Promise<string | null> => {
      try {
        const contentsParts = [];
        if (fpsFileData && fpsFileData.base64 && fpsFileData.mimeType) {
          contentsParts.push({
            inlineData: {
              data: fpsFileData.base64,
              mimeType: fpsFileData.mimeType
            }
          });
          prompt = `[CRITICAL INSTRUCTION: A Finished Product Specification (FPS) document has been uploaded. You MUST extract the analytical method parameters (Mobile phase, column, wavelength, temperature, flow rate, injection volume, diluent, standard/sample preparation, etc.) exactly from this uploaded document and use them strictly, overriding any compendial or internal knowledge.]\n\n` + prompt;
        }
        contentsParts.push({ text: prompt });

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: contentsParts,
          config: {
            responseMimeType: 'application/json',
          },
        });
        if (response?.text) return response.text;
      } catch (callErr: any) {
        const errStr = String(callErr?.message || callErr);
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('503')) {
          aiCircuitBreakerUntil = Date.now() + 5 * 60 * 1000;
        }
      }
      return null;
    };

    const aiResponseText = await Promise.race([
      callAI().finally(() => {
        if (timer) clearTimeout(timer);
      }),
      timeoutPromise,
    ]);

    if (aiResponseText) {
      const parsed = extractJSONFromText(aiResponseText);
      if (parsed && (parsed.medium || parsed.column || parsed.wavelength)) {
        // Schema & Unit Bounds Validation (Pillar B.2)
        const parsedWl = parsed.wavelengthNum ? Number(parsed.wavelengthNum) : undefined;
        const validWl = parsedWl && parsedWl >= 190 && parsedWl <= 800 ? parsedWl : undefined;

        const verifiedDissData = buildFullDissolutionAMVData(productName, {
          protocolNo: protocolNo || undefined,
          batchNo: batchNo || undefined,
          companyName: companyName || undefined,
          date: date || undefined,
          verifiedMonograph: {
            reference: parsed.reference || undefined,
            qLimit: parsed.qLimit || undefined,
            samplingTime: parsed.samplingTime || undefined,
            medium: parsed.medium || undefined,
            apparatus: parsed.apparatus || undefined,
            paddleSpeed: parsed.paddleSpeed || undefined,
            wavelength: parsed.wavelength || undefined,
            wavelengthNum: validWl,
            column: parsed.column || undefined,
            mobilePhase: parsed.mobilePhase || undefined,
            flowRate: parsed.flowRate || undefined,
          },
        });
        monographCache.set(cacheKey, verifiedDissData);
        return res.json({
          data: verifiedDissData,
          source: 'ai_dissolution_compendium',
          timestamp: new Date().toISOString(),
          verifiedSource: parsed.reference || 'Compendial AI Ingestion Pipeline',
        });
      }
    }
  } catch (_e) {
    // Seamless fallback
  }

  monographCache.set(cacheKey, fallbackData);
  return res.json({
    data: fallbackData,
    source: 'dissolution_compendium',
    timestamp: new Date().toISOString(),
    verifiedSource: fallbackData.reference,
  });
});

// Instant Document Parameter Extraction API (PDF & Image OCR via Gemini 3.6 Flash)
app.post('/api/extract-fps', async (req, res) => {
  const { fileData } = req.body;
  if (!fileData || !fileData.base64) {
    return res.status(400).json({ error: 'No file data provided', overrides: {} });
  }

  const ai = getAIClient();
  if (!ai || Date.now() < aiCircuitBreakerUntil) {
    return res.json({ overrides: {}, source: 'offline_compendium' });
  }

  try {
    const contents: any[] = [
      {
        inlineData: {
          data: fileData.base64,
          mimeType: fileData.mimeType || 'application/pdf',
        },
      },
      {
        text: `You are an expert pharmaceutical analytical chemist. Extract the chromatographic HPLC conditions and specifications from this attached Finished Product Specification (FPS) / Method of Analysis (MOA) document.
Return ONLY a valid JSON object matching this structure:
{
  "productName": "product name with strength if found (e.g. Vildagliptin Tablets 100 mg)",
  "activeSubstance": "active pharmaceutical ingredient name",
  "column": "column stationary phase and dimensions (e.g. C18, 250 mm x 4.6 mm, 5 µm)",
  "mobilePhase": "exact mobile phase buffer and organic ratio",
  "flowRate": "flow rate with unit (e.g. 1.0 mL/min)",
  "wavelength": "detection wavelength (e.g. 210 nm)",
  "injectionVolume": "injection volume (e.g. 10 µL)",
  "columnTemperature": "column temperature (e.g. 30 °C)",
  "runTime": "run time (e.g. 12.0 min)",
  "diluent": "diluent composition",
  "workingConcentration": "working standard concentration"
}`,
      },
    ];

    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<string | null>((resolve) => {
      timer = setTimeout(() => resolve(null), 4500);
    });

    const aiCall = async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          responseMimeType: 'application/json',
        },
      });
      return response?.text || null;
    };

    const text = await Promise.race([aiCall().finally(() => timer && clearTimeout(timer)), timeoutPromise]);
    if (text) {
      const parsed = extractJSONFromText(text);
      if (parsed) {
        return res.json({ overrides: parsed, success: true });
      }
    }
  } catch (err: any) {
    console.error('FPS Extraction error:', err?.message || err);
  }

  return res.json({ overrides: {}, success: false });
});

app.post("/api/log-error", express.json(), (req, res) => { console.log("CLIENT ERROR:", req.body.error); res.json({ success: true }); });
// Vite Middleware & Static Serving
async function startServer() {
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Analytical Method Validation Server running on port ${PORT}`);
  });
}

startServer();

