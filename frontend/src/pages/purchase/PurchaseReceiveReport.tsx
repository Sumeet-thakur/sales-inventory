// PurchaseReceiveReport.tsx
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

interface PurchaseReceiveItemDto {
    itemID: number;
    brandName: string;
    itemName: string;
    packingPCSperCTN: number;
    unitName: string;
    quantityCTN: number;
    quantityPCS: number;
    totalQtyPCS: number;
}

interface PurchaseReceiveDto {
    purchaseReceiveID: number;
    refNo: string;
    date: string;
    vendorName: string;
    address: string;
    quantityCTN: number;
    quantityPCS: number;
    totalQtyPCS: number;
    items: PurchaseReceiveItemDto[];
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
        fontSize: 8,
        fontWeight: 'bold',
        padding: 5,
        backgroundColor: '#eeeeee',
    },
    tableCol: { borderRightWidth: 1, borderRightColor: '#bfbfbf', padding: 4 },

    colSerial: { width: '5%', textAlign: 'center' },
    colBrand: { width: '10%' },
    colItem: { width: '35%' },
    colPack: { width: '13%', textAlign: 'center' },
    colQty: { width: '13%', textAlign: 'center' },
    colQtyPcs: { width: '13%', textAlign: 'center' },
    colTotalQty: { width: '20%', textAlign: 'center', borderRightWidth: 0 },

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
});

const PurchaseReceiveReport: React.FC = () => {
     const { token, roleid } = useSelector((state: RootState) => state.userAuthStore);
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<PurchaseReceiveDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const formatNumber = useNumberFormatter();
    const formatDate = useFormatDate();

    useEffect(() => {
        async function fetchData() {
            try {
               const res = await fetch(
          `${variables.API_URL}PurchaseReceives/GetPurchasesReceiveReportSP/${id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );
                if (!res.ok) throw new Error(`Error ${res.status}`);
                const result: PurchaseReceiveDto = await res.json();
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchData();
    }, [id]);

    function breakLongWords(str: string, maxLen = 25) {
        return str.replace(new RegExp(`([^\\s]{${maxLen}})`, 'g'), '$1\u200B');
    }

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!data) return <div>No report found.</div>;

    // compute totals
    const totalCTN = data.items.reduce((sum, i) => sum + i.quantityCTN, 0);
    const totalPCS = data.items.reduce((sum, i) => sum + i.quantityPCS, 0);
    const totalQtyPCS = data.items.reduce((sum, i) => sum + i.totalQtyPCS, 0);

    return (
        <PDFViewer style={styles.viewer}>
            <Document>
                <Page size="A4" style={styles.page}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>PURCHASE RECEIVE</Text>
                        <View style={styles.invoiceInfo}>
                            <Text>Ref No: {data.refNo}</Text>
                            <Text>Date: {data.date ? formatDate(data.date) : '—'}</Text>
                        </View>
                    </View>

                    {/* Vendor */}
                    <View style={styles.section}>
                        <View style={styles.companyInfo}>

                            <View style={styles.infoheader}>
                                <Text>VENDOR:</Text>
                            </View>
                            <Text style={styles.fieldValue}>
                                {data.vendorName}
                            </Text>
                            <Text style={styles.fieldValue}>
                                {breakLongWords(data.address)}
                            </Text>
                        </View>
                    </View>

                    {/* Items Table */}
                    <View style={styles.table}>
                        {/* Header Row */}
                        <View style={styles.tableRow}>
                            {[
                                ['S No.', 'colSerial'],
                                ['BRAND', 'colBrand'],
                                ['DESCRIPTION', 'colItem'],
                                ['PACKING (PCS/CTN)', 'colPack'],
                                ['QUANTITY (CTN)', 'colQty'],
                                ['QUANTITY (PCS)', 'colQtyPcs'],
                                ['TOTAL PCS', 'colTotalQty'],
                            ].map(([label, col]) => (
                                <Text
                                    key={label}
                                    style={[
                                        styles.tableCol,
                                        // @ts-ignore
                                        styles[col],
                                        styles.headerCell
                                    ]}
                                >
                                    {label}
                                </Text>
                            ))}
                        </View>

                        {/* Data Rows */}
                        {data.items.map((item, idx) => (
                            <View
                                key={item.itemID}
                                style={[
                                    styles.tableRow,
                                    idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                                ]}
                            >
                                <Text style={[styles.tableCol, styles.colSerial]}>{idx + 1}</Text>
                                <Text style={[styles.tableCol, styles.colBrand]}>{item.brandName}</Text>
                                <Text style={[styles.tableCol, styles.colItem]}>{item.itemName}</Text>
                                <Text style={[styles.tableCol, styles.colPack]}>
                                    {item.packingPCSperCTN}
                                </Text>
                                <Text style={[styles.tableCol, styles.colQty]}>
                                    {formatNumber(item.quantityCTN.toFixed(2))}
                                </Text>
                                <Text style={[styles.tableCol, styles.colQtyPcs]}>
                                    {formatNumber(item.quantityPCS.toFixed(2))}
                                </Text>
                                <Text style={[styles.tableCol, styles.colTotalQty]}>
                                    {formatNumber(item.totalQtyPCS.toFixed(2))}
                                </Text>
                            </View>
                        ))}

                        {/* Totals Row */}
                        <View style={styles.tableRow}>
                            <Text style={[styles.tableCol, styles.colSerial]} />
                            <Text style={[styles.tableCol, styles.colBrand]} />
                            <Text style={[styles.tableCol, styles.colItem]} />
                            <Text style={[styles.tableCol, styles.colPack]} />
                            <Text style={[styles.tableCol, styles.colQty]}>
                                {formatNumber(totalCTN.toFixed(2))}
                            </Text>
                            <Text style={[styles.tableCol, styles.colQtyPcs]}>
                                {formatNumber(totalPCS.toFixed(2))}
                            </Text>
                            <Text style={[styles.tableCol, styles.colTotalQty]}>
                                {formatNumber(totalQtyPCS.toFixed(2))}
                            </Text>
                        </View>
                    </View>

                    {/* Footer – comments & totals */}
                    <View style={styles.footerContainer}>
                        <View style={styles.comments}>
                            <Text style={styles.commentsHeading}>Additional Comments:</Text>
                            {/* add any comments here */}
                        </View>
                        <View style={styles.totalsCard}>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Total CTN:</Text>
                                <Text style={styles.totalsValue}>{formatNumber(totalCTN.toFixed(2))}</Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Total PCS:</Text>
                                <Text style={styles.totalsValue}>{formatNumber(totalPCS.toFixed(2))}</Text>
                            </View>
                            <View style={styles.totalsRow}>
                                <Text style={styles.totalsLabel}>Total PCS (All):</Text>
                                <Text style={styles.totalsValue}>{formatNumber(totalQtyPCS.toFixed(2))}</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.thankYou}>Thank You For Your Business!</Text>

                </Page>
            </Document>
        </PDFViewer>
    );
};

export default PurchaseReceiveReport;
