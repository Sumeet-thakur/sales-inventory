export  interface priceListModel {

    priceListId: number;
    priceRefNumber: string;
    priceDate: string;
    ItemCount: number;

}


export  interface priceListItemModel {

    priceListItemChildId: number;
    priceListId: number;
    itemId: number;
    customerCategoryId:number;
    itemName:string
 description: string;
 totalQuantity: number;
 oldNetPrice: number;
 newNetPrice: number;
 

}