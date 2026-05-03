import { MOCK_DELAY_MS } from "@/utils/constants";
import type {
  ScheduleAgreement,
  SAFilterParams,
  UploadSAPayload,
} from "../types";

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

const mockSAList: ScheduleAgreement[] = [
  {
    id: "sa-001",
    nomorSA: "SA-2023-08-001",
    spbe: "SPBE Jakarta Utara 01",
    periodeMultai: "01 Agt 2023",
    periodeBerakhir: "31 Agt 2023",
    totalKuota: 450000,
    sudahDidistribusikan: 315000,
    sisaKuota: 135000,
    status: "Aktif",
  },
  {
    id: "sa-002",
    nomorSA: "SA-2023-08-012",
    spbe: "SPBE Bekasi Utama",
    periodeMultai: "15 Agt 2023",
    periodeBerakhir: "31 Agt 2023",
    totalKuota: 120000,
    sudahDidistribusikan: 118500,
    sisaKuota: 1500,
    status: "Limit",
  },
  {
    id: "sa-003",
    nomorSA: "SA-2023-08-045",
    spbe: "SPBE Tangerang Raya",
    periodeMultai: "01 Agt 2023",
    periodeBerakhir: "31 Agt 2023",
    totalKuota: 600000,
    sudahDidistribusikan: 420000,
    sisaKuota: 180000,
    status: "Aktif",
  },
  {
    id: "sa-004",
    nomorSA: "SA-2023-09-001",
    spbe: "SPBE Maju Jaya",
    periodeMultai: "01 Sep 2023",
    periodeBerakhir: "30 Sep 2023",
    totalKuota: 380000,
    sudahDidistribusikan: 0,
    sisaKuota: 380000,
    status: "Draft",
  },
];

export async function getSAList(
  _filters?: SAFilterParams,
): Promise<ScheduleAgreement[]> {
  await delay();
  return mockSAList;
}

export async function uploadSA(
  _payload: UploadSAPayload,
): Promise<ScheduleAgreement> {
  await delay();
  return {
    id: "sa-005",
    nomorSA: _payload.nomorSA,
    spbe: _payload.spbe,
    periodeMultai: _payload.periodeMultai,
    periodeBerakhir: _payload.periodeBerakhir,
    totalKuota: _payload.totalKuota,
    sudahDidistribusikan: 0,
    sisaKuota: _payload.totalKuota,
    status: "Draft",
  };
}

export async function convertSAToPlan(
  _saId: string,
): Promise<{ planId: string }> {
  await delay();
  return { planId: "plan-001" };
}

export async function downloadSAPDF(_saId: string): Promise<Blob> {
  await delay();
  return new Blob(["mock pdf"], { type: "application/pdf" });
}
