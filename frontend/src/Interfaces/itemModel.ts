export default interface itemModel {

    itemName: string;
    itemCode: string;
    itemDescription: string;
    brandId: number;
    itemGroupId: number;
    unitId: number;
    secondaryUnitID: number;
    conversionFactor: number;
    purchasePrice: number;
    weight: number;
    height: number;
    length: number;
    width: number;
    gstPercentage: number;
    minimumStock:number;
    maximumStock:number;
    startingQuantity:number;
    imagePath:string;
}