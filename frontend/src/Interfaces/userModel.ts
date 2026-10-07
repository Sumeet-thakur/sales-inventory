export default interface userModel {
   
    userId: string;
    email: string;
    role?: string;
    roleid?: string;
    exp?:0;
    token:string;
    refreshToken:string;
  }