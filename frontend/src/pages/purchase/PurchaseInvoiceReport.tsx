// PurchaseInvoiceReport.tsx
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
import { useSelector } from 'react-redux';
import { RootState } from '@/Storage/Redux/store';

// --- DTO interfaces ---
interface PurchaseInvoiceItemDto {
  itemID: number;
  brandName: string;
  itemName: string;
  packingPCSperCTN: number;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  gstPercentage: number;
  netPrice: number;
  totalPrice: number;
}

interface PurchaseInvoiceDto {
  purchaseInvoiceID: number;
  refNo: string;
  invoiceDate: string;
  vendorName: string;
  address: string;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  totalPrice: number;
  items: PurchaseInvoiceItemDto[];
}

// --- Styles (tweaked to fit all columns) ---
const styles = StyleSheet.create({
  viewer: { width: '100%', height: '100vh' },
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  invoiceInfo: { textAlign: 'right' },
  section: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
 companyInfo: {
        width:150
    },
    infoheader: {
        backgroundColor: '#eeeeee',
        width: '100%',           // ← span the entire container
        fontSize: 10,
        padding: 4,
        
        fontWeight: 'bold',
        marginBottom: 4,         // ← a smidge of space below the header
    },
     fieldValue: {
        marginBottom: 2,
        fontSize: 9,
    },
    // 
  table: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderStyle: 'solid',
    fontSize: 7,
  },
  tableRow: { flexDirection: 'row', borderBottomColor: '#bfbfbf', borderBottomWidth: 1 },
  tableRowEven: { backgroundColor: '#ffffff' },
  tableRowOdd: { backgroundColor: '#f9f9f9' },
  headerCell: {
    textAlign: 'center',
    fontSize: 6,
    fontWeight: 'bold',
    padding: 2,
    backgroundColor: '#eeeeee',
  },
  tableCol: { borderRightWidth: 1, borderRightColor: '#bfbfbf', padding: 4 },
  colSerial:   { width: '5%',  textAlign: 'center' },
  colBrand:    { width: '12%' },
  colItem:     { width: '28%' },
  colPack:     { width: '8%',  textAlign: 'center' },
  colQty:      { width: '7%',  textAlign: 'center' },
  colQtyPcs:   { width: '7%',  textAlign: 'center' },
  colTotalQty: { width: '10%',  textAlign: 'center' },
  colGst:      { width: '7%',  textAlign: 'center' },
  colNet:      { width: '11%', textAlign: 'center' },
  colTotal:    { width: '12%',  textAlign: 'center', borderRightWidth: 0 },
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  comments: { flex: 1, marginRight: 16, fontSize: 9 },
  commentsHeading: { fontWeight: 'bold', marginBottom: 4 },
  totalsCard: {
    width: '30%',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalsLabel: { fontSize: 9, fontWeight: 'bold' },
  totalsValue: { fontSize: 9 },
  thankYou: { marginTop: 24, textAlign: 'center', fontStyle: 'italic' },
});

