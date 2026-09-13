/**
 * The product adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { productApiMock } from "./productApi.mock";
import { productApiHttp } from "./productApi.http";
import type { ProductApi } from "./contract";

export type { ProductFilters, ProductView, StockSummary } from "./contract";

const api: ProductApi = pick(productApiMock, productApiHttp);

export const getProducts = api.getProducts.bind(api);
export const getProductDetail = api.getProductDetail.bind(api);
export const createOrUpdateProduct = api.createOrUpdateProduct.bind(api);
export const removeProduct = api.removeProduct.bind(api);
export const changeStock = api.changeStock.bind(api);
export const getStockSummary = api.getStockSummary.bind(api);
export const exportProducts = api.exportProducts.bind(api);
