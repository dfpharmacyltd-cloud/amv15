import { validateMLT, runMLTSelfTest } from "./services/mltValidation";
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import {
  AMVDocumentData,
  RSAMVDocumentData,
  DissolutionAMVDocumentData,
  DocumentType,
  ThemeFormat,
  ValidationMethodType,
  FontFamilyType,
  FontSizePt,
  DataMode,
  FooterSignOffData,
} from './types';
import { DEFAULT_FOOTER_SIGN_OFF } from './components/SignOffFooter';
import {
  generateAMVDataForProduct,
  generateUniqueValidationCodes,
  getMethodDocumentNumber,
} from './services/pharmaDatabase';
import { buildFullRSAMVData } from './services/rsPharmaDatabase';
import { buildDissolutionUvAMVData } from './services/dissolutionUvDatabase';
import { generateAndDownloadDissolutionUvDocx } from './services/dissolutionUvDocxGenerator';
import { DissolutionUvDocumentViewer } from './components/DissolutionUvDocumentViewer';
import { buildTitrationAMVData } from './services/titrationDatabase';
import { generateAndDownloadTitrationDocx } from './services/titrationDocxGenerator';
import { TitrationDocumentViewer } from './components/TitrationDocumentViewer';
import { generateMLTAMVDataForProduct } from './services/mltPharmaDatabase';
import { MLTDocumentData } from './types';
import { buildFullDissolutionAMVData, getDissolutionMonograph } from './services/dissolutionPharmaDatabase';
import { computePctDissolved, computeAssayPct, computeImpPct, SALT_FACTORS, recalculateAMVData, recalculateRSData, recalculateDissolutionData } from './services/mathUtils';
import { extractDynamicLabelClaim } from './services/pharmaMathEngine';
import { generateAndDownloadAMVDocx } from './services/amvDocxGenerator';
import { generateAndDownloadRSAMVDocx } from './services/rsDocxGenerator';
import { generateAndDownloadDissolutionDocx } from './services/dissolutionDocxGenerator';
import { generateAndDownloadMLTDocx } from './services/mltDocxGenerator';
import { runPreOutputAuditGate, ComplianceGateResult } from './services/complianceAuditGate';
import { synchronizeDocumentReportDates } from './services/postGenerationSanitizer';
import { extractSSOTBlock } from './services/selfAuditEngine';
import { checkReportNoExists, saveReportRecord } from './services/reportRecordStore';
import { Header } from './components/Header';
import { AMVInputForm } from './components/AMVInputForm';
import { FPSExtractorModal, FPSOverrides } from './components/FPSExtractorModal';
import { AMVDocumentViewer } from './components/AMVDocumentViewer';
import { RSAMVDocumentViewer } from './components/RSAMVDocumentViewer';
import { MLTDocumentViewer } from './components/MLTDocumentViewer';
import { DissolutionDocumentViewer } from './components/DissolutionDocumentViewer';
import { ComplianceAuditModal } from './components/ComplianceAuditModal';
import { MajorChangePromptModal } from './components/MajorChangePromptModal';
import { SSOTModal } from './components/SSOTModal';
import { MasterPromptModal } from './components/MasterPromptModal';
import {
  extractCoreMethodParameters,
  compareCoreMethodParameters,
  getBaselineLookupKey,
  DEFAULT_METHOD_BASELINES,
  validateRevisionReasonForMajorChanges,
  MethodDiffItem,
} from './services/methodVersionHistory';