const PurchaseInvoiceReport: React.FC = () => {
   const { token, roleid } = useSelector((s: RootState) => s.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<PurchaseInvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const formatNumber = useNumberFormatter();
  const formatDate = useFormatDate();

  useEffect(() => {
    async function fetchInvoice() {
      try {
          const res = await fetch(
          `${variables.API_URL}PurchaseInvoice/GetPurchasesInvoiceReportSP/${id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: PurchaseInvoiceDto = await res.json();
        setInvoice(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchInvoice();
  }, [id]);

  function breakLongWords(str: string, maxLen = 25) {
    return str.replace(new RegExp(`([^\\s]{${maxLen}})`, 'g'), '$1\u200B');
  }

  if (loading) return <div>Loading...</div>;
  if (error)   return <div>Error: {error}</div>;
  if (!invoice) return <div>No invoice found.</div>;

  const totalCTN    = invoice.items.reduce((s, i) => s + i.quantityCTN, 0);
  const totalPCS    = invoice.items.reduce((s, i) => s + i.quantityPCS, 0);
  const totalAllPCS = invoice.items.reduce((s, i) => s + i.totalQtyPCS, 0);
  const grandTotal  = invoice.items.reduce((s, i) => s + i.totalPrice, 0);

  return (
    <PDFViewer style={styles.viewer}>
      <Document>
        <Page size="A4" style={styles.page}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>PURCHASE INVOICE</Text>
            <View style={styles.invoiceInfo}>
              <Text>Ref No: {invoice.refNo}</Text>
              <Text>Date: {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '—'}</Text>
            </View>
          </View>

          {/* Vendor Info */}
           <View style={styles.section}>
                                           <View style={styles.companyInfo}>
                   
                                               <View style={styles.infoheader}>
                                                   <Text>VENDOR:</Text>
                                               </View>
                                               <Text style={styles.fieldValue}>
                                                   {invoice.vendorName}
                                               </Text>
                                               <Text style={styles.fieldValue}>
                                                   {breakLongWords(invoice.address)}
                                               </Text>
                                           </View>
                                       </View>
          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableRow}>
              {[
                ['#', 'colSerial'],
                ['BRAND', 'colBrand'],
                ['DESCRIPTION', 'colItem'],
                ['PACKING\n(PCS/CTN)', 'colPack'],
                ['QUANTITY\n(CTN)', 'colQty'],
                ['QUANTITY\n(PCS)', 'colQtyPcs'],
                ['TOTAL\nPCS', 'colTotalQty'],
                // ['GST\n(%)', 'colGst'],
                ['NET\nPRICE(PKR)', 'colNet'],
                ['TOTAL\nPRICE(PKR)', 'colTotal'],
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

            {invoice.items.map((it, idx) => {
              const stripe = idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd;
              return (
                <View style={[styles.tableRow, stripe]} key={it.itemID}>
                  <Text style={[styles.tableCol, styles.colSerial]}>{idx + 1}</Text>
                  <Text style={[styles.tableCol, styles.colBrand]}>{it.brandName}</Text>
                  <Text style={[styles.tableCol, styles.colItem]}>{it.itemName}</Text>
                  <Text style={[styles.tableCol, styles.colPack]}>{it.packingPCSperCTN}</Text>
                  <Text style={[styles.tableCol, styles.colQty]}>{formatNumber(it.quantityCTN)}</Text>
                  <Text style={[styles.tableCol, styles.colQtyPcs]}>{formatNumber(it.quantityPCS)}</Text>
                  <Text style={[styles.tableCol, styles.colTotalQty]}>{formatNumber(it.totalQtyPCS)}</Text>
                  {/* <Text style={[styles.tableCol, styles.colGst]}>{formatNumber(it.gstPercentage)}</Text> */}
                  <Text style={[styles.tableCol, styles.colNet]}>{formatNumber(it.netPrice.toFixed(2))}</Text>
                  <Text style={[styles.tableCol, styles.colTotal]}>{formatNumber(it.totalPrice.toFixed(2))}</Text>
                </View>
              );
            })}

            {/* Totals Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.colSerial]}></Text>
              <Text style={[styles.tableCol, styles.colBrand]}></Text>
              <Text style={[styles.tableCol, styles.colItem]}>Totals:</Text>
              <Text style={[styles.tableCol, styles.colPack]}></Text>
              <Text style={[styles.tableCol, styles.colQty]}>{totalCTN.toFixed(2)}</Text>
              <Text style={[styles.tableCol, styles.colQtyPcs]}>{totalPCS.toFixed(2)}</Text>
              <Text style={[styles.tableCol, styles.colTotalQty]}>{totalAllPCS.toFixed(2)}</Text>
              {/* <Text style={[styles.tableCol, styles.colGst]}></Text> */}
              <Text style={[styles.tableCol, styles.colNet]}></Text>
              <Text style={[styles.tableCol, styles.colTotal]}>{formatNumber(grandTotal.toFixed(2))}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <View style={styles.comments}>
              <Text style={styles.commentsHeading}>Additional Comments:</Text>
              <Text>– Payment due: 30 days from invoice date</Text>
                            <Text>– Sales Tax calculated at 18% of invoice value</Text>
            </View>
            <View style={styles.totalsCard}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total(PKR):</Text>
                <Text style={styles.totalsValue}>{formatNumber(grandTotal.toFixed(2))}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.thankYou}>Thank You For Your Business!</Text>
        </Page>
      </Document>
    </PDFViewer>
  );
};

export default PurchaseInvoiceReport;
