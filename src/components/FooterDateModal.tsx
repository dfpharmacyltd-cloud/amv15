import React, { useState, useRef } from 'react';
import { FooterSignOffData } from '../types';
import { Calendar, Check, X, Shield, FileText, Award, Upload, RotateCcw } from 'lucide-react';
import { WestCoastStamp } from './WestCoastStamp';
import { setActiveStampImage, getActiveStampImageUrl } from '../utils/stampUtils';

interface FooterDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  footerData: FooterSignOffData;
  onSave: (updated: FooterSignOffData) => void;
}

export const FooterDateModal: React.FC<FooterDateModalProps> = ({
  isOpen,
  onClose,
  footerData,
  onSave,
}) => {
  const [commonDate, setCommonDate] = useState(footerData?.preparedBy?.date || '24/01/2024');
  const [applyToAll, setApplyToAll] = useState(true);

  const [prepDate, setPrepDate] = useState(footerData?.preparedBy?.date || '24/01/2024');
  const [checkDate, setCheckDate] = useState(footerData?.checkedBy?.date || '24/01/2024');
  const [qaDate, setQaDate] = useState(footerData?.qaInCharge?.date || '24/01/2024');
  const [plantDate, setPlantDate] = useState(footerData?.plantHead?.date || '24/01/2024');

  const [prepDesig, setPrepDesig] = useState(footerData?.preparedBy?.designation || 'QC. Chemist');
  const [checkDesig, setCheckDesig] = useState(footerData?.checkedBy?.designation || 'QC. In-charge');
  const [qaDesig, setQaDesig] = useState(footerData?.qaInCharge?.designation || 'QA In-charge');
  const [plantDesig, setPlantDesig] = useState(footerData?.plantHead?.designation || 'Plant Head');

  const [formatNo, setFormatNo] = useState(footerData?.formatNo || 'WC/QC/01/0F01');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stampPreviewKey, setStampPreviewKey] = useState<number>(0);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setActiveStampImage(reader.result);
        setStampPreviewKey((prev) => prev + 1);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetStamp = () => {
    setActiveStampImage(null);
    setStampPreviewKey((prev) => prev + 1);
  };

  const handleCommonDateChange = (val: string) => {
    setCommonDate(val);
    if (applyToAll) {
      setPrepDate(val);
      setCheckDate(val);
      setQaDate(val);
      setPlantDate(val);
    }
  };

  const handleApplyPreset = (preset: string) => {
    setCommonDate(preset);
    setPrepDate(preset);
    setCheckDate(preset);
    setQaDate(preset);
    setPlantDate(preset);
  };

  const handleSave = () => {
    const updated: FooterSignOffData = {
      preparedBy: {
        ... (footerData?.preparedBy || {}),
        date: applyToAll ? commonDate : prepDate,
        designation: prepDesig,
      },
      checkedBy: {
        ... (footerData?.checkedBy || {}),
        date: applyToAll ? commonDate : checkDate,
        designation: checkDesig,
      },
      qaInCharge: {
        ... (footerData?.qaInCharge || {}),
        date: applyToAll ? commonDate : qaDate,
        designation: qaDesig,
      },
      plantHead: {
        ... (footerData?.plantHead || {}),
        date: applyToAll ? commonDate : plantDate,
        designation: plantDesig,
      },
      formatNo: formatNo.trim() || 'WC/QC/01/0F01',
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 max-w-lg w-full overflow-hidden text-zinc-900 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <Calendar className="w-4 h-4 text-blue-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Footer Sign-Off &amp; Date Settings</h3>
              <p className="text-[11px] text-blue-200">Set custom date for all page footers (Same to Same)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Date Control */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                Common Sign-Off Date (All Pages)
              </label>
              <div className="flex items-center gap-1">
                {['24/01/2024', '20-Apr-2026', 'Today'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      if (preset === 'Today') {
                        const now = new Date();
                        const d = String(now.getDate()).padStart(2, '0');
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const y = now.getFullYear();
                        handleApplyPreset(`${d}/${m}/${y}`);
                      } else {
                        handleApplyPreset(preset);
                      }
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={commonDate}
              onChange={(e) => handleCommonDateChange(e.target.value)}
              placeholder="e.g. 24/01/2024"
              className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />

            <label className="flex items-center gap-2 text-xs text-blue-900 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => {
                  setApplyToAll(e.target.checked);
                  if (e.target.checked) {
                    setPrepDate(commonDate);
                    setCheckDate(commonDate);
                    setQaDate(commonDate);
                    setPlantDate(commonDate);
                  }
                }}
                className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">
                Apply this date to all 4 columns (Prepared By, Checked By, QA In-charge, Plant Head)
              </span>
            </label>
          </div>

          {/* Individual Column Dates (If not Apply To All) */}
          {!applyToAll && (
            <div className="space-y-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider block">
                Individual Column Dates:
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-zinc-600 mb-0.5 font-medium">Prepared By Date:</label>
                  <input
                    type="text"
                    value={prepDate}
                    onChange={(e) => setPrepDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-0.5 font-medium">Checked By Date:</label>
                  <input
                    type="text"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-0.5 font-medium">QA In-charge Date:</label>
                  <input
                    type="text"
                    value={qaDate}
                    onChange={(e) => setQaDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 mb-0.5 font-medium">Plant Head Date:</label>
                  <input
                    type="text"
                    value={plantDate}
                    onChange={(e) => setPlantDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Format / Doc No */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5">
            <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-zinc-600" />
              Bottom-Right Format / Doc No.
            </label>
            <input
              type="text"
              value={formatNo}
              onChange={(e) => setFormatNo(e.target.value)}
              placeholder="e.g. WC/QC/01/0F01"
              className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
            />
            <span className="text-[10px] text-zinc-500 block">
              Default reference code printed at the bottom right of each page footer.
            </span>
          </div>

          {/* Designations summary */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-600" />
                Sign-off Designations
              </span>
              <span className="text-[10px] text-zinc-500">(Same as reference image)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-500 block">Prepared By:</span>
                <input
                  type="text"
                  value={prepDesig}
                  onChange={(e) => setPrepDesig(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-zinc-500 block">Checked By:</span>
                <input
                  type="text"
                  value={checkDesig}
                  onChange={(e) => setCheckDesig(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-zinc-500 block">Approved (QA):</span>
                <input
                  type="text"
                  value={qaDesig}
                  onChange={(e) => setQaDesig(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs"
                />
              </div>
              <div>
                <span className="text-red-600 font-bold block">Approved (Plant Head):</span>
                <input
                  type="text"
                  value={plantDesig}
                  onChange={(e) => setPlantDesig(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-red-200 rounded text-xs text-red-600 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Authentic Plant Head Stamp Verification & Upload */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                  <Award className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Authentic Company Stamp (Same to Same)</span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-tight">
                  Official rubber seal: <span className="font-semibold">Picture1_s-removebg-preview.png</span>
                </p>
                <div className="text-[10px] text-indigo-700 font-mono">
                  WEST-COAST PHARMACEUTICAL WORKS LTD. ● AHMEDABAD
                </div>
              </div>
              <div className="shrink-0 p-1 bg-white rounded-lg border border-indigo-200 shadow-2xs">
                <WestCoastStamp key={stampPreviewKey} size={54} rotateDeg={-4.5} withSignature={true} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-indigo-200/60">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
              >
                <Upload className="w-3 h-3 text-indigo-600" />
                Upload / Select Stamp File (PNG)
              </button>
              <button
                type="button"
                onClick={handleResetStamp}
                title="Reset to default Picture1_s-removebg-preview.png"
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-600 hover:text-zinc-900 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-2.8 h-2.8" />
                Reset Default
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            Apply to All Page Footers
          </button>
        </div>
      </div>
    </div>
  );
};
