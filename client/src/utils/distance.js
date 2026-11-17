// Distance between the shopper and a store, for the 50 km location check (PRD §6.2).

export const MAX_REPORT_DISTANCE_KM = 50

const EARTH_RADIUS_KM = 6371
const toRadians = (degrees) => (degrees * Math.PI) / 180

/** Straight-line distance in km between two latitude/longitude points (haversine formula). */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/**
 * true when the shopper is more than 50 km from the store.
 * With no shopper location (denied) or no store coordinates there is no check, so false.
 */
export function isTooFarFromStore(shopper, store) {
  if (shopper?.latitude == null || shopper?.longitude == null) return false
  if (store?.latitude == null || store?.longitude == null) return false
  // Supabase returns numeric columns as numbers; Number() also handles strings.
  const km = distanceKm(Number(shopper.latitude), Number(shopper.longitude), Number(store.latitude), Number(store.longitude))
  return km > MAX_REPORT_DISTANCE_KM
}
