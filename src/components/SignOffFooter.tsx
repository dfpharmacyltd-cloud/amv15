import React from 'react';
import { FooterSignOffData, DataMode } from '../types';

export const DEFAULT_FOOTER_SIGN_OFF: FooterSignOffData = {
  preparedBy: { title: 'Prepared By', name: 'Prepared By', designation: 'QC. Chemist', date: '24/01/2024' },
  checkedBy: { title: 'Checked By', name: 'Checked By', designation: 'QC. In-charge', date: '24/01/2024' },
  qaInCharge: { title: 'QA In-charge', name: 'QA In-charge', designation: 'QA In-charge', date: '24/01/2024' },
  plantHead: { title: 'Plant Head', name: 'Plant Head', designation: 'Plant Head', date: '24/01/2024' },
  formatNo: 'WC/QC/01/0F01',
};

interface SignOffFooterProps {
  pageNum: number;
  totalPages: number;
  dataMode?: DataMode;
  footerData?: FooterSignOffData;
  onUpdateFooterData?: (d: FooterSignOffData) => void;
  isReport?: boolean;
}

export const SignOffFooter: React.FC<SignOffFooterProps> = ({
  pageNum,
  totalPages,
  dataMode = 'template'
}) => {
  return (
    <div className="mt-8 pt-4 flex flex-col items-center justify-center text-[13px] font-serif text-black w-full">
      {dataMode === 'demo' && (
        <div className="font-bold text-[#b58900] mb-2 tracking-wide uppercase">
          DEMO / FORMAT-DEMONSTRATION ONLY — NOT FOR GMP USE
        </div>
      )}
      <div>Page {pageNum} of {totalPages}</div>
    </div>
  );
};
