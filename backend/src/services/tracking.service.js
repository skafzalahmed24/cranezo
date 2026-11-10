/**
 * Live route of a crane on its way to a job site.
 *
 * One road route is kept per booking. Every new position of the operator is matched to it: the part already
 * driven is cut off, and the km left are measured along the road (not in a straight line). A new route is asked
 * for only when the crane leaves the line by more than OFF_ROUTE_M, the site changes, or the route is older than
 * MAX_AGE_MS, so a crane reporting every few seconds does not call the routing service every few seconds.
 * The time left is always at crane speed (CRANE_SPEED_KMPH, default 25 km/h).
 */
const { placesService, craneSpeedKmph } = require('./places.service');

// a straight line is about this much shorter than the road, used when no route is known
const ROAD_FACTOR = 1.3;
const OFF_ROUTE_M = 150;
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 500;
const live = new Map();

const rad = (d) => (d * Math.PI) / 180;
const meters = (aLat, aLng, bLat, bLng) => {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};
const round1 = (n) => Math.round(n * 10) / 10;
const etaFor = (km) => Math.max(1, Math.round((km / craneSpeedKmph()) * 60));
/** Minutes for a straight-line distance, allowing for the road being longer */
const etaFromStraightKm = (km) => etaFor(km * ROAD_FACTOR);

/** The route point nearest to the crane, and how far the crane is from it */
const nearest = (points, lat, lng) => {
  let best = { i: 0, d: Infinity };
  points.forEach((p, i) => {
    const d = meters(lat, lng, p.latitude, p.longitude);
    if (d < best.d) best = { i, d };
  });
  return best;
};

/** Metres along the road from the crane (at point i) to the end */
const metersLeft = (points, i, lat, lng) => {
  let m = meters(lat, lng, points[i].latitude, points[i].longitude);
  for (let k = i; k < points.length - 1; k += 1) {
    m += meters(points[k].latitude, points[k].longitude, points[k + 1].latitude, points[k + 1].longitude);
  }
  return m;
};

class TrackingService {
  /**
   * { route: [{latitude, longitude}] from the crane to the site, distance_km by road, eta_minutes at crane speed }
   * Never throws: without a route the straight distance (plus the road allowance) is used.
   */
  async liveRoute(bookingId, from, to) {
    const { latitude: lat, longitude: lng } = from;
    const siteKey = `${Number(to.latitude).toFixed(5)},${Number(to.longitude).toFixed(5)}`;
    let entry = live.get(bookingId);
    let hit = null;
    if (entry && entry.siteKey === siteKey && Date.now() - entry.at < MAX_AGE_MS) {
      hit = nearest(entry.points, lat, lng);
      if (hit.d > OFF_ROUTE_M) hit = null;
    }
    if (!hit) {
      const r = await placesService.route({
        from_latitude: lat, from_longitude: lng, to_latitude: to.latitude, to_longitude: to.longitude
      }).catch(() => null);
      if (r && r.points && r.points.length > 1) {
        if (live.size >= MAX_ENTRIES) live.delete(live.keys().next().value);
        entry = { points: r.points, siteKey, at: Date.now(), source: r.source };
        live.set(bookingId, entry);
        hit = nearest(entry.points, lat, lng);
      }
    }
    if (!hit) {
      const km = (meters(lat, lng, Number(to.latitude), Number(to.longitude)) / 1000) * ROAD_FACTOR;
      return { route: [], distance_km: round1(km), eta_minutes: etaFor(km), speed_kmph: craneSpeedKmph(), source: 'estimate' };
    }
    const km = metersLeft(entry.points, hit.i, lat, lng) / 1000;
    return {
      // starts at the crane, so the line never trails behind it
      route: [{ latitude: lat, longitude: lng }, ...entry.points.slice(hit.i + 1)],
      distance_km: round1(km),
      eta_minutes: etaFor(km),
      speed_kmph: craneSpeedKmph(),
      source: entry.source
    };
  }

  forget(bookingId) {
    live.delete(bookingId);
  }
}

module.exports = { trackingService: new TrackingService(), etaFromStraightKm, ROAD_FACTOR };
