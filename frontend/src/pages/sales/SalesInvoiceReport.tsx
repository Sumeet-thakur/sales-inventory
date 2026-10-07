// SalesInvoiceReport.tsx
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
interface SalesInvoiceItemDto {
  itemID: number;
  brandName: string;
  itemName: string;
  packingPCSperCTN: number;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  unitPrice: number;
  gstPercentage: number;
  salesTaxPerUnit: number;
  netPrice: number;
  totalPrice?: number;
}

interface SalesInvoiceDto {
  salesInvoiceID: number;
  refNo: string;
  invoiceDate: string;
  customerName: string;
  poNumber: string;
  address: string;
  sellerName: string;
  quantityCTN: number;
  quantityPCS: number;
  totalQtyPCS: number;
  totalPrice: number;
  items: SalesInvoiceItemDto[];
}

// --- Styles (unchanged) ---
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
  customerInfo: {},
  table: {
    flexDirection: 'column',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    borderStyle: 'solid',
    fontSize: 7
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#bfbfbf',
    borderBottomWidth: 1,
  },
   tableRowEven: {
    backgroundColor: '#ffffff',
  },
  // odd rows (1, 3, 5…)
  tableRowOdd: {
   
     backgroundColor: '#f9f9f9',
  },
  tableHeader: {
  
    textAlign: 'center',
    fontSize: 5

  },
  tableCol: {
    borderRightWidth: 1,
    borderRightColor: '#bfbfbf',
    padding: 4,
  },
  colSerial: { width: '7%' ,textAlign:'center'},
  colItem: { width: '25%' },
  colBrand: { width: '6%' },
  colPack: { width: '10%',textAlign:'center' },
  colQty: { width: '10%' ,textAlign:'center'},
  colQtyPcs: { width: '10%',textAlign:'center' },
  colTotalQty: { width: '10%' ,textAlign:'center'},
  colUnitPrice: { width: '11%' },
  colTax: { width: '10%' },
  colNet: { width: '12%' },
  colTotal: {
    width: '12%',
    borderRightWidth: 0,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  footerLabel: {
    width: '68%',
    textAlign: 'right',
    padding: 4,
    fontWeight: 'bold',
  },
  footerValue: {
    width: '10%',
    padding: 4,
  },

  thankYou: {
    marginTop: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  address: {
    width: 100,
    marginTop: 25,
  },
  totalsCard: {
    width: '35%',
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

  // container that will hold both comment & totals side by side
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
  infoheader: {
    backgroundColor: '#eeeeee',
    fontSize: 8,
    padding: 2,
    fontWeight: 'bold',
  },
  headerCell: {
    textAlign: 'center',
    fontSize: 6,        // shrink to fit
    fontWeight: 'bold',
    padding: 2, 
    paddingTop:8,
     backgroundColor: '#eeeeee', 
            // tighten up your cell padding
  },
  commentsheading:{
    fontWeight:'bold'
  }
});

// --- Main component ---
const SalesInvoiceReport: React.FC = () => {
  const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<SalesInvoiceDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
   const formatNumber = useNumberFormatter();
    const formatDate = useFormatDate();

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(
          `${variables.API_URL}SalesInvoices/GetSalesInvoiceReportSP/${id}`,
          {
        
          headers: {
           
            Authorization: `Bearer ${token}`,
          },
        }
        );
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data: SalesInvoiceDto = await res.json();
        setInvoice(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchInvoice();
  }, [id]);

  // helper to break long words in address
  function breakLongWords(str: string, maxChunk = 25) {
    const regex = new RegExp(`([^\\s]{${maxChunk}})`, 'g');
    return str.replace(regex, '$1\u200B');
  }

  // early returns
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!invoice) return <div>No invoice found.</div>;

  // safely compute totals now that `invoice` is non-null
  const totalQuantityPCS = invoice.items.reduce((sum, i) => sum + i.totalQtyPCS, 0);
  const totalPCS = invoice.items.reduce((sum, i) => sum + i.quantityPCS, 0);
  const totalCTN = invoice.items.reduce((sum, i) => sum + i.quantityCTN, 0);

  const totalNet = invoice.items.reduce((sum, i) => sum + i.netPrice, 0);

  
  // (you can add CTN/PCS totals similarly if you need)

  return (
    <PDFViewer style={styles.viewer}>
      <Document>
        <Page size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>SALES INVOICE</Text>
            <View style={styles.invoiceInfo}>
              <Text>Ref No: {invoice.refNo}</Text>
              <Text>
                Date:    {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : "—"}
              </Text>
               <Text>Buyer PO No: {invoice.poNumber}</Text>
            </View>
          </View>

          {/* Company & Customer */}
          <View style={styles.section}>
            <View style={styles.companyInfo}>
              <Text style={styles.infoheader}>SELLER:</Text>
              <Text>{invoice.sellerName}</Text>
              <Text> {'\n'}  </Text>
              <Text style={styles.infoheader}>BUYER:</Text>
              <Text>{invoice.customerName}</Text>
              <Text >
                {breakLongWords(invoice.address)}
              </Text>
            </View>
            {/* <View style={styles.customerInfo}>
              <Text>Buyer: {invoice.customerName}</Text>
              
            </View> */}
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            {/* Header Row */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCol, styles.colSerial, styles.headerCell]}>
                SERIAL No.
              </Text>
              <Text style={[styles.tableCol, styles.colBrand, styles.headerCell]}>
                BRAND
              </Text>
              <Text style={[styles.tableCol, styles.colItem, styles.headerCell]}>
                DESCRIPTION
              </Text>
              <Text style={[styles.tableCol, styles.colPack, styles.headerCell]}>
                PACKING{'\n'}(PCS/CTN)
              </Text>
              <Text style={[styles.tableCol, styles.colQty, styles.headerCell]}>
                QUANTITY{'\n'}(CTN)
              </Text>
              <Text style={[styles.tableCol, styles.colQtyPcs, styles.headerCell]}>
                QUANTITY{'\n'}(PCS)
              </Text>
              <Text style={[styles.tableCol, styles.colTotalQty, styles.headerCell]}>
                TOTAL QUANTITY{'\n'}(PCS)
              </Text>
              <Text style={[styles.tableCol, styles.colUnitPrice, styles.headerCell]}>
                UNIT PRICE {'\n'} (PKR)
              </Text>
              <Text style={[styles.tableCol, styles.colTax, styles.headerCell]}>
                SALES{'\n'}TAX/UNIT{'\n'}
                (PKR/PC)
              </Text>
              <Text style={[styles.tableCol, styles.colNet, styles.headerCell]}>
                NET PRICE {'\n'}(PKR)
              </Text>
              <Text style={[styles.tableCol, styles.colTotal, styles.headerCell]}>
                TOTAL{'\n'}(PKR)
              </Text>
            </View>
            {/* Data Rows */}
            {invoice.items.map((it, idx) => {
 // choose zebra background based on even/odd index
 const stripe = idx % 2 === 0
   ? styles.tableRowEven
   : styles.tableRowOdd;

 return (
   <View style={[styles.tableRow, stripe]} key={it.itemID}>
      <Text style={[styles.tableCol, styles.colSerial]}>{idx + 1}</Text>
      <Text style={[styles.tableCol, styles.colBrand]}>{it.brandName}</Text>
      <Text style={[styles.tableCol, styles.colItem]}>{it.itemName}</Text>
      <Text style={[styles.tableCol, styles.colPack]}>
        {it.packingPCSperCTN}
      </Text>
      <Text style={[styles.tableCol, styles.colQty]}>
        {it.quantityCTN}
      </Text>
      <Text style={[styles.tableCol, styles.colQtyPcs]}>
        {it.quantityPCS}
      </Text>
      <Text style={[styles.tableCol, styles.colTotalQty]}>
        {formatNumber(it.totalQtyPCS)}
      </Text>
      <Text style={[styles.tableCol, styles.colUnitPrice]}>
        {formatNumber(it.unitPrice.toFixed(2))}
      </Text>
      <Text style={[styles.tableCol, styles.colTax]}>
        {formatNumber(it.salesTaxPerUnit.toFixed(2))}
      </Text>
      <Text style={[styles.tableCol, styles.colNet]}>
        {formatNumber(it.netPrice.toFixed(2))}
      </Text>
      <Text style={[styles.tableCol, styles.colTotal]}>
        {formatNumber((it.totalPrice ?? 0).toFixed(2))}
      </Text>
    </View>
  );
})}

            <View style={styles.tableRow} >
              <Text style={[styles.tableCol, styles.colSerial]}></Text>
              <Text style={[styles.tableCol, styles.colBrand]}></Text>
              <Text style={[styles.tableCol, styles.colItem]}></Text>
              <Text style={[styles.tableCol, styles.colPack]}>

              </Text>
              <Text style={[styles.tableCol, styles.colQty]}>
                {totalCTN.toFixed(2)}
              </Text>
              <Text style={[styles.tableCol, styles.colQtyPcs]}>
                {totalPCS.toFixed(2)}
              </Text>
              <Text style={[styles.tableCol, styles.colTotalQty]}>
                {totalQuantityPCS.toFixed(2)}
              </Text>
              <Text style={[styles.tableCol, styles.colUnitPrice]}>

              </Text>
              <Text style={[styles.tableCol, styles.colTax]}>

              </Text>
              <Text style={[styles.tableCol, styles.colNet]}>

              </Text>
              <Text style={[styles.tableCol, styles.colTotal]}>

              </Text>
            </View>

          </View>
          {/* totals card at bottom-right */}
          <View style={styles.footerContainer}>
            {/* left column: comments */}
            <View style={styles.comments}>
              <Text style={styles.commentsheading}>Additional Comments:</Text>
              <Text>– Payment due: 30 days from invoice date</Text>
              <Text>– Sales Tax calculated at 18% of invoice value</Text>
            </View>

            {/* right column: totals card */}
            <View style={styles.totalsCard}>
              {/* <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Total CTN:</Text>
        <Text style={styles.totalsValue}>{totalCTN.toFixed(2)}</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Total PCS:</Text>
        <Text style={styles.totalsValue}>{totalPCS.toFixed(2)}</Text>
      </View>
      <View style={styles.totalsRow}>
        <Text style={styles.totalsLabel}>Total Qty PCS:</Text>
        <Text style={styles.totalsValue}>{totalQuantityPCS.toFixed(2)}</Text>
      </View> */}
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total (PKR):</Text>
                <Text style={styles.totalsValue}>{formatNumber(invoice.totalPrice.toFixed(2))}</Text>
              </View>
            </View>
          </View>

          {/* Thank you footer */}
          <Text style={styles.thankYou}>Thank You For Your Business!</Text>
        </Page>
      </Document>
    </PDFViewer>
  );
};

export default SalesInvoiceReport;
