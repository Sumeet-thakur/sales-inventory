import { createSlice } from "@reduxjs/toolkit";
import  userModel  from "../../Interfaces/userModel";

export const emptyUserState: userModel = {
    userId: "",
    email: "",
    role: "",
    roleid: "",
    exp:0,
    token:"",
    refreshToken:"",
};

export const userAuthSlice = createSlice({
  name: "userAuth",
  initialState: emptyUserState,
  reducers: {
    setLoggedInUser: (state, action) => {
      state.userId = action.payload.userId;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.roleid = action.payload.roleid;
      state.exp = action.payload.exp;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    clearLoggedInUser: (state) => {
        state.userId = "";
        state.email = "";
        state.role = "";
        state.roleid = "";
        state.exp=0,
        state.token = "";
        state.refreshToken = ""; // Add this line
      },
  },
});

export const { setLoggedInUser,clearLoggedInUser } = userAuthSlice.actions;
export const userAuthReducer = userAuthSlice.reducer;