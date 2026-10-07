// SalesRequisitionReport.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  PDFViewer,
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from '@react-pdf/renderer';
import { variables } from '@/Variables';
import useNumberFormatter from '@/hooks/useNumberFormatter';
import useFormatDate from '@/hooks/useFormatDate';

// --- DTO interfaces ---
interface SalesRequisitionItemDto {
  itemID: number;
  brandName: string;
  itemName: string;
  packingPCSperCTN: number;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
}

interface SalesRequisitionDto {
  salesRequisitionID: number;
  refNo: string;
  date: string;
  customerName: string;
  address: string;
  sellerName: string;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  items: SalesRequisitionItemDto[];
}

// --- Styles ---
const styles = StyleSheet.create({
  viewer: { width: '100%', height: '100vh' },
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  companyInfo: {},
  table: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderStyle: 'solid',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#bfbfbf',
    borderBottomWidth: 1,
  },
  tableRowEven: {
    backgroundColor: '#ffffff',
  },
  tableRowOdd: {
    backgroundColor: '#f9f9f9',
  },
  headerCell: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: 'bold',
    padding: 2,
    backgroundColor: '#eeeeee',
  },
  tableCol: {
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    padding: 4,
  },
  colSerial:   { width: '7%',  textAlign: 'center' },
  colBrand:    { width: '15%' },
  colItem:     { width: '30%' },
  colPack:     { width: '10%', textAlign: 'center' },
  colQty:      { width: '12%', textAlign: 'center' },
  colQtyPcs:   { width: '12%', textAlign: 'center' },
  colTotalQty: { width: '14%', textAlign: 'center', borderRightWidth: 0 },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  comments: {
    flex: 1,
    marginRight: 16,
    fontSize: 9,
  },
  commentsHeading: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalsCard: {
    width: '30%',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalsLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalsValue: {
    fontSize: 9,
  },
  thankYou: {
    marginTop: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

const SalesRequisitionReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [req, setReq] = useState<SalesRequisitionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const formatNumber = useNumberFormatter();
  const formatDate = useFormatDate();

  useEffect(() => {
    async function fetchReq() {
      try {
        const res = await fetch(
          `${variables.API_URL}SalesRequisition/GetSalesRequisitionReportSP/${id}`
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: SalesRequisitionDto = await res.json();
        setReq(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchReq();
  }, [id]);

  // break long words in address
  function breakLongWords(str: string, max = 25) {
    return str.replace(new RegExp(`([^\\s]{${max}})`, 'g'), '$1\u200B');
  }

  if (loading) return <div>Loading...</div>;
  if (error)   return <div>Error: {error}</div>;
  if (!req)    return <div>No requisition found.</div>;

  // compute totals
  const totalCTN       = req.items.reduce((s, i) => s + i.quantityCTN, 0);
  const totalPCS       = req.items.reduce((s, i) => s + i.quantityPCS, 0);
  const totalAllPCS    = req.items.reduce((s, i) => s + i.totalQtyPCS, 0);

  return (
    <PDFViewer style={styles.viewer}>
      <Document>
        <Page size="A4" style={styles.page}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>SALES REQUISITION</Text>
            <View style={styles.invoiceInfo}>
              <Text>Ref No: {req.refNo}</Text>
              <Text>Date:   {req.date ? formatDate(req.date) : '—'}</Text>
            </View>
          </View>

          {/* Seller & Buyer */}
          <View style={styles.section}>
            <View style={styles.companyInfo}>
              <Text style={styles.headerCell}>SELLER:</Text>
              <Text>{req.sellerName}</Text>
              <Text> {'\n'}</Text>
              <Text style={styles.headerCell}>BUYER:</Text>
              <Text>{req.customerName}</Text>
              <Text>{breakLongWords(req.address)}</Text>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            {/* Column Headers */}
            <View style={styles.tableRow}>
              {[
                ['S No.', 'colSerial'],
                ['BRAND', 'colBrand'],
                ['DESCRIPTION', 'colItem'],
                ['PACKING\n(PCS/CTN)', 'colPack'],
                ['QUANTITY\n(CTN)', 'colQty'],
                ['QUANTITY\n(PCS)', 'colQtyPcs'],
                ['TOTAL QUANTITY\n(PCS)', 'colTotalQty'],
              ].map(([label, col]) => (
                <Text
                  key={label}
                  style={[
                    styles.tableCol,
                    styles[col as keyof typeof styles],
                    styles.headerCell
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>

            {/* Data Rows */}
            {req.items.map((it, idx) => {
              const stripe = idx % 2 === 0
                ? styles.tableRowEven
                : styles.tableRowOdd;
              return (
                <View style={[styles.tableRow, stripe]} key={it.itemID}>
                  <Text style={[styles.tableCol, styles.colSerial]}>{idx + 1}</Text>
                  <Text style={[styles.tableCol, styles.colBrand]}>{it.brandName}</Text>
                  <Text style={[styles.tableCol, styles.colItem]}>{it.itemName}</Text>
                  <Text style={[styles.tableCol, styles.colPack]}>{it.packingPCSperCTN}</Text>
                  <Text style={[styles.tableCol, styles.colQty]}>{formatNumber(it.quantityCTN)}</Text>
                  <Text style={[styles.tableCol, styles.colQtyPcs]}>{formatNumber(it.quantityPCS)}</Text>
                  <Text style={[styles.tableCol, styles.colTotalQty]}>{formatNumber(it.totalQtyPCS)}</Text>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.colSerial]}></Text>
              <Text style={[styles.tableCol, styles.colBrand]}></Text>
              <Text style={[styles.tableCol, styles.colItem]}></Text>
              <Text style={[styles.tableCol, styles.colPack]}></Text>
              <Text style={[styles.tableCol, styles.colQty]}>{totalCTN.toFixed(2)}</Text>
              <Text style={[styles.tableCol, styles.colQtyPcs]}>{totalPCS.toFixed(2)}</Text>
              <Text style={[styles.tableCol, styles.colTotalQty]}>{totalAllPCS.toFixed(2)}</Text>
            </View>
          </View>

          {/* Comments + Totals Card */}
          <View style={styles.footerContainer}>
            <View style={styles.comments}>
              <Text style={styles.commentsHeading}>Additional Notes:</Text>
              <Text>– Payment due: 30 days from invoice date</Text>
                            <Text>– Sales Tax calculated at 18% of invoice value</Text>
            </View>

            <View style={styles.totalsCard}>
              {/* <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total CTN:</Text>
                <Text style={styles.totalsValue}>{totalCTN.toFixed(2)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total PCS:</Text>
                <Text style={styles.totalsValue}>{totalPCS.toFixed(2)}</Text>
              </View> */}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total Quantity (PCS):</Text>
                <Text style={styles.totalsValue}>{totalAllPCS.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.thankYou}>Thank You For Your Business!</Text>
        </Page>
      </Document>
    </PDFViewer>
  );
};

export default SalesRequisitionReport;
