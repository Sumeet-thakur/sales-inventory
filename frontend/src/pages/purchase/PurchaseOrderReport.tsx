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

interface PurchaseOrderItemDto {
  itemID: number;
  brandName: string;
  itemName: string;
  packingPCSperCTN: number;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  unitPrice: number;
  totalAmount: number;
}

interface PurchaseOrderDto {
  purchaseRequisitionOrderID: number;
  refNo: string;
  date: string;
  vendorName: string;
  address: string;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  totalAmount: number;
  items: PurchaseOrderItemDto[];
}

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
    // new helper for your text lines
    fieldValue: {
        marginBottom: 2,
        fontSize: 9,
    },
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
  colBrand:    { width: '8%' },
  colItem:     { width: '28%' },
  colPack:     { width: '10%',  textAlign: 'center' },
  colQty:      { width: '10%',  textAlign: 'center' },
  colQtyPcs:   { width: '10%',  textAlign: 'center' },
  colTotalQty: { width: '8%',  textAlign: 'center' },
  colUnit:     { width: '10%', textAlign: 'center' },
  colTotal:    { width: '15%',  textAlign: 'center', borderRightWidth: 0 },
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
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
  comments: { flex: 1, marginRight: 16, fontSize: 9 },
    commentsHeading: { fontWeight: 'bold', marginBottom: 4 },
});

const PurchaseOrderReport: React.FC = () => {
    const { token ,roleid} = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const formatNumber = useNumberFormatter();
  const formatDate = useFormatDate();

  useEffect(() => {
    async function fetchOrder() {
      try {
       const res = await fetch(
        `${variables.API_URL}PurchaseRequisitionOrder/GetPurchaseRequisitionOrderReportSP/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: PurchaseOrderDto = await res.json();
        setOrder(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchOrder();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!order) return <div>No data found.</div>;

  const totalCTN = order.items.reduce((s, i) => s + i.quantityCTN, 0);
  const totalPCS = order.items.reduce((s, i) => s + i.quantityPCS, 0);
  const totalAllPCS = order.items.reduce((s, i) => s + i.totalQtyPCS, 0);
  const grandTotal = order.items.reduce((s, i) => s + i.totalAmount, 0);
  function breakLongWords(str: string, maxLen = 25) {
        return str.replace(new RegExp(`([^\\s]{${maxLen}})`, 'g'), '$1\u200B');
    }

  return (
    <PDFViewer style={styles.viewer}>
      <Document>
        <Page size="A4" style={styles.page}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>PURCHASE ORDER</Text>
            <View style={styles.invoiceInfo}>
              <Text>Ref No: {order.refNo}</Text>
              <Text>Date: {order.date ? formatDate(order.date) : '—'}</Text>
            </View>
          </View>

          {/* Vendor Info */}
         <View style={styles.section}>
                                 <View style={styles.companyInfo}>
         
                                     <View style={styles.infoheader}>
                                         <Text>VENDOR:</Text>
                                     </View>
                                     <Text style={styles.fieldValue}>
                                         {order.vendorName}
                                     </Text>
                                     <Text style={styles.fieldValue}>
                                         {breakLongWords(order.address)}
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
                ['PACKING (PCS/CTN)', 'colPack'],
                ['QUANTITY (CTN)', 'colQty'],
                ['QUANTITY (PCS)', 'colQtyPcs'],
                ['TOTAL QUANTITY', 'colTotalQty'],
                ['UNIT PRICE (PKR)', 'colUnit'],
                ['TOTAL AMOUNT (PKR)', 'colTotal']
              ].map(([label, col]) => (
                <Text
                  key={label}
                  style={[styles.tableCol, styles[col as keyof typeof styles], styles.headerCell]}
                >
                  {label}
                </Text>
              ))}
            </View>

            {order.items.map((item, idx) => {
              const stripe = idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd;
              return (
                <View style={[styles.tableRow, stripe]} key={idx}>
                  <Text style={[styles.tableCol, styles.colSerial]}>{idx + 1}</Text>
                  <Text style={[styles.tableCol, styles.colBrand]}>{item.brandName}</Text>
                  <Text style={[styles.tableCol, styles.colItem]}>{item.itemName}</Text>
                  <Text style={[styles.tableCol, styles.colPack]}>{item.packingPCSperCTN}</Text>
                  <Text style={[styles.tableCol, styles.colQty]}>{formatNumber(item.quantityCTN)}</Text>
                  <Text style={[styles.tableCol, styles.colQtyPcs]}>{formatNumber(item.quantityPCS)}</Text>
                  <Text style={[styles.tableCol, styles.colTotalQty]}>{formatNumber(item.totalQtyPCS)}</Text>
                  <Text style={[styles.tableCol, styles.colUnit]}>{formatNumber(item.unitPrice)}</Text>
                  <Text style={[styles.tableCol, styles.colTotal]}>{formatNumber(item.totalAmount)}</Text>
                </View>
              );
            })}
            <View style={[styles.tableRow]} >
                  <Text style={[styles.tableCol, styles.colSerial]}></Text>
                  <Text style={[styles.tableCol, styles.colBrand]}></Text>
                  <Text style={[styles.tableCol, styles.colItem]}></Text>
                  <Text style={[styles.tableCol, styles.colPack]}></Text>
                  <Text style={[styles.tableCol, styles.colQty]}>{totalCTN}</Text>
                  <Text style={[styles.tableCol, styles.colQtyPcs]}>{totalPCS}</Text>
                  <Text style={[styles.tableCol, styles.colTotalQty]}>{totalAllPCS}</Text>
                  <Text style={[styles.tableCol, styles.colUnit]}></Text>
                  <Text style={[styles.tableCol, styles.colTotal]}>{formatNumber(grandTotal)}</Text>
                </View>
          </View>

          {/* Totals */}
          <View style={styles.footerContainer}>
              <View style={styles.comments}>
                                        <Text style={styles.commentsHeading}>Additional Comments:</Text>
                                        {/* add any comments here */}
                                    </View>
            <View style={styles.totalsCard}>
              {/* <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total CTN:</Text>
                <Text style={styles.totalsValue}>{totalCTN}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total PCS:</Text>
                <Text style={styles.totalsValue}>{totalPCS}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total Quantity :</Text>
                <Text style={styles.totalsValue}>{totalAllPCS}</Text>
              </View> */}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total Amount (PKR):</Text>
                <Text style={styles.totalsValue}>{formatNumber(grandTotal)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.thankYou}>Thank You For Your Business!</Text>
        </Page>
      </Document>
    </PDFViewer>
  );
};

export default PurchaseOrderReport;