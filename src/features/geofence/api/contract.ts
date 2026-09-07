/**
 * What every geofence adapter must provide.
 *
 * Two things live here because the service keeps them apart and they answer
 * different questions: a *rule* is a fence somebody drew, and an *alert* is a
 * breach recorded against one. Rules are edited rarely and deliberately;
 * alerts arrive on their own and are worked through.
 *
 * # Why a rule's shape is a discriminated pair rather than four loose fields
 *
 * The service refuses a circle carrying a boundary and a polygon carrying a
 * centre, with a 422 naming the field — `rule_type` decides which half of the
 * row may be populated, and `ck_geofence_rules_shape` enforces it underneath.
 * Modelling that as four optional numbers would let the console build a
 * request the server has already said it will reject.
 */

/** One vertex, in the order every mapping API states it. */
export interface LatLng {
  lat: number;
  lng: number;
}

export type GeofenceShapeEntity =
  | { jenis: "Lingkaran"; pusat: LatLng; radiusMeter: number }
  | { jenis: "Poligon"; batas: LatLng[] };

/** What a fence guards. The service's own vocabulary, in the console's words. */
export type GeofenceSubjectEntity =
  | "Rute"
  | "Wilayah outlet"
  | "Depot"
  | "Area terlarang";

/** Alert on leaving the fence, or on entering it. */
export type GeofenceModeEntity = "Keluar" | "Masuk";

export type GeofenceSeverityEntity = "Info" | "Peringatan" | "Kritis";

export interface GeofenceRuleView {
  id: string;
  kode: string;
  nama: string;
  keterangan?: string;
  bentuk: GeofenceShapeEntity;
  subjek: GeofenceSubjectEntity;
  outletId?: string;
  mode: GeofenceModeEntity;
  keparahan: GeofenceSeverityEntity;
  aktif: boolean;
  /**
   * The value the client last read, echoed back on update. Without it the
   * service answers 409 STALE_VERSION, which is the point — two dispatchers
   * editing one fence must not silently overwrite each other.
   */
  version: number;
}

/**
 * A rule as it is written.
 *
 * `bentuk` is absent on an edit that does not move the fence, and `jenis`
 * cannot change at all: swapping a circle for a polygon is a different rule
 * wearing the old one's code, and the service has no field to express it.
 */
export interface GeofenceRuleInput {
  id?: string;
  kode: string;
  nama: string;
  keterangan?: string;
  bentuk?: GeofenceShapeEntity;
  subjek: GeofenceSubjectEntity;
  outletId?: string;
  mode: GeofenceModeEntity;
  keparahan: GeofenceSeverityEntity;
  aktif?: boolean;
}

/**
 * Where an alert is in its life.
 *
 * There is no route back to `Terbuka`: reopening is the evaluator's job, by
 * filing a fresh alert, not an operator's by rewriting an old one. `Selesai`
 * and `Bukan pelanggaran` are both terminal, and the service answers 409 to
 * anything that tries to move on from either.
 */
export type GeofenceAlertStatusEntity =
  | "Terbuka"
  | "Ditinjau"
  | "Selesai"
  | "Bukan pelanggaran";

export interface GeofenceAlertView {
  id: string;
  ruleId: string;
  ruleName?: string;
  pelanggaran: GeofenceModeEntity;
  posisi: LatLng;
  /** How far past the fence the truck was, in metres. */
  jarakMeter?: number;
  terdeteksi: string;
  status: GeofenceAlertStatusEntity;
  driverId?: string;
  catatan?: string;
  version: number;
}

export interface GeofenceAlertFilters {
  /** Omitted shows every alert; the panel defaults to what still needs work. */
  status?: GeofenceAlertStatusEntity | "Semua";
}

export interface GeofenceApi {
  getGeofenceRules(): Promise<GeofenceRuleView[]>;
  createOrUpdateGeofenceRule(input: GeofenceRuleInput): Promise<GeofenceRuleView>;
  removeGeofenceRule(id: string): Promise<void>;

  getGeofenceAlerts(filters?: GeofenceAlertFilters): Promise<GeofenceAlertView[]>;
  /** Acknowledge, resolve, or dismiss. See GeofenceAlertStatusEntity. */
  setGeofenceAlertStatus(input: {
    id: string;
    status: Exclude<GeofenceAlertStatusEntity, "Terbuka">;
    catatan?: string;
  }): Promise<GeofenceAlertView>;
}
