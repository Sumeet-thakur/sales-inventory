export default interface menuRightsModel {
  RoleId:string;
    MenuItemId: number;
    ModuleItemId: number;
    chkView: boolean;
    chkInsert: boolean;
  chkUpdate: boolean;
  chkDelete: boolean;
  chkPrint: boolean;
  chkApprove: boolean;
  chkRevise: boolean;
  chkVoid: boolean;
}
  
