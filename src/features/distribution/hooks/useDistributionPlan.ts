import { scopeKey } from "@/mocks/scope";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { useToast } from "@/hooks/useToast";
import {
  addApprovedOrders,
  cancelDistributionPlan,
  confirmPlan,
  createPlan,
  dispatchTrip,
  getActiveSaOptions,
  getDriverOptions,
  getOutletOptions,
  getProductOptions,
  getSAOutletPlan,
  getSAProductOptions,
  getVehicleOptions,
  applyAssignment,
  getPlan,
  getPlanDetail,
  getPlanList,
  printRouteSheet,
  saveDraft,
} from "../api/distributionApi";
import type { CreditOverrideInput } from "../api/contract";
import type { DistributionPlan, PlanOption, PlanRow } from "../types";
import { outletLabel, unitLabel } from "@/lib/lexicon";
import { useResettableState } from "@/hooks/useResettableState";

export function useDistributionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const planList = useQuery({ queryKey: [...scopeKey(), "plan-list"], queryFn: getPlanList });

  // Open on the plan that needs attention: today's, or the newest draft.
  //
  // Chosen during render rather than in an effect, so the first paint already
  // has a plan selected. Via an effect the panel rendered once with nothing
  // selected, which flashed the empty state on every load.
  //
  // The list is the only dependency: an explicit selection survives a refetch
  // because setSelectedPlanId replaces the value without disturbing the seed,
  // and only a genuinely new list re-runs the choice.
  const [selectedPlanId, setSelectedPlanId] = useResettableState<string | null>(
    [planList.data],
    () => {
      const plans = planList.data;
      if (!plans?.length) return null;
      return (plans.find((p) => p.status === "Draft") ?? plans[0]).id;
    },
  );

  // The selected plan is read on its own rather than found in the list.
  //
  // A list row cannot carry which agreement the plan spends: the service
  // records that per stop, so it is only known once the stops have been
  // fetched. Finding the plan in the list left the panel showing "—" for the SA
  // on the API build while the mock showed the real one — the exact kind of
  // difference between the two builds this split exists to prevent.
  const selectedPlanQuery = useQuery({
    queryKey: [...scopeKey(), "plan", selectedPlanId],
    queryFn: () => getPlan(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const planDetail = useQuery({
    queryKey: [...scopeKey(), "plan-detail", selectedPlanId],
    queryFn: () => getPlanDetail(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const outletOptions = useQuery({
    queryKey: [...scopeKey(), "outlet-options"],
    queryFn: getOutletOptions,
  });

  const driverOptions = useQuery({
    queryKey: [...scopeKey(), "driver-options", selectedPlanId],
    queryFn: () => getDriverOptions(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const vehicleOptions = useQuery({
    queryKey: [...scopeKey(), "vehicle-options"],
    queryFn: getVehicleOptions,
  });

  const productOptions = useQuery({
    queryKey: [...scopeKey(), "product-options"],
    queryFn: getProductOptions,
  });

  // What the open plan's own SA is for -- a new stop should default to this,
  // not to the catalogue-wide list above.
  const saProductOptions = useQuery({
    queryKey: [...scopeKey(), "sa-product-options", selectedPlanQuery.data?.saId],
    queryFn: () => getSAProductOptions(selectedPlanQuery.data!.saId),
    enabled: !!selectedPlanQuery.data?.saId,
  });

  const saOptions = useQuery({
    queryKey: [...scopeKey(), "active-sa-options"],
    queryFn: getActiveSaOptions,
  });

  // The version every write echoes back. Read from the plan the panel is
  // showing, never from a remembered value: the point of the guard is that it
  // is the number the caller actually saw.
  const version = () => selectedPlanQuery.data?.version ?? 1;

  /**
   * Saving a board is two writes, and both must happen.
   *
   * The stops and the crew live in different places — the plan's items, and the
   * runs those items ride on — with different permissions behind them. Saving
   * only the stops is what left the console able to plan a day and unable to
   * dispatch it: the driver and truck the dispatcher chose went nowhere, the
   * re-read came back with no crew, and the board was permanently unsaved.
   *
   * The assignment goes second, so a rejected stop list never leaves runs
   * pointing at items that were not written.
   *
   * A run with no truck is skipped rather than sent. The service requires one
   * and would refuse the whole board; skipping keeps the stops saved and leaves
   * the incomplete run visibly unassigned, which is what the dispatcher is
   * looking at anyway.
   */
  const saveDraftMutation = useDeskMutation({
    mutationFn: async ({ planId, rows }: { planId: string; rows: PlanRow[] }) => {
      await saveDraft(planId, rows, version());

      const trips = toTripAssignments(rows);
      if (trips.length > 0) await applyAssignment(planId, trips);
      return { trips: trips.length };
    },
    errorTitle: "Draf tidak tersimpan",
    success: ({ trips }) =>
      trips > 0
        ? { title: "Draf disimpan", description: `${trips} rit ditetapkan.` }
        : { title: "Draf disimpan" },
  });

  const confirmPlanMutation = useDeskMutation({
    mutationFn: (planId: string) => confirmPlan(planId, version()),
    errorTitle: "Konfirmasi gagal",
    // What the confirmation actually committed, rather than how many delivery
    // notes it printed. The service confirms the obligation and leaves the
    // paperwork to dispatch, so a delivery count here would be a number only
    // the demo could fill.
    success: (plan) => ({
      title: `Rencana ${plan.kode} dikonfirmasi`,
      description: `${plan.jumlahOutlet} ${outletLabel()} · ${plan.totalUnit.toLocaleString("id-ID")} ${unitLabel()} terikat pada kuota SA. Pantau di Monitoring Distribusi.`,
    }),
  });

  /**
   * Sends one already-assigned run out — D3 A-Step 2/3.
   *
   * Refused for a credit-limit breach is a real, expected outcome, not a
   * failure the toast alone should carry: the page passes its own
   * `onError` at the call site (React Query runs it alongside this one) to
   * open the override dialog when the refusal is breach-shaped, so this
   * mutation itself stays generic — it does not know a dialog exists.
   */
  const dispatchTripMutation = useDeskMutation({
    mutationFn: ({ tripId, overrides }: { tripId: string; overrides?: CreditOverrideInput[] }) =>
      dispatchTrip(tripId, overrides),
    errorTitle: "Keberangkatan gagal",
    success: (result) => ({
      title: "Trip diberangkatkan",
      description: `${result.issued} surat jalan diterbitkan.`,
    }),
  });

  const createPlanMutation = useDeskMutation({
    mutationFn: createPlan,
    errorTitle: "Rencana tidak dibuat",
    success: (plan) => ({
      title: `Rencana ${plan.kode} dibuat`,
      description: `Tambahkan ${outletLabel()} dan tetapkan driver sebelum konfirmasi.`,
    }),
    onDone: (plan) => {
      setSelectedPlanId(plan.id);
      void fillFromSAPlan(plan, outletOptions.data ?? [], queryClient, toast);
    },
  });

  const cancelPlanMutation = useDeskMutation({
    mutationFn: (planId: string) => cancelDistributionPlan(planId, version()),
    errorTitle: "Pembatalan gagal",
    success: () => ({
      title: "Rencana dibatalkan",
      description: "Kuota dikembalikan ke Schedule Agreement.",
    }),
  });

  const addOrdersMutation = useDeskMutation({
    mutationFn: ({ planId, orderIds }: { planId: string; orderIds: string[] }) =>
      addApprovedOrders(planId, orderIds),
    errorTitle: "Pesanan tidak dapat dijadwalkan",
    success: (count) => ({ title: `${count} pesanan masuk ke rencana` }),
  });

  const printMutation = useDeskMutation({
    mutationFn: (planId: string) => printRouteSheet(planId),
    errorTitle: "Cetak lembar rute gagal",
  });

  const selectedPlan = selectedPlanQuery.data;

  return {
    planList: planList.data ?? [],
    planDetail: planDetail.data ?? [],
    selectedPlan,
    isLoadingList: planList.isLoading,
    isLoadingDetail: planDetail.isLoading,
    isError: planList.isError,
    error: planList.error as Error | null,
    selectedPlanId,
    setSelectedPlanId,
    outletOptions: outletOptions.data ?? [],
    vehicleOptions: vehicleOptions.data ?? [],
    productOptions: productOptions.data ?? [],
    saProductOptions: saProductOptions.data ?? [],
    driverOptions: driverOptions.data ?? [],
    saOptions: saOptions.data ?? [],
    saveDraftMutation,
    confirmPlanMutation,
    dispatchTripMutation,
    createPlanMutation,
    cancelPlanMutation,
    addOrdersMutation,
    printMutation,
  };
}

/**
 * Pre-fills a freshly created plan from its SA's own SIM3LON planning table --
 * the pangkalan x tanggal -> jumlah tabung data the checker used to build a
 * day's plan by hand (flow doc §6.1/§16, docs/flow-gap-analysis.md D6).
 *
 * A plan with no such data (an SA typed by hand, or a date its import never
 * covered) is left empty, same as before -- the planner adds stops with
 * "Tambah pangkalan" as always.
 */
async function fillFromSAPlan(
  plan: DistributionPlan,
  outlets: PlanOption[],
  queryClient: ReturnType<typeof useQueryClient>,
  toast: ReturnType<typeof useToast>["toast"],
): Promise<void> {
  if (!plan.saId) return;
  let planned;
  try {
    planned = await getSAOutletPlan(plan.saId, plan.tanggal);
  } catch {
    // Not fatal: the plan was created fine, it just starts empty. The
    // planner can still add stops by hand.
    return;
  }
  if (planned.length === 0) return;

  const byId = new Map(outlets.map((o) => [o.id, o]));
  const rows: PlanRow[] = planned.map((p, i) => ({
    id: `sa-plan-${i}`,
    outletId: p.outletId,
    outlet: p.outlet,
    alamat: byId.get(p.outletId)?.sublabel ?? "",
    lines: [{ productId: p.productId, jumlah: p.jumlah }],
    jumlahUnit: p.jumlah,
    driverId: null,
    driver: "Belum ditetapkan",
    vehicleId: null,
    vehicle: "Belum ditetapkan",
    jamPengiriman: "07:00",
    statusBayar: "Lunas",
    sisaKuotaOutlet: 0,
    piutang: 0,
    piutangJatuhTempo: 0,
    tripNo: null,
  }));

  try {
    await saveDraft(plan.id, rows, plan.version);
    await queryClient.invalidateQueries({ queryKey: [...scopeKey(), "plan-detail", plan.id] });
    await queryClient.invalidateQueries({ queryKey: [...scopeKey(), "plan", plan.id] });
    await queryClient.invalidateQueries({ queryKey: [...scopeKey(), "plan-list"] });
    toast({
      title: `${rows.length} pangkalan diisi otomatis`,
      description: "Diambil dari rencana SIM3LON agreement ini untuk tanggal yang dipilih.",
      tone: "success",
    });
  } catch {
    toast({
      title: "Tidak bisa mengisi otomatis dari SA",
      description: `Tambahkan ${outletLabel()} secara manual.`,
      tone: "error",
    });
  }
}

/**
 * Turns the board's stops into the runs the service commits.
 *
 * Grouped by `(driver, trip)`, which is what a run is. The stop order is the
 * delivery order the dispatcher arranged — `sequence_no` starts at 1 because the
 * service validates `gte=1`, and positions need only be distinct within a run,
 * not contiguous.
 *
 * A run missing a driver or a truck is dropped, not sent half-formed: the
 * service refuses the whole board over one invalid run, and losing a colleague's
 * saved stops because one row was incomplete is the worse failure.
 */
function toTripAssignments(rows: PlanRow[]) {
  const byRun = new Map<string, { driverId: string; vehicleId: string; tripNo: number; stops: { outletId: string; sequenceNo: number }[] }>();

  for (const row of rows) {
    if (!row.driverId || !row.vehicleId) continue;
    const tripNo = row.tripNo ?? 1;
    const key = `${row.driverId}#${tripNo}`;
    const run = byRun.get(key) ?? {
      driverId: row.driverId,
      vehicleId: row.vehicleId,
      tripNo,
      stops: [],
    };
    run.stops.push({ outletId: row.outletId, sequenceNo: run.stops.length + 1 });
    byRun.set(key, run);
  }

  return [...byRun.values()].filter((run) => run.stops.length > 0);
}
