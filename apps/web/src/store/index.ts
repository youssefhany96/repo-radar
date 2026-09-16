import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import tracked from "./trackedSlice";
import search from "./searchSlice";
import { persistMiddleware, loadPersisted } from "./persist";

export const store = configureStore({
  reducer: { tracked, search },
  middleware: (getDefault) => getDefault().concat(persistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export { loadPersisted };