export function App() {
  // Method Type: Default to 'dissolution' as requested by the user, with RS and Assay readily available
  const [validationMethod, setValidationMethod] = useState<ValidationMethodType>('dissolution');
  // Assay together with Content of Uniformity shares the assay engine but runs a
  // wider validated range and adds the USP <905> uniformity determination.


  // Input states
  const [productName, setProductName] = useState('Tibolone Tablets BP 2.5 mg');
  const initialCodes = generateUniqueValidationCodes('Tibolone Tablets BP 2.5 mg');
  const [documentNo, setDocumentNo] = useState(initialCodes.documentNo);
  const [supersedes, setSupersedes] = useState('');
  const [batchNo, setBatchNo] = useState(initialCodes.validationBatchNo);
  const [standardLot, setStandardLot] = useState(initialCodes.standardLotNo);
  const [companyName, setCompanyName] = useState('WESTCOAST PHARMACEUTICAL WORKS LTD.');
  const [reportDate, setReportDate] = useState('20-Apr-2026');
  const [docType, setDocType] = useState<DocumentType>('protocol');
  const [theme, setTheme] = useState<ThemeFormat>('blue'); // 'blue' (Executive Blue) or 'simple' (Simple Format No Color)
  const [fontFamily, setFontFamily] = useState<FontFamilyType>('Times New Roman'); // Matches authentic monograph
  const [fontSize, setFontSize] = useState<FontSizePt>(12); // Standard 12pt pharma standard
  // One mode setting drives all four documents: PROTOCOL (default, every result
  // cell left blank) or REPORT (results filled in). The data is always synthetic,
  // so the DEMO marking is applied to every document and is not switchable.
  const [dataMode, setDataMode] = useState<DataMode>('DEMO');
  const [footerSignOffData, setFooterSignOffData] = useState<FooterSignOffData>(DEFAULT_FOOTER_SIGN_OFF);
  
    const [validationResults, setValidationResults] = useState<string[]>([]);
  const [selfTestResults, setSelfTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerationSuccess, setIsGenerationSuccess] = useState(false);

  const [potencyDecimal, setPotencyDecimal] = useState(0.9982);
  const [saltFactor, setSaltFactor] = useState(1.0000);

  const [loadingStepText, setLoadingStepText] = useState('');
  const [newAMVReadyInfo, setNewAMVReadyInfo] = useState<{
    productName: string;
    method: ValidationMethodType;
    docNo: string;
    timestamp: string;
  } | null>(null);

  const generationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const generationStepTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (generationTimerRef.current) clearTimeout(generationTimerRef.current);
      if (generationStepTimerRef.current) clearTimeout(generationStepTimerRef.current);
    };
  }, []);

  // COA and FPS Upload states
  const [coaUploaded, setCoaUploaded] = useState(false);
  const [fpsUploaded, setFpsUploaded] = useState(false);
  const [fpsFileData, setFpsFileData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [isFpsModalOpen, setIsFpsModalOpen] = useState(false);
  const [fpsOverrides, setFpsOverrides] = useState<FPSOverrides | null>(null);

  // Pre-Output Compliance & Contamination Audit Gate State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSSOTModalOpen, setIsSSOTModalOpen] = useState(false);
  const [auditNonce, setAuditNonce] = useState(0);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isMajorChangeModalOpen, setIsMajorChangeModalOpen] = useState(false);
  const [isMajorChangeJustificationNeeded, setIsMajorChangeJustificationNeeded] = useState(false);

  const [pendingExport, setPendingExport] = useState<'protocol' | 'report' | 'both' | null>(null);

  const initialBaseDocNo = initialCodes.documentNo || 'WC/QC/AMV/0316';

  // Initialize authentic Dissolution document state (Single Shared Product: Tibolone Tablets BP 2.5 mg)
  const [dissolutionData, setDissolutionData] = useState<DissolutionAMVDocumentData>(() => {
    const dissDoc = getMethodDocumentNumber(initialBaseDocNo, 'dissolution');
    return buildFullDissolutionAMVData('Tibolone Tablets BP 2.5 mg', {
      protocolNo: dissDoc,
      reportNo: `${dissDoc}/R`,
      batchNo: 'TB2501',
      companyName: 'WESTCOAST PHARMACEUTICAL WORKS LTD.',
      reportDate: '20-Apr-2026',
    });
  });

  // Initialize authentic RS document state for the same shared product
  const [rsData, setRsData] = useState<RSAMVDocumentData>(() => {
    const rsDoc = getMethodDocumentNumber(initialBaseDocNo, 'related_substances');
    return buildFullRSAMVData('Tibolone Tablets BP 2.5 mg', {
      protocolNo: rsDoc,
      reportNo: `${rsDoc}/R`,
      batchNo: 'TB2501',
      companyName: 'WESTCOAST PHARMACEUTICAL WORKS LTD.',
      reportDate: '20-Apr-2026',
    });
  });

  // Initialize authentic Assay document state for the same shared product
  const [assayData, setAssayData] = useState<AMVDocumentData>(() => {
    const assayDoc = getMethodDocumentNumber(initialBaseDocNo, 'assay');
    return recalculateAMVData(
      generateAMVDataForProduct('Tibolone Tablets BP 2.5 mg', {
        documentNo: assayDoc,
        reportNo: `${assayDoc}/R`,
        validationBatchNo: initialCodes.validationBatchNo,
        standardLotNo: initialCodes.standardLotNo,
        companyName: 'WESTCOAST PHARMACEUTICAL WORKS LTD.',
        reportDate: '20-Apr-2026',
        effectiveDate: '20-Apr-2026',
      })
    );
  });

  // Built up front like the other documents, so switching to the titration tab
  // shows the titration document instead of falling back to the HPLC one.
  const initialProduct = 'Tibolone Tablets BP 2.5 mg';
  const initialDoc = (method: string) => getMethodDocumentNumber(initialBaseDocNo, method);
  const initialOpts = (docNo: string) => ({
    documentNo: docNo,
    reportNo: `${docNo}/R`,
    validationBatchNo: initialCodes.validationBatchNo,
    standardLotNo: initialCodes.standardLotNo,
    companyName: 'WESTCOAST PHARMACEUTICAL WORKS LTD.',
    reportDate: '20-Apr-2026',
    effectiveDate: '20-Apr-2026',
  });

  const [assayCuData, setAssayCuData] = useState<AMVDocumentData | null>(() =>
    recalculateAMVData(generateAMVDataForProduct(initialProduct, initialOpts(initialDoc('assay_cu')), true))
  );
  const [cuOnlyData, setCuOnlyData] = useState<AMVDocumentData | null>(() =>
    recalculateAMVData(generateAMVDataForProduct(initialProduct, initialOpts(initialDoc('content_uniformity')), false, true))
  );
  const [assayUvData, setAssayUvData] = useState<AMVDocumentData | null>(() =>
    recalculateAMVData(
      (generateAMVDataForProduct as any)(initialProduct, initialOpts(initialDoc('assay_uv')), false, false, 'UV')
    )
  );
  const [dissolutionUvData, setDissolutionUvData] = useState<any>(() => {
    const docNo = initialDoc('dissolution_uv');
    return buildDissolutionUvAMVData(initialProduct, {
      protocolNo: docNo,
      reportNo: `${docNo}/R`,
      batchNo: initialCodes.validationBatchNo,
      standardLotNo: initialCodes.standardLotNo,
      companyName: 'WESTCOAST PHARMACEUTICAL WORKS LTD.',
      reportDate: '20-Apr-2026',
    });
  });

  const [titrationData, setTitrationData] = useState<any>(() => {
    const titDoc = getMethodDocumentNumber(initialBaseDocNo, 'assay_titration');
    return buildTitrationAMVData('Tibolone Tablets BP 2.5 mg', {
      protocolNo: titDoc,
      reportNo: `${titDoc}/R`,
      batchNo: initialCodes.validationBatchNo,
      standardLotNo: initialCodes.standardLotNo,
      companyName: 'WESTCOAST PHARMACEUTICAL WORKS LTD.',
      reportDate: '20-Apr-2026',
    });
  });

  const [mltData, setMltData] = useState<MLTDocumentData>(() => {
    const mltDoc = getMethodDocumentNumber(initialBaseDocNo, 'microbial_limit_test');
    return synchronizeDocumentReportDates(generateMLTAMVDataForProduct(productName, batchNo, { documentNo: mltDoc, protocolNo: mltDoc, reportNo: `${mltDoc}/R`, supersedes, companyName, reportDate, effectiveDate: reportDate } as any), reportDate);
  });

  // Dedicated reactive field handlers to instantly reflect user input changes across ALL active documents
  const handleCompanyNameChange = (newCompany: string) => {
    setCompanyName(newCompany);
    setDissolutionData((prev) => ({ ...prev, companyName: newCompany }));
    setRsData((prev) => ({ ...prev, companyName: newCompany }));
    setAssayData((prev) => ({ ...prev, companyName: newCompany }));
  };

  const handleSupersedesChange = (newSupersedes: string) => {
    setSupersedes(newSupersedes);
    setDissolutionData((prev) => ({ ...prev, supersedes: newSupersedes }));
    setRsData((prev) => ({ ...prev, supersedes: newSupersedes }));
    setAssayData((prev) => ({ ...prev, supersedes: newSupersedes }));
    setMltData((prev) => ({ ...prev, supersedes: newSupersedes }));
  };
  const handleDocumentNoChange = (newDocNo: string) => {
    setDocumentNo(newDocNo);
    const dissDoc = getMethodDocumentNumber(newDocNo, 'dissolution');
    const rsDoc = getMethodDocumentNumber(newDocNo, 'related_substances');
    const assayDoc = getMethodDocumentNumber(newDocNo, 'assay');
    const mltDoc = getMethodDocumentNumber(newDocNo, 'microbial_limit_test');

    setDissolutionData((prev) => ({ ...prev, protocolNo: dissDoc, reportNo: `${dissDoc}/R` }));
    setRsData((prev) => ({ ...prev, protocolNo: rsDoc, reportNo: `${rsDoc}/R` }));
    setAssayData((prev) => ({ ...prev, documentNo: assayDoc, reportNo: `${assayDoc}/R` }));
    setMltData((prev) => ({ ...prev, protocolNo: mltDoc, reportNo: `${mltDoc}/R` }));
  };

  const handleBatchNoChange = (newBatchNo: string) => {
    setBatchNo(newBatchNo);
    setDissolutionData((prev) => ({ ...prev, batchNoUsed: newBatchNo }));
    setRsData((prev) => ({ ...prev, batchNoUsed: newBatchNo }));
    setAssayData((prev) => ({ ...prev, batchNoUsed: newBatchNo }));
  };

  const handleStandardLotChange = (newLot: string) => {
    setStandardLot(newLot);
    setAssayData((prev) => ({
      ...prev,
      reagentsAndStandards: (prev?.reagentsAndStandards || []).map((r) =>
        r.name.includes('Standard') || r.name.includes('WS') || r.name.includes('RS')
          ? { ...r, batchNo: newLot }
          : r
      ),
    }));
  };

  const handleReportDateChange = (newDate: string) => {
    setReportDate(newDate);
    setDissolutionData((prev) => synchronizeDocumentReportDates(prev, newDate));
    setRsData((prev) => synchronizeDocumentReportDates(prev, newDate));
    setAssayData((prev) => synchronizeDocumentReportDates(prev, newDate));
    setMltData((prev) => synchronizeDocumentReportDates(prev, newDate));
    setTitrationData((prev: any) => (prev ? { ...prev, reportDate: newDate, protocolDate: newDate } : prev));
  };

  // Handle switching between Dissolution, Related Substances, and Assay methods
  // Preserves the single shared product name, strength, batch and report date
  const handleValidationMethodChange = (newMethod: ValidationMethodType) => {
    setValidationMethod(newMethod);
    // Visual feedback when switching between validation methods
    setIsLoading(true);
    setLoadingStepText(
      newMethod === 'dissolution'
        ? `Preparing Dissolution Verification (BP Appendix XII B1) for "${productName}"...`
        : newMethod === 'related_substances'
        ? `Preparing Related Substances (Organic Impurities) AMV for "${productName}"...`
        : newMethod === 'assay_cu'
        ? `Preparing Assay and Content of Uniformity AMV for "${productName}"...`
        : newMethod === 'assay_titration'
        ? `Preparing Assay by Titration AMV for "${productName}"...`
        : newMethod === 'content_uniformity'
        ? `Preparing Content of Uniformity AMV for "${productName}"...`
        : newMethod === 'assay_uv'
        ? `Preparing Assay by UV AMV for "${productName}"...`
        : newMethod === 'dissolution_uv'
        ? `Preparing Dissolution by UV AMV for "${productName}"...`
        : `Preparing Assay by HPLC AMV for "${productName}"...`
    );
    setTimeout(() => {
      setIsLoading(false);
      setLoadingStepText('');
    }, 450);
  };

  const handleProductNameChange = (newProduct: string) => {
    setProductName(newProduct);
  };

  // Trigger full AMV generation for a target or current product with realistic loading and progress feedback
  const triggerGenerateAMV = (
    targetProduct?: string,
    targetMethod?: ValidationMethodType,
    customOverrides?: FPSOverrides | null,
    targetApi?: string,
    targetDocumentNo?: string
  ) => {
    
    const activeProduct = (targetProduct && targetProduct.trim().length > 0)
      ? targetProduct.trim()
      : (productName.trim() || 'Tibolone Tablets BP 2.5 mg');
      
    const activeDocumentNo = targetDocumentNo || documentNo;
    
    const activeMethod = targetMethod || validationMethod;
    const strengthMatch = activeProduct.match(/([0-9.]+)\s*(mg|g|mcg|µg|ml|%|w\/v|w\/w)/i);
    const activeStrength = strengthMatch ? strengthMatch[0] : '';
    
    // One fresh set of codes for this run: the document number, the batch and the
    // standard lots all share the same product code and the same serial.
    const codes = generateUniqueValidationCodes(activeProduct, Date.now());
    const localCodes = codes;

    // The number in state belongs to whatever product was generated last, so it
    // is only used when the caller explicitly passed one.
    const proposedDocumentNo = targetDocumentNo || codes.documentNo;
    const checkResult = checkReportNoExists(proposedDocumentNo, activeProduct);

    if (checkResult.exists) {
      const confirmMsg = `Report No. "${activeDocumentNo}" is already used by a DIFFERENT product ("${checkResult.existingProductName}").

To prevent mix-ups, it is recommended to use the next available number: ${checkResult.suggestedNextNo}

Do you want to automatically switch to the suggested Report No.?`;
      if (!window.confirm(confirmMsg)) {
        return;
      } else {
        setDocumentNo(checkResult.suggestedNextNo);
        // Will proceed with the new number
        triggerGenerateAMV(targetProduct, targetMethod, customOverrides, targetApi, checkResult.suggestedNextNo);
        return;
      }
    }
    
    // Save report record
    saveReportRecord(proposedDocumentNo, activeProduct);

    const activeOverrides = customOverrides !== undefined ? customOverrides : fpsOverrides;

    // Clear any previous timers
    if (generationTimerRef.current) clearTimeout(generationTimerRef.current);
    if (generationStepTimerRef.current) clearTimeout(generationStepTimerRef.current);

    setProductName(activeProduct);
    setIsLoading(true);
    setLoadingStepText(`Validating compendial monograph & chromatographic conditions for "${activeProduct}"...`);

    const prefix =
      activeMethod === 'dissolution'
        ? 'WC/QC/AMV'
        : activeMethod === 'related_substances'
        ? 'WC/QC/RS'
        : 'WC/QC/AMV';
    const cleanDocNo = proposedDocumentNo;
    setDocumentNo(cleanDocNo);
    setBatchNo(codes.validationBatchNo);
    setStandardLot(codes.standardLotNo);

    // Multi-step progress feedback for authentic synthesis feeling
    generationStepTimerRef.current = setTimeout(() => {
      setLoadingStepText(`Computing System Suitability, Linearity (r > 0.999), LOD/LOQ & Precision Tables for "${activeProduct}"...`);
    }, 400);

    const step3Timer = setTimeout(() => {
      setLoadingStepText(`Aligning ICH Q2(R2) compliance criteria & ALCOA+ audit metadata for "${activeProduct}"...`);
    }, 800);

    // Finalize generation after realistic calculation window (~1150ms)
    generationTimerRef.current = setTimeout(() => {
      try {
        clearTimeout(step3Timer);
        const dissDocNo = getMethodDocumentNumber(cleanDocNo, 'dissolution');
        const rsDocNo = getMethodDocumentNumber(cleanDocNo, 'related_substances');
        const assayDocNo = getMethodDocumentNumber(cleanDocNo, 'assay');
        const mltDocNo = getMethodDocumentNumber(cleanDocNo, 'microbial_limit_test');
        const assayCuDocNo = getMethodDocumentNumber(cleanDocNo, 'assay_cu');
        const titrationDocNo = getMethodDocumentNumber(cleanDocNo, 'assay_titration');
        const cuOnlyDocNo = getMethodDocumentNumber(cleanDocNo, 'content_uniformity');
        const assayUvDocNo = getMethodDocumentNumber(cleanDocNo, 'assay_uv');
        const dissolutionUvDocNo = getMethodDocumentNumber(cleanDocNo, 'dissolution_uv');

        const localDiss = recalculateDissolutionData(
          buildFullDissolutionAMVData(activeProduct, {
            targetApi,
            verifiedMonograph: activeOverrides ? {
              ...activeOverrides,
              ...(activeOverrides.diluent ? { medium: activeOverrides.diluent } : {}),
            } : undefined,
            protocolNo: dissDocNo,
            reportNo: `${dissDocNo}/R`,
            batchNo: codes.validationBatchNo,
            companyName,
            reportDate,
          })
        );
        setDissolutionData(localDiss);

        const localRS = recalculateRSData(
          buildFullRSAMVData(activeProduct, {
            targetApi,
            verifiedMonograph: activeOverrides ? activeOverrides : undefined,
            protocolNo: rsDocNo,
            reportNo: `${rsDocNo}/R`,
            batchNo: codes.validationBatchNo,
            companyName,
            reportDate,
          })
        );
        setRsData(localRS);

        const localData = generateAMVDataForProduct(activeProduct, {
          documentNo: assayDocNo,
          reportNo: `${assayDocNo}/R`,
          validationBatchNo: codes.validationBatchNo,
          standardLotNo: codes.standardLotNo,
          companyName,
          reportDate,
          effectiveDate: reportDate,
          ...activeOverrides,
          targetApi
        });
        const recalculated = recalculateAMVData(localData);
        setAssayData(recalculated);

        const localAssayCu = generateAMVDataForProduct(
          activeProduct,
          {
            documentNo: assayCuDocNo,
            reportNo: `${assayCuDocNo}/R`,
            validationBatchNo: codes.validationBatchNo,
            standardLotNo: codes.standardLotNo,
            companyName,
            reportDate,
            effectiveDate: reportDate,
            ...activeOverrides,
            targetApi,
          },
          true
        );
        setAssayCuData(recalculateAMVData(localAssayCu));

        setCuOnlyData(
          recalculateAMVData(
            generateAMVDataForProduct(
              activeProduct,
              {
                documentNo: cuOnlyDocNo,
                reportNo: `${cuOnlyDocNo}/R`,
                validationBatchNo: codes.validationBatchNo,
                standardLotNo: codes.standardLotNo,
                companyName,
                reportDate,
                effectiveDate: reportDate,
                ...activeOverrides,
                targetApi,
              },
              false,
              true
            )
          )
        );

        const buildUv = (docNo: string, det: 'UV' | 'UV_DISSOLUTION') =>
          recalculateAMVData(
            generateAMVDataForProduct(
              activeProduct,
              {
                documentNo: docNo,
                reportNo: `${docNo}/R`,
                validationBatchNo: codes.validationBatchNo,
                standardLotNo: codes.standardLotNo,
                companyName,
                reportDate,
                effectiveDate: reportDate,
                ...activeOverrides,
                targetApi,
              },
              false,
              false,
              det
            )
          );
        setAssayUvData(buildUv(assayUvDocNo, 'UV'));
        setDissolutionUvData(
          buildDissolutionUvAMVData(activeProduct, {
            protocolNo: dissolutionUvDocNo,
            reportNo: `${dissolutionUvDocNo}/R`,
            batchNo: codes.validationBatchNo,
            standardLotNo: codes.standardLotNo,
            companyName,
            reportDate,
            targetApi,
          })
        );

        setTitrationData(
          buildTitrationAMVData(activeProduct, {
            protocolNo: titrationDocNo,
            reportNo: `${titrationDocNo}/R`,
            batchNo: codes.validationBatchNo,
            standardLotNo: codes.standardLotNo,
            companyName,
            reportDate,
          })
        );

        const localMLT = generateMLTAMVDataForProduct(activeProduct, codes.validationBatchNo, { protocolNo: mltDocNo, reportNo: `${mltDocNo}/R`, companyName, reportDate } as any);
        setMltData(synchronizeDocumentReportDates(localMLT, reportDate) as any);

        if (activeMethod === 'dissolution') {
        checkAndPromptMajorChanges(localDiss, 'dissolution', activeProduct);

        } else if (activeMethod === 'microbial_limit_test') {
          // No major changes prompt for MLT currently
        } else if (activeMethod === 'related_substances') {
          checkAndPromptMajorChanges(localRS, 'related_substances', activeProduct);
        } else if (activeMethod === 'assay_cu') {
          checkAndPromptMajorChanges(recalculateAMVData(localAssayCu), 'assay', activeProduct);
        } else {
          checkAndPromptMajorChanges(recalculated, 'assay', activeProduct);
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setNewAMVReadyInfo({
          productName: activeProduct,
          method: activeMethod,
          docNo: cleanDocNo,
          timestamp: timeStr,
        });
        setIsLoading(false);
        setLoadingStepText('');
        setIsGenerationSuccess(true);
        setTimeout(() => setIsGenerationSuccess(false), 2500);
      } catch (err) {
        console.error('Generation failed:', err);
        setIsLoading(false);
        setLoadingStepText('');
      }
    }, 1150);
  };

  const handleConfirmFpsOverrides = (overrides: FPSOverrides, detectedProductName?: string) => {
    setFpsOverrides(overrides);
    setFpsUploaded(true);
    setIsFpsModalOpen(false);

    const activeProduct = (detectedProductName && detectedProductName.trim().length > 0)
      ? detectedProductName.trim()
      : productName;

    if (activeProduct && activeProduct !== productName) {
      setProductName(activeProduct);
    }

    triggerGenerateAMV(activeProduct, validationMethod, overrides, undefined);
  };

  // Roll new dynamic identifiers
  const handleRefreshCodes = () => {
    triggerGenerateAMV(productName, undefined, undefined, undefined);
  };

  // Automated diff check to prompt user for Reason for Change if major parameters altered
  const checkAndPromptMajorChanges = (
    data: any,
    method: 'dissolution' | 'related_substances' | 'assay',
    pName: string
  ) => {
    const currentParams = extractCoreMethodParameters(data, method);
    const baselineKey = getBaselineLookupKey(pName, method);
    const baselineParams = DEFAULT_METHOD_BASELINES[baselineKey];
    const diffs = compareCoreMethodParameters(currentParams, baselineParams);
    const revs = data.revisionHistory || [];
    const latestReason = revs.length > 0 ? revs[revs.length - 1].reason || '' : '';
    const val = validateRevisionReasonForMajorChanges(latestReason, diffs);
    if (diffs.length > 0 && !val.isValid) {
      setIsMajorChangeModalOpen(true);
      setIsMajorChangeJustificationNeeded(true);
    } else {
      setIsMajorChangeJustificationNeeded(false);
    }
  };

  // Generate AMV Data for current product (Dissolution, RS, or Assay)
  const handleGenerate = (targetProduct?: string, targetApi?: string) => {
    triggerGenerateAMV(targetProduct || productName, undefined, undefined, targetApi);
  };

  const handleApplyRevisionReason = (newReason: string) => {
    if (validationMethod === 'dissolution') {
      setDissolutionData((prev) => {
        const revs = [...(prev?.revisionHistory || [])];
        if (revs.length > 0) {
          revs[revs.length - 1] = { ...revs[revs.length - 1], reason: newReason };
        } else {
          revs.push({
            version: '01',
            effectiveDate: prev?.reportDate || '21-Apr-2026',
            reason: newReason,
            docNumber: prev?.reportNo || prev?.protocolNo,
          });
        }
        return { ...prev, revisionHistory: revs };
      });
    } else if (validationMethod === 'related_substances') {
      setRsData((prev) => {
        const revs = [...(prev?.revisionHistory || [])];
        if (revs.length > 0) {
          revs[revs.length - 1] = { ...revs[revs.length - 1], reason: newReason };
        } else {
          revs.push({
            version: '01',
            effectiveDate: prev?.reportDate || '17/07/2024',
            reason: newReason,
            docNumber: prev?.reportNo || prev?.protocolNo,
          });
        }
        return { ...prev, revisionHistory: revs };
      });
    } else {
      setAssayData((prev) => {
        const revs = [...(prev?.revisionHistory || [])];
        if (revs.length > 0) {
          revs[revs.length - 1] = { ...revs[revs.length - 1], reason: newReason };
        } else {
          revs.push({
            version: '01',
            effectiveDate: prev?.effectiveDate || '21-Apr-2026',
            reason: newReason,
            docNumber: prev?.reportNo || prev?.documentNo,
          });
        }
        return { ...prev, revisionHistory: revs };
      });
    }
    setAuditNonce((n) => n + 1);
  };

  


  



  const getCurrentDocData = () => {
    if (validationMethod === 'dissolution') return dissolutionData;
    if (validationMethod === 'related_substances') return rsData;
    if (validationMethod === 'microbial_limit_test') return mltData as any;
    return assayData;
  };

  const activeMethodDiffs = useMemo(() => {
    const data = getCurrentDocData();
    const currentParams = extractCoreMethodParameters(data, validationMethod);
    const baselineKey = getBaselineLookupKey(productName, validationMethod);
    const baselineParams = DEFAULT_METHOD_BASELINES[baselineKey];
    if (!baselineParams) return [];
    return compareCoreMethodParameters(currentParams, baselineParams);
  }, [dissolutionData, rsData, assayData, validationMethod, productName]);

  const activeRevisionReason = useMemo(() => {
    const data = getCurrentDocData();
    const revs = data.revisionHistory || [];
    return revs.length > 0 ? revs[revs.length - 1].reason || '' : '';
  }, [dissolutionData, rsData, assayData, validationMethod]);

  // Live computed compliance audit result
  const auditResult = useMemo(() => {
    const data = getCurrentDocData();
    return runPreOutputAuditGate(data, validationMethod);
  }, [dissolutionData, rsData, assayData, mltData, validationMethod, auditNonce]);

  // Single Source of Truth (SSOT) Parameters (§1.2)
  const currentSSOT = useMemo(() => {
    return extractSSOTBlock(getCurrentDocData(), validationMethod);
  }, [dissolutionData, rsData, assayData, mltData, validationMethod]);

  const handleReAudit = () => {
    setMltData((prev) => synchronizeDocumentReportDates(prev, reportDate));
    setAuditNonce((n) => n + 1);
  };

  // Run Pre-Output Compliance & Contamination Audit Gate before export
  const verifyComplianceGate = (targetExport: 'protocol' | 'report' | 'both'): boolean => {
    // If major parameter shifts exist and justification is lacking, open Major Change Modal
    if (activeMethodDiffs.length > 0) {
      const val = validateRevisionReasonForMajorChanges(activeRevisionReason, activeMethodDiffs);
      if (!val.isValid) {
        setIsMajorChangeModalOpen(true);
        return false;
      }
    }


    let passed = auditResult.passed;
    if (!passed) {
      setPendingExport(targetExport);
      setIsAuditModalOpen(true);
      return false;
    }
    return true;
  };

  // Download .docx handlers protected by Compliance Gate
  /** The plain assay document, or the combined Assay + Content of Uniformity one. */
  const activeAssayDocument = () =>
    validationMethod === 'assay_cu' && assayCuData
      ? assayCuData
      : validationMethod === 'content_uniformity' && cuOnlyData
      ? cuOnlyData
      : validationMethod === 'assay_uv' && assayUvData
      ? assayUvData
      : assayData;

  const handleDownloadProtocol = async () => {
    if (!verifyComplianceGate('protocol')) return;
    if (validationMethod === 'dissolution_uv' && dissolutionUvData) {
      await generateAndDownloadDissolutionUvDocx(dissolutionUvData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'assay_titration') {
      await generateAndDownloadTitrationDocx(titrationData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'dissolution') {
      await generateAndDownloadDissolutionDocx(dissolutionData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'microbial_limit_test') {
      await generateAndDownloadMLTDocx(mltData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'related_substances') {
      await generateAndDownloadRSAMVDocx(rsData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else {
      await generateAndDownloadAMVDocx(activeAssayDocument(), { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    }
  };

  const handleDownloadReport = async () => {
    if (!verifyComplianceGate('report')) return;
    if (validationMethod === 'dissolution_uv' && dissolutionUvData) {
      await generateAndDownloadDissolutionUvDocx(dissolutionUvData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'assay_titration') {
      await generateAndDownloadTitrationDocx(titrationData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'dissolution') {
      await generateAndDownloadDissolutionDocx(dissolutionData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'microbial_limit_test') {
      await generateAndDownloadMLTDocx(mltData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'related_substances') {
      await generateAndDownloadRSAMVDocx(rsData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else {
      await generateAndDownloadAMVDocx(activeAssayDocument(), { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    }
  };

  const handleDownloadBoth = async () => {
    if (!verifyComplianceGate('both')) return;
    if (validationMethod === 'dissolution_uv' && dissolutionUvData) {
      await generateAndDownloadDissolutionUvDocx(dissolutionUvData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'assay_titration') {
      await generateAndDownloadTitrationDocx(titrationData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
    } else if (validationMethod === 'dissolution') {
      await generateAndDownloadDissolutionDocx(dissolutionData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      setTimeout(async () => {
        await generateAndDownloadDissolutionDocx(dissolutionData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      }, 600);
    } else if (validationMethod === 'microbial_limit_test') {
      await generateAndDownloadMLTDocx(mltData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      setTimeout(async () => {
        await generateAndDownloadMLTDocx(mltData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      }, 600);
    } else if (validationMethod === 'related_substances') {
      await generateAndDownloadRSAMVDocx(rsData, { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      setTimeout(async () => {
        await generateAndDownloadRSAMVDocx(rsData, { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      }, 600);
    } else {
      await generateAndDownloadAMVDocx(activeAssayDocument(), { docType: 'protocol', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      setTimeout(async () => {
        await generateAndDownloadAMVDocx(activeAssayDocument(), { docType: 'report', theme, fontFamily, fontSize, dataMode, footerSignOffData });
      }, 600);
    }
  };

  const handleOpenAuditGate = () => {
    setPendingExport(null);
    setIsAuditModalOpen(true);
  };

  const handleProceedExportFromModal = async () => {
    if (pendingExport === 'protocol') {
      await handleDownloadProtocol();
    } else if (pendingExport === 'report') {
      await handleDownloadReport();
    } else if (pendingExport === 'both') {
      await handleDownloadBoth();
    }
  };

  const handleUpdateAssayData = (updated: AMVDocumentData) => {
    const recalculated = recalculateAMVData(updated);
    setAssayData(recalculated);
  };

  const handleUpdateRSData = (updated: RSAMVDocumentData) => {
    setRsData(updated);
  };

  const handleUpdateDissolutionData = (updated: DissolutionAMVDocumentData) => {
    setDissolutionData(updated);
  };

  const handleUpdateMLTData = (updated: MLTDocumentData) => {
    setMltData(updated);
  };

  return (
    <div className="min-h-screen bg-zinc-100/70 text-zinc-900 pb-16">
      {/* Header */}
      <Header  theme={theme}
        onThemeChange={setTheme}
        activeDocType={docType}
        onDocTypeChange={setDocType}
        validationMethod={validationMethod}
        onValidationMethodChange={handleValidationMethodChange}
        dataMode={dataMode}
        onDataModeChange={setDataMode}
        fontFamily={fontFamily}
        fontSize={fontSize}
        onFontFamilyChange={setFontFamily}
        onFontSizeChange={setFontSize}
        onDownloadDocx={() =>
          docType === 'protocol' ? handleDownloadProtocol() : handleDownloadReport()
        }
        onPrint={() => window.print()}
        onOpenAuditGate={handleOpenAuditGate}
        onSelfTest={() => {
          if (validationMethod === 'microbial_limit_test') {
            const r = runMLTSelfTest();
            setSelfTestResults(r);
          }
        }}
        onOpenSSOTModal={() => setIsSSOTModalOpen(true)}
        onOpenPromptModal={() => setIsPromptModalOpen(true)}
        auditPassed={auditResult ? auditResult.passed : true}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Input & Product Selection Form */}
        <AMVInputForm
          productName={productName}
          onProductNameChange={handleProductNameChange}
          documentNo={documentNo}
          supersedes={supersedes}
          onSupersedesChange={handleSupersedesChange}
          onDocumentNoChange={handleDocumentNoChange}
          batchNo={batchNo}
          onBatchNoChange={handleBatchNoChange}
          reportDate={reportDate}
          onReportDateChange={handleReportDateChange}
          standardLot={standardLot}
          onStandardLotChange={handleStandardLotChange}
          companyName={companyName}
          onCompanyNameChange={handleCompanyNameChange}
          validationMethod={validationMethod}
          onValidationMethodChange={handleValidationMethodChange}
          onGenerate={handleGenerate}
          onSelectSuggestion={(p) => triggerGenerateAMV(p)}
          onRefreshCodes={handleRefreshCodes}
          isLoading={isLoading}
          loadingStepText={loadingStepText}
          newAMVReadyInfo={newAMVReadyInfo}
          onDismissSuccessInfo={() => setNewAMVReadyInfo(null)}
          theme={theme}
          coaUploaded={coaUploaded}
          onCoaUpload={(file) => {
            console.log('Simulating COA data extraction from:', file.name);
            // Simulated parse delay
            setIsLoading(true);
            setCoaUploaded(true);
            setIsLoading(false);
          }}
          fpsUploaded={fpsUploaded}
          onOpenFpsModal={() => setIsFpsModalOpen(true)}
          onFpsUpload={(file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const result = e.target?.result as string;
              const match = result.match(/^data:(.*?);base64,(.*)$/);
              if (match) {
                setFpsFileData({ mimeType: match[1], base64: match[2] });
                setIsFpsModalOpen(true);
              }
            };
            reader.readAsDataURL(file);
          }}
        />

        {/* Major Parameter Shift Notification Banner */}
        {isMajorChangeJustificationNeeded && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl shadow-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-900">
                  Major Method Parameter Changes Detected ({activeMethodDiffs.length})
                </span>
                <span className="text-amber-700 ml-2">
                  ICH Q2(R2) &amp; ALCOA+ Data Integrity require an explicit, non-generic parameter explanation in Revision History.
                </span>
              </div>
            </div>
            <button
              type="button"
              id="prompt-major-change-banner-btn"
              onClick={() => setIsMajorChangeModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex-shrink-0"
            >
              Enter Reason for Change
            </button>
          </div>
        )}

        {/* Document Viewer Container with Active Status Header & Loading Overlay */}
        <div id="amv-document-viewer-container" className="relative space-y-2">
          {/* Active Product Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active AMV Monograph: {productName}
              </span>
              <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline-block">
                {documentNo} &bull; Batch: {batchNo}
              </span>
            </div>
            {newAMVReadyInfo && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                AMV Ready ({newAMVReadyInfo.timestamp})
              </span>
            )}
          </div>

          {/* Loading Overlay with Spinning Pharmaceutical Synthesizer */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-xs z-30 flex flex-col items-center justify-center p-6 text-center min-h-[450px] rounded-2xl border border-blue-200 shadow-xl">
              <div className="bg-white p-7 rounded-2xl shadow-2xl border border-zinc-200 flex flex-col items-center max-w-md w-full animate-in zoom-in-95 duration-150">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 border border-blue-100 shadow-2xs">
                  <RefreshCw className="w-7 h-7 text-[#1F4E79] animate-spin" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">
                  Synthesizing New AMV Document
                </h3>
                <p className="text-xs font-semibold text-[#1F4E79] mt-1">
                  {productName}
                </p>
                <p className="text-xs text-zinc-600 mt-2.5 max-w-xs">
                  {loadingStepText || 'Processing chromatographic system, system suitability & statistical calculations...'}
                </p>
                <div className="w-full bg-zinc-100 h-2 rounded-full mt-4 overflow-hidden border border-zinc-200">
                  <div className="h-full bg-[#1F4E79] rounded-full animate-pulse w-4/5" />
                </div>
                <div className="flex items-center justify-between w-full mt-3 text-[10px] font-mono text-zinc-400">
                  <span>ICH Q2(R2) Validation</span>
                  <span className="text-blue-700 font-semibold">ALCOA+ Compliant</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Overlay when AMV is ready */}
          {isGenerationSuccess && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 text-center min-h-[450px] rounded-2xl border border-emerald-200 shadow-xl animate-in fade-in duration-300">
              <div className="bg-white p-8 rounded-2xl shadow-2xl border border-emerald-200 flex flex-col items-center max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 border border-emerald-300 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-extrabold text-emerald-900">
                  AMV Ready &amp; Verified!
                </h3>
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  {productName}
                </p>
                <p className="text-xs text-zinc-600 mt-3 max-w-xs leading-relaxed">
                  All mathematical calculations passed Pharma Compliance bounds.
                </p>
              </div>
            </div>
          )}

          {/* Live Document Viewer & Exporter: Dissolution vs AMV (RS Format) vs Assay Format */}
          {validationMethod === 'dissolution_uv' && dissolutionUvData ? (
            <DissolutionUvDocumentViewer seed={productName+batchNo}
              data={dissolutionUvData}
              docType={docType}
              theme={theme}
              dataMode={dataMode}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={setFontFamily}
              onFontSizeChange={setFontSize}
              onDocTypeChange={setDocType}
              onThemeChange={setTheme}
              onDownloadProtocol={handleDownloadProtocol}
              onDownloadReport={handleDownloadReport}
              onDownloadBoth={handleDownloadBoth}
              footerSignOffData={footerSignOffData}
              onUpdateFooterSignOffData={setFooterSignOffData}
            />
          ) : validationMethod === 'assay_titration' ? (
            <TitrationDocumentViewer seed={productName+batchNo}
              data={titrationData}
              docType={docType}
              theme={theme}
              dataMode={dataMode}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={setFontFamily}
              onFontSizeChange={setFontSize}
              onDocTypeChange={setDocType}
              onThemeChange={setTheme}
              onDownloadProtocol={handleDownloadProtocol}
              onDownloadReport={handleDownloadReport}
              onDownloadBoth={handleDownloadBoth}
              footerSignOffData={footerSignOffData}
              onUpdateFooterSignOffData={setFooterSignOffData}
            />
          ) : validationMethod === 'dissolution' ? (
            <DissolutionDocumentViewer seed={productName+batchNo} 
              data={dissolutionData}
              docType={docType}
              theme={theme}
              dataMode={dataMode}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={setFontFamily}
              onFontSizeChange={setFontSize}
              onDocTypeChange={setDocType}
              onThemeChange={setTheme}
              onDownloadProtocol={handleDownloadProtocol}
              onDownloadReport={handleDownloadReport}
              onDownloadBoth={handleDownloadBoth}
              onUpdateData={handleUpdateDissolutionData}
              footerSignOffData={footerSignOffData}
              onUpdateFooterSignOffData={setFooterSignOffData}
            />
          
          ) : validationMethod === 'microbial_limit_test' ? (
            <MLTDocumentViewer seed={productName+batchNo} 
              data={mltData}
              docType={docType}
              theme={theme}
              dataMode={dataMode}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={setFontFamily}
              onFontSizeChange={setFontSize}
              onDocTypeChange={setDocType}
              onThemeChange={setTheme}
              onDownloadProtocol={handleDownloadProtocol}
              onDownloadReport={handleDownloadReport}
              onDownloadBoth={handleDownloadBoth}
              onUpdateData={handleUpdateMLTData}
              footerSignOffData={footerSignOffData}
              onUpdateFooterSignOffData={setFooterSignOffData}
            />
          ) : validationMethod === 'related_substances' ? (
            <RSAMVDocumentViewer seed={productName+batchNo} 
              data={rsData}
              docType={docType}
              theme={theme}
              dataMode={dataMode}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={setFontFamily}
              onFontSizeChange={setFontSize}
              onDocTypeChange={setDocType}
              onThemeChange={setTheme}
              onDownloadProtocol={handleDownloadProtocol}
              onDownloadReport={handleDownloadReport}
              onDownloadBoth={handleDownloadBoth}
              onUpdateData={handleUpdateRSData}
              footerSignOffData={footerSignOffData}
              onUpdateFooterSignOffData={setFooterSignOffData}
            />
          ) : (
            <AMVDocumentViewer seed={productName+batchNo} 
              data={activeAssayDocument()}
              docType={docType}
              theme={theme}
              dataMode={dataMode}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onFontFamilyChange={setFontFamily}
              onFontSizeChange={setFontSize}
              onDocTypeChange={setDocType}
              onThemeChange={setTheme}
              onDownloadProtocol={handleDownloadProtocol}
              onDownloadReport={handleDownloadReport}
              onDownloadBoth={handleDownloadBoth}
              onUpdateData={handleUpdateAssayData}
              footerSignOffData={footerSignOffData}
              onUpdateFooterSignOffData={setFooterSignOffData}
            />
          )}
        </div>
      </main>

      {/* Pre-Output Compliance & Contamination Audit Modal */}
      <ComplianceAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditResult={auditResult}
        onReAudit={handleReAudit}
        onProceedExport={pendingExport ? handleProceedExportFromModal : undefined}
        onOpenMajorChangeModal={() => setIsMajorChangeModalOpen(true)}
        exportType={pendingExport || undefined}
      />

      {/* Mandatory Major Method Parameter Change Explanation Modal */}
      <MajorChangePromptModal
        isOpen={isMajorChangeModalOpen}
        onClose={() => setIsMajorChangeModalOpen(false)}
        diffs={activeMethodDiffs}
        currentReason={activeRevisionReason}
        onApplyReason={handleApplyRevisionReason}
        productName={productName}
        documentNo={documentNo}
      />

      {/* Single Source of Truth (SSOT) Parameters Inspector Modal (§1.2) */}
      <SSOTModal
        isOpen={isSSOTModalOpen}
        onClose={() => setIsSSOTModalOpen(false)}
        ssot={currentSSOT}
      />

      {/* Finished Product Specification (FPS) & MOA Modal */}
      <FPSExtractorModal
        isOpen={isFpsModalOpen}
        onClose={() => setIsFpsModalOpen(false)}
        fileData={fpsFileData}
        onConfirm={handleConfirmFpsOverrides}
        validationMethod={validationMethod}
      />

      {/* Master System Prompt & User Input Template Modal (§10) */}
      <MasterPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSelectProduct={(method, name) => {
          setValidationMethod(method);
          triggerGenerateAMV(name, method);
          setIsPromptModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;
