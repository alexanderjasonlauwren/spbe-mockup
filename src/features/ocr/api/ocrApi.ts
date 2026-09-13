import { pick } from "@/lib/dataSource";
import type { OcrApi } from "./contract";
import { ocrApiHttp } from "./ocrApi.http";
import { ocrApiMock } from "./ocrApi.mock";

export type { ReceiptExtraction } from "./contract";
const api: OcrApi = pick(ocrApiMock, ocrApiHttp);
export const getReceipts = api.getReceipts.bind(api);
export const createReceipt = api.createReceipt.bind(api);
export const verifyReceipt = api.verifyReceipt.bind(api);
