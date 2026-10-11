// Generated from https://nfsa.gov.in/portal/Ration_Card_State_Portals_AA on 2026-10-11.
// That official page lists where each state/UT publishes ration card details. `httpStatus` is what
// this link returned when requested from the build machine (0 = no connection: many Indian government
// sites block overseas or unusual networks, so 0 is NOT proof the link is dead).
export const NFSA_STATE_PORTALS_SOURCE = {
  url: 'https://nfsa.gov.in/portal/Ration_Card_State_Portals_AA',
  checkedOn: '2026-10-11',
} as const;

export interface StatePortalSeed {
  id: string;
  stateCode: string;
  name: string;
  url: string;
  httpStatus: number;
}

export const STATE_CARD_PORTALS: StatePortalSeed[] = [
  { id: 'card-portal-andhra-pradesh', stateCode: 'AP', name: "Andhra Pradesh", url: "https://epds1.ap.gov.in/epdsAP_NfsaDashBoard/epds", httpStatus: 0 },
  { id: 'card-portal-a-n-islands', stateCode: 'AN', name: "Andaman & Nicobar Islands", url: "http://dcsca.andaman.gov.in/Report/DistrictwiseRCUnitCountNFSA", httpStatus: 0 },
  { id: 'card-portal-arunachal-pradesh', stateCode: 'AR', name: "Arunachal Pradesh", url: "http://arunfcsgov.in/trans_overallReportByDistrict", httpStatus: 0 },
  { id: 'card-portal-assam', stateCode: 'AS', name: "Assam", url: "https://rcms.assam.gov.in/Show_Reports.aspx?RID=86", httpStatus: 0 },
  { id: 'card-portal-bihar', stateCode: 'BR', name: "Bihar", url: "http://epds.bihar.gov.in/DistrictWiseRationCardDetailsBH.aspx", httpStatus: 404 },
  { id: 'card-portal-chandigarh', stateCode: 'CH', name: "Chandigarh", url: "http://epds.nic.in/CHDRPT/epds", httpStatus: 404 },
  { id: 'card-portal-chhattisgarh', stateCode: 'CG', name: "Chhattisgarh", url: "https://khadya.cg.nic.in/rationcards/rcmodule/Reports/RptRationcardDetails.aspx", httpStatus: 503 },
  { id: 'card-portal-dadra-nagar-haveli', stateCode: 'DH', name: "Dadra & Nagar Haveli", url: "http://epds.nic.in/DN/epds?publicreport=REPORTS", httpStatus: 404 },
  { id: 'card-portal-daman-diu', stateCode: 'DH', name: "Daman & Diu", url: "http://epds.nic.in/DDIU/epds?publicreport=REPORTS", httpStatus: 404 },
  { id: 'card-portal-delhi', stateCode: 'DL', name: "Delhi", url: "https://nfs.delhi.gov.in/Citizen/FpsWiseCardDetails.aspx?type=MA==", httpStatus: 0 },
  { id: 'card-portal-goa', stateCode: 'GA', name: "Goa", url: "https://nfsa.gov.in/reports/frmPublicReportPage.aspx?rid=00324", httpStatus: 200 },
  { id: 'card-portal-gujarat', stateCode: 'GJ', name: "Gujarat", url: "http://ipds.gujarat.gov.in/Register/frm_RationCardAbstract.aspx", httpStatus: 404 },
  { id: 'card-portal-haryana', stateCode: 'HR', name: "Haryana", url: "https://hr.epds.nic.in/HRY/epds?publicreport=REPORTS", httpStatus: 0 },
  { id: 'card-portal-himachal-pradesh', stateCode: 'HP', name: "Himachal Pradesh", url: "https://epds.co.in/FPSwiseData_mysql.aspx", httpStatus: 0 },
  { id: 'card-portal-jammu-kashmir', stateCode: 'JK', name: "Jammu & Kashmir", url: "http://jk.epds.nic.in/JK/epds?publicreport=REPORTS", httpStatus: 0 },
  { id: 'card-portal-jharkhand', stateCode: 'JH', name: "Jharkhand", url: "https://aahar.jharkhand.gov.in/secc-districts/districts", httpStatus: 200 },
  { id: 'card-portal-karnataka', stateCode: 'KA', name: "Karnataka", url: "https://ahara.kar.nic.in/fcsstat/karBeneficiaryRegister.aspx", httpStatus: 0 },
  { id: 'card-portal-kerala', stateCode: 'KL', name: "Kerala", url: "https://civilsupplieskerala.gov.in/index.php/cards", httpStatus: 200 },
  { id: 'card-portal-madhya-pradesh', stateCode: 'MP', name: "Madhya Pradesh", url: "https://rationmitra.nic.in/EBS/Public/DistrictWiseRCSummary.aspx", httpStatus: 0 },
  { id: 'card-portal-maharashtra', stateCode: 'MH', name: "Maharashtra", url: "https://rcms.mahafood.gov.in/Show_Reports.aspx?RID=98", httpStatus: 200 },
  { id: 'card-portal-manipur', stateCode: 'MN', name: "Manipur", url: "http://rcmsmanipur.nic.in/Show_Reports.aspx?RID=105", httpStatus: 0 },
  { id: 'card-portal-meghalaya', stateCode: 'ML', name: "Meghalaya", url: "http://164.100.128.97/MEGHALAYA_PDS/", httpStatus: 0 },
  { id: 'card-portal-mizoram', stateCode: 'MZ', name: "Mizoram", url: "http://164.100.128.97/MIZORAM_PDS/", httpStatus: 0 },
  { id: 'card-portal-nagaland', stateCode: 'NL', name: "Nagaland", url: "https://164.100.129.176/rcmsnl/Show_Reports.aspx?RID=104", httpStatus: 0 },
  { id: 'card-portal-odisha', stateCode: 'OD', name: "Odisha", url: "http://pdsodisha.gov.in/TPDS/Reports/RationCardListReport.aspx", httpStatus: 200 },
  { id: 'card-portal-puducherry', stateCode: 'PY', name: "Puducherry", url: "https://pdsswo.py.gov.in/civilmis/", httpStatus: 200 },
  { id: 'card-portal-punjab', stateCode: 'PB', name: "Punjab", url: "http://ercms.punjab.gov.in/Show_Reports.aspx?RID=210", httpStatus: 200 },
  { id: 'card-portal-rajasthan', stateCode: 'RJ', name: "Rajasthan", url: "http://food.raj.nic.in/pmo_District.aspx", httpStatus: 0 },
  { id: 'card-portal-sikkim', stateCode: 'SK', name: "Sikkim", url: "http://epds.nic.in/SIKKIM/epds?publicreport=REPORTS", httpStatus: 404 },
  { id: 'card-portal-tamil-nadu', stateCode: 'TN', name: "Tamil Nadu", url: "https://tnpds.gov.in/pages/reports/pds-nfsa-report-state.xhtml", httpStatus: 404 },
  { id: 'card-portal-telanagana', stateCode: 'TG', name: "Telangana", url: "https://epds.telangana.gov.in/FoodSecurityAct/reports/", httpStatus: 200 },
  { id: 'card-portal-tripura', stateCode: 'TR', name: "Tripura", url: "http://epdstr.gov.in/TR/epds?publicreport=REPORTS", httpStatus: 0 },
  { id: 'card-portal-uttar-pradesh', stateCode: 'UP', name: "Uttar Pradesh", url: "https://nfsa.up.gov.in/Food/citizen/Default.aspx", httpStatus: 200 },
  { id: 'card-portal-uttarakhand', stateCode: 'UK', name: "Uttarakhand", url: "https://rcmspds.uk.gov.in/Show_Reports.aspx?RID=105", httpStatus: 503 },
  { id: 'card-portal-west-bengal', stateCode: 'WB', name: "West Bengal", url: "https://202.61.117.98/RCCount_District.aspx", httpStatus: 0 },
];
