import { configureStore } from "@reduxjs/toolkit";
import { userAuthReducer } from "./userAuthSlice";
 const store =configureStore({
    reducer:{ userAuthStore: userAuthReducer}
})


export type RootState = ReturnType<typeof store.getState>;

export default store;