var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// maplibre-shim.mjs
var m = globalThis.maplibregl;
var Map2 = m?.Map;
var Marker = m?.Marker;
var Popup = m?.Popup;
var LngLat = m?.LngLat;
var LngLatBounds = m?.LngLatBounds;
var Point = m?.Point;

// node_modules/@watergis/maplibre-gl-terradraw/dist/maplibre-gl-terradraw.es.js
function t() {
  return t = Object.assign ? Object.assign.bind() : function(e) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var r2 in n2) ({}).hasOwnProperty.call(n2, r2) && (e[r2] = n2[r2]);
    }
    return e;
  }, t.apply(null, arguments);
}
var n = "draw";
var r = "edit";
var i = "deleteCoordinate";
var a = "insertMidpoint";
var o;
(function(e) {
  e.Commit = "commit", e.Provisional = "provisional", e.Finish = "finish";
})(o || (o = {}));
var s = "https://raw.githubusercontent.com/JamesLMilner/terra-draw/refs/heads/main/assets/markers/marker-blue.png";
var c = {
  SELECTED: "selected",
  MID_POINT: "midPoint",
  SELECTION_POINT_FEATURE_ID: "selectionPointFeatureId",
  SELECTION_POINT: "selectionPoint"
};
var l = {
  MODE: "mode",
  CURRENTLY_DRAWING: "currentlyDrawing",
  EDITED: "edited",
  CLOSING_POINT: "closingPoint",
  SNAPPING_POINT: "snappingPoint",
  COORDINATE_POINT: "coordinatePoint",
  COORDINATE_POINT_FEATURE_ID: "coordinatePointFeatureId",
  COORDINATE_POINT_IDS: "coordinatePointIds",
  PROVISIONAL_COORDINATE_COUNT: "provisionalCoordinateCount",
  COMMITTED_COORDINATE_COUNT: "committedCoordinateCount",
  MARKER: "marker"
};
var u = 10;
function d(e) {
  return !!(e && typeof e == "object" && e && !Array.isArray(e));
}
function f(e) {
  return !!(e && typeof e == "object" && "properties" in e && typeof e.properties == "object" && e.properties !== null && "mode" in e.properties);
}
function p(e) {
  return !!(function(e2) {
    return typeof e2 == "number" && !isNaN(new Date(e2).valueOf());
  })(e);
}
var m2 = "Feature mode property does not match the mode being added to";
var h;
(function(e) {
  e.Drawing = "drawing", e.Select = "select", e.Static = "static", e.Render = "render";
})(h || (h = {}));
var g = {
  rightClick: true,
  contextMenu: false,
  leftClick: true,
  onDragStart: true,
  onDrag: true,
  onDragEnd: true
};
var _ = class {
  get state() {
    return this._state;
  }
  set state(e) {
    throw Error("Please use the modes lifecycle methods");
  }
  get styles() {
    return this._styles;
  }
  set styles(e) {
    if (typeof e != "object") throw Error("Styling must be an object");
    this.onStyleChange && this.onStyleChange([], "styling"), this._styles = e;
  }
  registerBehaviors(e) {
  }
  constructor(e, n2 = false) {
    this._state = "unregistered", this._styles = {}, this.pointerEvents = g, this.behaviors = [], this.validate = void 0, this.pointerDistance = 40, this.coordinatePrecision = void 0, this.undoRedoMaxStackSize = void 0, this.onStyleChange = void 0, this.store = void 0, this.projection = "web-mercator", this.setDoubleClickToZoom = void 0, this.unproject = void 0, this.project = void 0, this.setCursor = void 0, this.isInitialUpdate = false, this.type = h.Drawing, this.mode = "base", n2 ? this.isInitialUpdate = true : this.updateOptions(t({}, e));
  }
  updateOptions(e) {
    e != null && e.styles && (this.styles = t({}, this._styles, e.styles)), e?.pointerDistance !== void 0 && (this.pointerDistance = e.pointerDistance), e != null && e.validation && (this.validate = e && e.validation), e != null && e.projection && (this.projection = e.projection), e?.pointerEvents !== void 0 && (this.pointerEvents = e.pointerEvents), e != null && e.modeName && true === this.isInitialUpdate && (this.mode = e.modeName), this.isInitialUpdate = false;
  }
  allowPointerEvent(e, t2) {
    return typeof e == "boolean" ? e : typeof e != "function" || e(t2);
  }
  setDrawing() {
    if (this._state !== "started") throw Error("Mode must be unregistered or stopped to start");
    this._state = "drawing";
  }
  setStarted() {
    if (this._state !== "stopped" && this._state !== "registered" && this._state !== "drawing" && this._state !== "selecting") throw Error("Mode must be unregistered or stopped to start");
    this._state = "started", this.setDoubleClickToZoom(false);
  }
  setStopped() {
    if (this._state !== "started") throw Error("Mode must be started to be stopped");
    this._state = "stopped", this.setDoubleClickToZoom(true);
  }
  register(e) {
    if (this._state !== "unregistered") throw Error("Can not register unless mode is unregistered");
    this._state = "registered", this.store = e.store, this.store.registerOnChange(e.onChange), this.setDoubleClickToZoom = e.setDoubleClickToZoom, this.project = e.project, this.unproject = e.unproject, this.onSelect = e.onSelect, this.onDeselect = e.onDeselect, this.setCursor = e.setCursor, this.onStyleChange = e.onChange, this.onFinish = e.onFinish, this.coordinatePrecision = e.coordinatePrecision, this.undoRedoMaxStackSize = e.undoRedoMaxStackSize, this.registerBehaviors({
      mode: e.mode,
      store: this.store,
      project: this.project,
      unproject: this.unproject,
      pointerDistance: this.pointerDistance,
      coordinatePrecision: e.coordinatePrecision,
      projection: this.projection,
      undoRedoMaxStackSize: e.undoRedoMaxStackSize
    });
  }
  validateFeature(e) {
    return this.performFeatureValidation(e);
  }
  afterFeatureAdded(e) {
  }
  afterFeatureUpdated(e) {
  }
  performFeatureValidation(e) {
    if (this._state === "unregistered") throw Error("Mode must be registered");
    let t2 = (function(e2, t3) {
      let n2;
      if (d(e2)) if (e2.id == null) n2 = "Feature has no id";
      else if (typeof e2.id != "string" && typeof e2.id != "number") n2 = "Feature must be string or number as per GeoJSON spec";
      else if (t3(e2.id)) if (d(e2.geometry)) if (d(e2.properties)) if (typeof e2.geometry.type == "string" && [
        "Polygon",
        "LineString",
        "Point"
      ].includes(e2.geometry.type)) if (Array.isArray(e2.geometry.coordinates)) {
        if (!e2.properties.mode || typeof e2.properties.mode != "string") return {
          valid: false,
          reason: "Feature does not have a valid mode property"
        };
      } else n2 = "Feature coordinates is not an array";
      else n2 = "Feature is not Point, LineString or Polygon";
      else n2 = "Feature has no properties";
      else n2 = "Feature has no geometry";
      else n2 = "Feature must match the id strategy (default is UUID4)";
      else n2 = "Feature is not object";
      return n2 ? {
        valid: false,
        reason: n2
      } : { valid: true };
    })(e, this.store.idStrategy.isValidId);
    if (!t2.valid) return t2;
    if (this.validate) {
      let n2 = this.validate(e, {
        project: this.project,
        unproject: this.unproject,
        coordinatePrecision: this.coordinatePrecision,
        updateType: o.Provisional
      });
      return {
        valid: t2.valid && n2.valid,
        reason: n2.reason
      };
    }
    return {
      valid: t2.valid,
      reason: t2.reason
    };
  }
  validateModeFeature(e, t2) {
    let n2 = this.performFeatureValidation(e);
    return n2.valid ? e.properties.mode === this.mode ? t2(e) : {
      valid: false,
      reason: m2
    } : {
      valid: false,
      reason: n2.reason
    };
  }
  onFinish(e, t2) {
  }
  onDeselect(e) {
  }
  onSelect(e) {
  }
  onKeyDown(e) {
  }
  onKeyUp(e) {
  }
  undo() {
  }
  clearHistory() {
  }
  undoSize() {
    return 0;
  }
  redoSize() {
    return 0;
  }
  redo() {
  }
  onMouseMove(e) {
  }
  onClick(e) {
  }
  onDragStart(e, t2) {
  }
  onDrag(e, t2) {
  }
  onDragEnd(e, t2) {
  }
  getHexColorStylingValue(e, t2, n2) {
    return this.getStylingValue(e, t2, n2);
  }
  getNumericStylingValue(e, t2, n2) {
    return this.getStylingValue(e, t2, n2);
  }
  getUrlStylingValue(e, t2, n2) {
    return this.getStylingValue(e, t2, n2);
  }
  getStylingValue(e, t2, n2) {
    return e === void 0 ? t2 : typeof e == "function" ? (r2 = e(n2)) ?? t2 : e;
    var r2;
  }
};
var v = class extends _ {
  constructor(...e) {
    super(...e), this.type = h.Select;
  }
};
function y(e, t2) {
  let n2 = (e2) => e2 * Math.PI / 180, r2 = n2(e[1]), i2 = n2(e[0]), a2 = n2(t2[1]), o2 = a2 - r2, s2 = n2(t2[0]) - i2, c2 = Math.sin(o2 / 2) * Math.sin(o2 / 2) + Math.cos(r2) * Math.cos(a2) * Math.sin(s2 / 2) * Math.sin(s2 / 2);
  return 2 * Math.atan2(Math.sqrt(c2), Math.sqrt(1 - c2)) * 6371e3 / 1e3;
}
var b = 63710088e-1;
function x(e) {
  return e % 360 * Math.PI / 180;
}
function ee(e) {
  return e / 6371.0088;
}
function S(e) {
  return e % (2 * Math.PI) * 180 / Math.PI;
}
function C(e, t2 = 9) {
  let n2 = 10 ** t2;
  return Math.round(e * n2) / n2;
}
var te = 57.29577951308232;
var w = 0.017453292519943295;
var ne = 6378137;
var T = (e, t2) => ({
  x: e === 0 ? 0 : e * w * ne,
  y: t2 === 0 ? 0 : Math.log(Math.tan(Math.PI / 4 + t2 * w / 2)) * ne
});
var E = (e, t2) => ({
  lng: e === 0 ? 0 : e / ne * te,
  lat: t2 === 0 ? 0 : (2 * Math.atan(Math.exp(t2 / ne)) - Math.PI / 2) * te
});
function re(e, t2, n2) {
  let r2 = x(e[0]), i2 = x(e[1]), a2 = x(n2), o2 = ee(t2), s2 = Math.asin(Math.sin(i2) * Math.cos(o2) + Math.cos(i2) * Math.sin(o2) * Math.cos(a2));
  return [S(r2 + Math.atan2(Math.sin(a2) * Math.sin(o2) * Math.cos(i2), Math.cos(o2) - Math.sin(i2) * Math.sin(s2))), S(s2)];
}
function ie(e) {
  let { center: t2, radiusKilometers: n2, coordinatePrecision: r2 } = e, i2 = e.steps ? e.steps : 64, a2 = [];
  for (let e2 = 0; e2 < i2; e2++) {
    let o2 = re(t2, n2, -360 * e2 / i2);
    a2.push([C(o2[0], r2), C(o2[1], r2)]);
  }
  return a2.push(a2[0]), {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [a2]
    },
    properties: {}
  };
}
function ae(e) {
  let t2;
  if (e.geometry.type === "Polygon") t2 = e.geometry.coordinates;
  else {
    if (e.geometry.type !== "LineString") throw Error("Self intersects only accepts Polygons and LineStrings");
    t2 = [e.geometry.coordinates];
  }
  let n2 = [];
  for (let e2 = 0; e2 < t2.length; e2++) for (let n3 = 0; n3 < t2[e2].length - 1; n3++) for (let r3 = 0; r3 < t2.length; r3++) for (let a2 = 0; a2 < t2[r3].length - 1; a2++) i2(e2, n3, r3, a2);
  return n2.length > 0;
  function r2(e2) {
    return e2 < 0 || e2 > 1;
  }
  function i2(e2, i3, a2, o2) {
    let s2 = t2[e2][i3], c2 = t2[e2][i3 + 1], l2 = t2[a2][o2], u2 = t2[a2][o2 + 1], d2 = (function(e3, t3, n3, r3) {
      if (oe(e3, n3) || oe(e3, r3) || oe(t3, n3) || oe(r3, n3)) return null;
      let i4 = e3[0], a3 = e3[1], o3 = t3[0], s3 = t3[1], c3 = n3[0], l3 = n3[1], u3 = r3[0], d3 = r3[1], f3 = (i4 - o3) * (l3 - d3) - (a3 - s3) * (c3 - u3);
      return f3 === 0 ? null : [((i4 * s3 - a3 * o3) * (c3 - u3) - (i4 - o3) * (c3 * d3 - l3 * u3)) / f3, ((i4 * s3 - a3 * o3) * (l3 - d3) - (a3 - s3) * (c3 * d3 - l3 * u3)) / f3];
    })(s2, c2, l2, u2);
    if (d2 === null) return;
    let f2, p2;
    f2 = c2[0] === s2[0] ? (d2[1] - s2[1]) / (c2[1] - s2[1]) : (d2[0] - s2[0]) / (c2[0] - s2[0]), p2 = u2[0] === l2[0] ? (d2[1] - l2[1]) / (u2[1] - l2[1]) : (d2[0] - l2[0]) / (u2[0] - l2[0]), r2(f2) || r2(p2) || (d2.toString(), n2.push(d2));
  }
}
function oe(e, t2) {
  return e[0] === t2[0] && e[1] === t2[1];
}
function se(e, t2) {
  return le(e[0]) <= t2 && le(e[1]) <= t2;
}
function ce(e) {
  return e.length === 2 && typeof e[0] == "number" && typeof e[1] == "number" && e[0] !== Infinity && e[1] !== Infinity && (n2 = e[0]) >= -180 && n2 <= 180 && (t2 = e[1]) >= -90 && t2 <= 90;
  var t2, n2;
}
function le(e) {
  let t2 = 1, n2 = 0;
  for (; Math.round(e * t2) / t2 !== e; ) t2 *= 10, n2++;
  return n2;
}
var ue = "Feature has holes";
var de = "Feature has less than 4 coordinates";
var fe = "Feature has invalid coordinates";
var pe = "Feature coordinates are not closed";
function me(e, t2) {
  if (e.geometry.type !== "Polygon") return {
    valid: false,
    reason: "Feature is not a Polygon"
  };
  if (e.geometry.coordinates.length !== 1) return {
    valid: false,
    reason: ue
  };
  if (e.geometry.coordinates[0].length < 4) return {
    valid: false,
    reason: de
  };
  for (let n3 = 0; n3 < e.geometry.coordinates[0].length; n3++) {
    if (!ce(e.geometry.coordinates[0][n3])) return {
      valid: false,
      reason: fe
    };
    if (!se(e.geometry.coordinates[0][n3], t2)) return {
      valid: false,
      reason: "Feature has coordinates with excessive precision"
    };
  }
  return (n2 = e.geometry.coordinates[0][0])[0] !== (r2 = e.geometry.coordinates[0][e.geometry.coordinates[0].length - 1])[0] || n2[1] !== r2[1] ? {
    valid: false,
    reason: pe
  } : { valid: true };
  var n2, r2;
}
function he(e, t2) {
  let n2 = me(e, t2);
  return n2.valid ? ae(e) ? {
    valid: false,
    reason: "Feature intersects itself"
  } : { valid: true } : n2;
}
var D = class {
  constructor({ store: e, mode: t2, project: n2, unproject: r2, pointerDistance: i2, coordinatePrecision: a2, projection: o2, undoRedoMaxStackSize: s2 }) {
    this.store = void 0, this.mode = void 0, this.project = void 0, this.unproject = void 0, this.pointerDistance = void 0, this.coordinatePrecision = void 0, this.projection = void 0, this.undoRedoMaxStackSize = void 0, this.store = e, this.mode = t2, this.project = n2, this.unproject = r2, this.pointerDistance = i2, this.coordinatePrecision = a2, this.projection = o2, this.undoRedoMaxStackSize = s2;
  }
};
function ge(e) {
  if (!(function(e2) {
    let t2 = e2.coordinates[0], n2 = 0;
    for (let e3 = 0; e3 < t2.length - 1; e3++) {
      let [r2, i2] = t2[e3], [a2, o2] = t2[e3 + 1];
      n2 += (a2 - r2) * (o2 + i2);
    }
    return n2 < 0;
  })(e)) return {
    type: "Polygon",
    coordinates: [e.coordinates[0].reverse()]
  };
}
var _e = "insert-before";
var O = "insert-after";
var k = "update";
var A = "delete";
var j = "replace";
var M = class extends D {
  constructor(e, t2) {
    super(e), this.options = void 0, this.options = t2;
  }
  createPoint({ coordinates: e, properties: t2, context: n2 }) {
    if (n2?.updateType !== o.Finish || this.validateGeometryWithUpdateType({
      geometry: {
        type: "Point",
        coordinates: e
      },
      properties: t2,
      updateType: o.Finish
    })) return this.handleCreateFeature({
      geometry: {
        type: "Point",
        coordinates: e
      },
      properties: t2
    });
  }
  createLineString({ coordinates: e, properties: t2 }) {
    return this.handleCreateFeature({
      geometry: {
        type: "LineString",
        coordinates: e
      },
      properties: t2
    });
  }
  createPolygon({ coordinates: e, properties: t2, context: n2 }) {
    let r2 = ge({
      type: "Polygon",
      coordinates: [e]
    }), i2 = {
      type: "Polygon",
      coordinates: r2 ? r2.coordinates : [e]
    };
    if (n2?.updateType !== o.Finish || this.validateGeometryWithUpdateType({
      geometry: i2,
      properties: t2,
      updateType: o.Finish
    })) return this.handleCreateFeature({
      geometry: i2,
      properties: t2
    });
  }
  createGuidancePoint({ coordinate: e, type: t2 }) {
    return this.createGuidancePoints({
      coordinates: [e],
      type: t2
    })[0];
  }
  createGuidancePoints({ coordinates: e, type: n2, additionalProperties: r2 }) {
    let i2 = e.map((e2, i3) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: e2
      },
      properties: t({
        mode: this.mode,
        [n2]: true
      }, r2 ? r2(i3) : {})
    }));
    return this.createFeatures(i2);
  }
  updatePoint({ featureId: e, coordinateMutations: t2, propertyMutations: n2, context: r2 }) {
    return this.handleMutateFeature({
      type: "Point",
      featureId: e,
      coordinateMutations: t2,
      propertyMutations: n2,
      context: r2
    });
  }
  updatePolygon({ featureId: e, coordinateMutations: t2, context: n2, propertyMutations: r2 }) {
    return this.handleMutateFeature({
      type: "Polygon",
      featureId: e,
      coordinateMutations: t2,
      propertyMutations: r2,
      context: n2
    });
  }
  updateLineString({ featureId: e, coordinateMutations: t2, context: n2, propertyMutations: r2 }) {
    return this.handleMutateFeature({
      type: "LineString",
      featureId: e,
      coordinateMutations: t2,
      propertyMutations: r2,
      context: n2
    });
  }
  deleteFeatureIfPresent(e) {
    e && this.store.has(e) && this.store.delete([e]);
  }
  deleteFeaturesIfPresent(e) {
    if (e.length === 0) return;
    let t2 = e.filter((e2) => this.store.has(e2));
    t2.length && this.store.delete(t2);
  }
  setDeselected(e) {
    let t2 = e.filter((e2) => this.store.has(e2)).map((e2) => ({
      featureId: e2,
      properties: { [c.SELECTED]: false }
    }));
    this.updateFeatureProperties(t2);
  }
  setSelected(e) {
    let { type: t2 } = this.store.getGeometryCopy(e), n2 = {
      featureId: e,
      propertyMutations: { [c.SELECTED]: true },
      context: { updateType: o.Commit }
    };
    t2 === "Polygon" ? this.updatePolygon(n2) : t2 === "LineString" ? this.updateLineString(n2) : t2 === "Point" && this.updatePoint(n2);
  }
  updateGuidancePoints(e) {
    this.updateFeatureGeometries(e.map(({ featureId: e2, coordinate: t2 }) => ({
      id: e2,
      geometry: {
        type: "Point",
        coordinates: t2
      }
    })));
  }
  handleCreateFeature({ geometry: e, properties: t2 }) {
    return this.createFeatureWithGeometry({
      geometry: e,
      properties: t2
    });
  }
  handleMutateFeature({ type: e, featureId: n2, coordinateMutations: r2, propertyMutations: i2, context: a2 }) {
    if (!this.mutateFeature({
      type: e,
      featureId: n2,
      coordinateMutations: r2,
      propertyMutations: i2,
      context: a2.updateType === o.Finish ? t({}, a2, { correctRightHandRule: true }) : t({}, a2)
    })) return null;
    let s2 = this.buildFeatureWithGeometry(n2);
    return a2.updateType !== o.Finish || r2 || this.validateGeometryWithUpdateType({
      geometry: s2.geometry,
      properties: s2.properties,
      updateType: a2.updateType
    }) ? s2 : null;
  }
  mutateFeature({ type: e, featureId: t2, coordinateMutations: n2, propertyMutations: r2, context: i2 }) {
    if (!t2) return false;
    let a2 = this.store.getGeometryCopy(t2), o2 = this.store.getPropertiesCopy(t2);
    if (a2.type !== e) throw Error(`${e} geometries cannot be updated on features with ${a2.type} geometries`);
    if (n2) {
      let e2 = this.applyCoordinateMutations(a2, n2);
      if (i2.correctRightHandRule && e2.type === "Polygon") {
        let t3 = ge(e2);
        t3 && (e2 = t3);
      }
      if (!this.validateGeometryWithUpdateType({
        geometry: e2,
        properties: o2,
        updateType: i2.updateType
      })) return false;
      this.updateFeatureGeometries([{
        id: t2,
        geometry: e2
      }]);
    }
    return r2 && this.updateFeatureProperties([{
      featureId: t2,
      properties: r2
    }]), true;
  }
  applyCoordinateMutations(e, n2) {
    if (this.isReplaceMutation(n2)) return t({}, e, { coordinates: n2.coordinates });
    if (e.type === "Point") throw Error("Coordinate mutations are not supported for Point geometries");
    let r2 = e.type === "Polygon", i2 = r2 ? e.coordinates[0].slice() : e.coordinates.slice(), a2 = i2.length, o2 = (e2) => {
      let t2 = e2 < 0 ? a2 + e2 : e2;
      if (t2 < 0 || t2 >= a2) throw RangeError(`Index ${e2} (normalized to ${t2}) is out of bounds`);
      return t2;
    }, s2 = Array(a2).fill(void 0), c2 = Array.from({ length: a2 }, () => []), l2 = Array.from({ length: a2 }, () => []), u2 = [];
    for (let e2 of n2) {
      if (e2.type === _e || e2.type === O) {
        let t2 = e2.index, n4 = t2 < 0 ? a2 + t2 : t2;
        if (n4 < 0 || n4 > a2) throw RangeError(`Index ${e2.index} (normalized to ${n4}) is out of bounds`);
        if (e2.type === _e) {
          if (n4 >= a2) throw RangeError(`INSERT_BEFORE index ${e2.index} (normalized to ${n4}) is out of bounds for length ${a2}`);
          c2[n4].push(e2);
        } else n4 === a2 ? u2.push(e2) : l2[n4].push(e2);
        continue;
      }
      let n3 = o2(e2.index);
      s2[n3] = t({}, e2, { index: n3 });
    }
    let d2 = [];
    for (let e2 = 0; e2 < a2; e2++) {
      let t2 = c2[e2];
      for (let e3 of t2) d2.push(e3.coordinate);
      let n3 = s2[e2];
      n3 ? n3.type === A || d2.push(n3.coordinate) : d2.push(i2[e2]);
      let r3 = l2[e2];
      for (let e3 of r3) d2.push(e3.coordinate);
    }
    for (let e2 of u2) d2.push(e2.coordinate);
    return t({}, e, r2 ? { coordinates: [d2, ...e.coordinates.slice(1)] } : { coordinates: d2 });
  }
  isReplaceMutation(e) {
    return e.type === j;
  }
  createFeatureWithGeometry({ geometry: e, properties: t2 }) {
    let [n2] = this.createFeatures([{
      type: "Feature",
      geometry: e,
      properties: t2
    }]);
    return {
      id: n2,
      type: "Feature",
      properties: this.store.getPropertiesCopy(n2),
      geometry: this.store.getGeometryCopy(n2)
    };
  }
  validateGeometryWithUpdateType({ geometry: e, properties: t2, updateType: n2 }) {
    return !this.options.validate || this.options.validate({
      type: "Feature",
      geometry: e,
      properties: t2 || {}
    }, {
      project: this.project,
      unproject: this.unproject,
      coordinatePrecision: this.coordinatePrecision,
      updateType: n2
    }).valid;
  }
  buildFeatureWithGeometry(e) {
    return {
      id: e,
      type: "Feature",
      properties: this.store.getPropertiesCopy(e),
      geometry: this.store.getGeometryCopy(e)
    };
  }
  createFeatures(e) {
    return this.store.create(e);
  }
  updateFeatureGeometries(e) {
    this.store.updateGeometry(e);
  }
  updateFeatureProperties(e) {
    let t2 = e.map(({ featureId: e2, properties: t3 }) => Object.entries(t3).map(([t4, n2]) => ({
      id: e2,
      property: t4,
      value: n2
    }))).flat();
    this.store.updateProperty(t2);
  }
};
var ve = {
  cancel: "Escape",
  finish: "Enter"
};
var ye = { start: "crosshair" };
var be = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "circle", this.center = void 0, this.endPosition = void 0, this.segments = 64, this.currentCircleId = void 0, this.keyEvents = ve, this.cursors = ye, this.startingRadiusKilometers = 1e-5, this.cursorMovedAfterInitialCursorDown = false, this.drawInteraction = "click-move", this.drawType = void 0, this.mutateFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.startingRadiusKilometers && (this.startingRadiusKilometers = e.startingRadiusKilometers), e != null && e.drawInteraction && (this.drawInteraction = e.drawInteraction), e != null && e.segments && (this.segments = e.segments < 3 ? 3 : e.segments);
  }
  close() {
    if (this.currentCircleId === void 0 || this.endPosition === void 0 || !this.updateCircle(this.endPosition, o.Finish)) return;
    let e = this.currentCircleId;
    this.cursorMovedAfterInitialCursorDown = false, this.center = void 0, this.currentCircleId = void 0, this.drawType = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  beginDrawing(e, t2 = "click") {
    this.center = [e.lng, e.lat], this.endPosition = [e.lng, e.lat];
    let n2 = ie({
      center: this.center,
      radiusKilometers: this.startingRadiusKilometers,
      coordinatePrecision: this.coordinatePrecision
    }), r2 = this.mutateFeature.createPolygon({
      coordinates: n2.geometry.coordinates[0],
      properties: {
        mode: this.mode,
        radiusKilometers: this.startingRadiusKilometers,
        [l.CURRENTLY_DRAWING]: true
      }
    });
    r2 && (this.currentCircleId = r2.id, this.cursorMovedAfterInitialCursorDown = false, this.drawType = t2, this.setDrawing());
  }
  dragDrawAllowed() {
    return this.drawInteraction === "click-drag" || this.drawInteraction === "click-move-or-drag";
  }
  moveDrawAllowed() {
    return this.drawInteraction === "click-move" || this.drawInteraction === "click-move-or-drag";
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onClick(e) {
    this.moveDrawAllowed() && (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) && (this.center ? this.center && this.currentCircleId !== void 0 && (this.endPosition = [e.lng, e.lat], this.close()) : this.beginDrawing(e));
  }
  onMouseMove(e) {
    this.cursorMovedAfterInitialCursorDown = true, this.endPosition = [e.lng, e.lat], this.updateCircle(this.endPosition, o.Provisional);
  }
  onKeyDown() {
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && this.close();
  }
  onDragStart(e, t2) {
    this.state !== "drawing" && this.allowPointerEvent(this.pointerEvents.onDragStart, e) && this.dragDrawAllowed() && (this.beginDrawing(e, "drag"), t2(false));
  }
  onDrag(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDrag, e) && this.dragDrawAllowed() && this.drawType === "drag" && (this.cursorMovedAfterInitialCursorDown = true, this.endPosition = [e.lng, e.lat], this.updateCircle(this.endPosition, o.Provisional));
  }
  onDragEnd(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDragEnd, e) && this.dragDrawAllowed() && this.drawType === "drag" && (this.endPosition = [e.lng, e.lat], this.close(), t2(true));
  }
  cleanUp() {
    let e = this.currentCircleId;
    this.center = void 0, this.currentCircleId = void 0, this.drawType = void 0, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e);
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.type === "Feature" && e.geometry.type === "Polygon" && e.properties.mode === this.mode ? (n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u, n2) : n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => he(e2, this.coordinatePrecision));
  }
  updateCircle(e, t2) {
    if (this.currentCircleId === void 0 || this.center === void 0) return;
    let r2 = t2 === o.Finish, i2, a2;
    if (this.cursorMovedAfterInitialCursorDown) if (a2 = y(this.center, e), this.projection === "web-mercator") {
      let t3 = (function(e2, t4) {
        let n2 = 1e3 * y(e2, t4);
        if (n2 === 0) return 1;
        let { x: r3, y: i3 } = T(e2[0], e2[1]), { x: a3, y: o2 } = T(t4[0], t4[1]);
        return Math.sqrt((a3 - r3) ** 2 + (o2 - i3) ** 2) / n2;
      })(this.center, e);
      i2 = (function(e2) {
        let { center: t4, radiusKilometers: n2, coordinatePrecision: r3 } = e2, i3 = e2.steps ? e2.steps : 64, a3 = 1e3 * n2, [o2, s3] = t4, { x: c2, y: l2 } = T(o2, s3), u2 = [];
        for (let e3 = 0; e3 < i3; e3++) {
          let t5 = 360 * e3 / i3 * Math.PI / 180, n3 = a3 * Math.cos(t5), o3 = a3 * Math.sin(t5), [s4, d2] = [c2 + n3, l2 + o3], { lng: f2, lat: p2 } = E(s4, d2);
          u2.push([C(f2, r3), C(p2, r3)]);
        }
        return u2.push(u2[0]), {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [u2]
          },
          properties: {}
        };
      })({
        center: this.center,
        radiusKilometers: a2 * t3,
        coordinatePrecision: this.coordinatePrecision,
        steps: this.segments
      });
    } else {
      if (this.projection !== "globe") throw Error("Invalid projection");
      i2 = ie({
        center: this.center,
        radiusKilometers: a2,
        coordinatePrecision: this.coordinatePrecision,
        steps: this.segments
      });
    }
    let s2 = {};
    return i2 && a2 && (s2.radiusKilometers = a2), r2 && (s2[l.CURRENTLY_DRAWING] = void 0), this.mutateFeature.updatePolygon({
      featureId: this.currentCircleId,
      coordinateMutations: i2 ? {
        type: j,
        coordinates: i2.geometry.coordinates
      } : void 0,
      propertyMutations: s2,
      context: r2 ? {
        updateType: t2,
        action: n
      } : { updateType: t2 }
    });
  }
  afterFeatureUpdated(e) {
    this.currentCircleId === e.id && (this.cursorMovedAfterInitialCursorDown = false, this.center = void 0, this.currentCircleId = void 0, this.drawType = void 0, this.state === "drawing" && this.setStarted());
  }
  registerBehaviors(e) {
    this.mutateFeature = new M(e, { validate: this.validate });
  }
};
var N = (e, t2) => {
  let { x: n2, y: r2 } = e, { x: i2, y: a2 } = t2, o2 = i2 - n2, s2 = a2 - r2;
  return Math.sqrt(s2 * s2 + o2 * o2);
};
function xe(e, t2) {
  return e[0] === t2[0] && e[1] === t2[1];
}
var P = class extends D {
  constructor(e) {
    super(e);
  }
  getGeometryType(e) {
    return this.store.getGeometryCopy(e).type;
  }
  coordinateAtIndexIsIdentical({ featureId: e, newCoordinate: t2, index: n2 }) {
    let r2 = this.store.getGeometryCopy(e), i2;
    if (r2.type === "Polygon") i2 = r2.coordinates[0][n2];
    else if (r2.type === "LineString") i2 = r2.coordinates[n2];
    else {
      if (n2 !== 0) throw Error("Point geometries only have one coordinate at index 0");
      i2 = r2.coordinates;
    }
    return xe(t2, i2);
  }
  getGeometry(e) {
    return this.store.getGeometryCopy(e);
  }
  getCoordinates(e) {
    let { type: t2, coordinates: n2 } = this.store.getGeometryCopy(e);
    return t2 === "Polygon" ? n2[0] : n2;
  }
  getCoordinate(e, t2) {
    let n2 = this.getCoordinates(e), r2 = t2 < 0 ? n2.length + t2 : t2;
    if (r2 < 0 || r2 >= n2.length) throw RangeError(`Index ${t2} (normalized to ${r2}) is out of bounds`);
    return n2[r2];
  }
  getProperties(e) {
    return this.store.getPropertiesCopy(e);
  }
  hasFeature(e) {
    return this.store.has(e);
  }
  getAllFeatureIdsWhere(e) {
    return this.store.copyAllWhere(e).map(({ id: e2 }) => e2);
  }
};
var Se = {
  cancel: "Escape",
  finish: "Enter"
};
var Ce = {
  start: "crosshair",
  close: "pointer"
};
var we = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "freehand", this.canClose = false, this.currentId = void 0, this.closingPointId = void 0, this.minDistance = 20, this.keyEvents = Se, this.cursors = Ce, this.preventPointsNearClose = true, this.autoClose = false, this.autoCloseTimeout = 500, this.hasLeftStartingPoint = false, this.preventNewFeature = false, this.drawInteraction = "click-move", this.drawType = void 0, this.smoothing = 0, this.mutateFeature = void 0, this.readFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.minDistance && (this.minDistance = e.minDistance), e?.smoothing !== void 0 && (this.smoothing = Math.min(Math.max(e.smoothing, 0), 0.999)), e?.preventPointsNearClose !== void 0 && (this.preventPointsNearClose = e.preventPointsNearClose), e?.autoClose !== void 0 && (this.autoClose = e.autoClose), e != null && e.autoCloseTimeout && (this.autoCloseTimeout = e.autoCloseTimeout), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e != null && e.drawInteraction && (this.drawInteraction = e.drawInteraction);
  }
  moveDrawAllowed() {
    return this.drawInteraction === "click-move" || this.drawInteraction === "click-move-or-drag";
  }
  dragDrawAllowed() {
    return this.drawInteraction === "click-drag" || this.drawInteraction === "click-move-or-drag";
  }
  beginDrawing(e, t2 = "click") {
    let { id: n2 } = this.mutateFeature.createPolygon({
      coordinates: [
        [e.lng, e.lat],
        [e.lng, e.lat],
        [e.lng, e.lat],
        [e.lng, e.lat]
      ],
      properties: {
        mode: this.mode,
        [l.CURRENTLY_DRAWING]: true
      }
    });
    this.currentId = n2, this.drawType = t2, this.closingPointId = this.mutateFeature.createGuidancePoint({
      coordinate: [e.lng, e.lat],
      type: l.CLOSING_POINT
    }), this.canClose = true, this.state !== "drawing" && this.setDrawing();
  }
  addCoordinate(e) {
    if (this.currentId === void 0 || false === this.canClose) return void this.setCursor(this.cursors.start);
    let [t2, n2] = this.readFeature.getCoordinate(this.currentId, -2), { x: r2, y: i2 } = this.project(t2, n2), a2 = N({
      x: r2,
      y: i2
    }, {
      x: e.containerX,
      y: e.containerY
    }), [s2, c2] = this.readFeature.getCoordinate(this.currentId, 0), { x: l2, y: u2 } = this.project(s2, c2);
    if (N({
      x: l2,
      y: u2
    }, {
      x: e.containerX,
      y: e.containerY
    }) < this.pointerDistance) {
      if (this.autoClose && this.hasLeftStartingPoint && (this.preventNewFeature = true, setTimeout(() => {
        this.preventNewFeature = false;
      }, this.autoCloseTimeout), this.close()), this.setCursor(this.cursors.close), this.preventPointsNearClose) return;
    } else this.hasLeftStartingPoint = true, this.setCursor(this.cursors.start);
    if (a2 < this.minDistance) return;
    let d2 = this.getSmoothedCoordinate([t2, n2], [e.lng, e.lat]);
    this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      coordinateMutations: [{
        type: _e,
        index: -1,
        coordinate: d2
      }],
      context: { updateType: o.Provisional }
    });
  }
  getSmoothedCoordinate(e, t2) {
    if (this.smoothing === 0) return t2;
    let [n2, r2] = e, [i2, a2] = t2;
    return [n2 * this.smoothing + i2 * (1 - this.smoothing), r2 * this.smoothing + a2 * (1 - this.smoothing)];
  }
  close() {
    if (this.currentId === void 0 || !this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 },
      context: {
        updateType: o.Finish,
        action: n
      }
    })) return;
    let e = this.currentId;
    this.mutateFeature.deleteFeatureIfPresent(this.closingPointId), this.canClose = false, this.currentId = void 0, this.closingPointId = void 0, this.hasLeftStartingPoint = false, this.drawType = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onMouseMove(e) {
    this.moveDrawAllowed() && this.drawType === "click" && this.addCoordinate(e);
  }
  onClick(e) {
    if (this.moveDrawAllowed() && (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e))) {
      if (this.preventNewFeature) return;
      if (false === this.canClose) return void this.beginDrawing(e);
      this.close();
    }
  }
  onKeyDown() {
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && true === this.canClose && this.close();
  }
  onDragStart(e, t2) {
    this.state !== "drawing" && (this.preventNewFeature || this.allowPointerEvent(this.pointerEvents.onDragStart, e) && this.dragDrawAllowed() && (this.beginDrawing(e, "drag"), t2(false)));
  }
  onDrag(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDrag, e) && this.dragDrawAllowed() && this.drawType === "drag" && this.addCoordinate(e);
  }
  onDragEnd(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDragEnd, e) && this.dragDrawAllowed() && this.drawType === "drag" && (this.preventNewFeature = true, setTimeout(() => {
      this.preventNewFeature = false;
    }, this.autoCloseTimeout), this.close(), t2(true));
  }
  cleanUp() {
    let e = this.currentId, t2 = this.closingPointId;
    this.closingPointId = void 0, this.currentId = void 0, this.canClose = false, this.hasLeftStartingPoint = false, this.drawType = void 0, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e), this.mutateFeature.deleteFeatureIfPresent(t2);
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.type === "Feature" && e.geometry.type === "Polygon" && e.properties.mode === this.mode ? (n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u, n2) : e.type === "Feature" && e.geometry.type === "Point" && e.properties.mode === this.mode ? (n2.pointWidth = this.getNumericStylingValue(this.styles.closingPointWidth, n2.pointWidth, e), n2.pointColor = this.getHexColorStylingValue(this.styles.closingPointColor, n2.pointColor, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.closingPointOpacity, n2.pointOpacity === void 0 ? 1 : n2.pointOpacity, e), n2.pointOutlineColor = this.getHexColorStylingValue(this.styles.closingPointOutlineColor, n2.pointOutlineColor, e), n2.pointOutlineWidth = this.getNumericStylingValue(this.styles.closingPointOutlineWidth, 2, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.closingPointOutlineOpacity, n2.pointOutlineOpacity === void 0 ? 1 : n2.pointOutlineOpacity, e), n2.zIndex = 50, n2) : n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => me(e2, this.coordinatePrecision));
  }
  afterFeatureUpdated(e) {
    this.currentId === e.id && (this.mutateFeature.deleteFeatureIfPresent(this.closingPointId), this.canClose = false, this.currentId = void 0, this.closingPointId = void 0, this.hasLeftStartingPoint = false);
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate });
  }
};
function Te({ unproject: e, point: t2, pointerDistance: n2 }) {
  let r2 = n2 / 2, { x: i2, y: a2 } = t2;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [[
        e(i2 - r2, a2 - r2),
        e(i2 + r2, a2 - r2),
        e(i2 + r2, a2 + r2),
        e(i2 - r2, a2 + r2),
        e(i2 - r2, a2 - r2)
      ].map((e2) => [e2.lng, e2.lat])]
    }
  };
}
var F = class extends D {
  constructor(e) {
    super(e);
  }
  create(e) {
    let { containerX: t2, containerY: n2 } = e;
    return Te({
      unproject: this.unproject,
      point: {
        x: t2,
        y: n2
      },
      pointerDistance: this.pointerDistance
    });
  }
};
var I = class extends D {
  constructor(e) {
    super(e);
  }
  measure(e, t2) {
    let { x: n2, y: r2 } = this.project(t2[0], t2[1]);
    return N({
      x: n2,
      y: r2
    }, {
      x: e.containerX,
      y: e.containerY
    });
  }
};
var Ee = class extends D {
  constructor(e, t2, n2) {
    super(e), this.config = void 0, this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.getSnappableCoordinateFirstClick = (e2) => this.getSnappable(e2, (e3) => !!(e3.properties && e3.properties.mode === this.mode)).coordinate, this.getSnappableCoordinate = (e2, t3) => this.getSnappable(e2, (e3) => !!(e3.properties && e3.properties.mode === this.mode && e3.id !== t3)).coordinate, this.config = e, this.pixelDistance = t2, this.clickBoundingBox = n2;
  }
  getSnappable(e, t2) {
    let n2 = this.clickBoundingBox.create(e), r2 = this.store.search(n2, t2), i2 = {
      featureId: void 0,
      featureCoordinateIndex: void 0,
      coordinate: void 0,
      minDist: Infinity
    };
    return r2.forEach((t3) => {
      let n3;
      if (t3.geometry.type === "Polygon") n3 = t3.geometry.coordinates[0];
      else {
        if (t3.geometry.type !== "LineString") return;
        n3 = t3.geometry.coordinates;
      }
      n3.forEach((n4, r3) => {
        let a2 = this.pixelDistance.measure(e, n4);
        a2 < i2.minDist && a2 < this.pointerDistance && (i2.coordinate = n4, i2.minDist = a2, i2.featureId = t3.id, i2.featureCoordinateIndex = r3);
      });
    }), i2;
  }
};
function De(e, t2, n2) {
  let r2 = x(e[0]), i2 = x(e[1]), a2 = x(n2), o2 = ee(t2), s2 = Math.asin(Math.sin(i2) * Math.cos(o2) + Math.cos(i2) * Math.sin(o2) * Math.cos(a2));
  return [S(r2 + Math.atan2(Math.sin(a2) * Math.sin(o2) * Math.cos(i2), Math.cos(o2) - Math.sin(i2) * Math.sin(s2))), S(s2)];
}
function Oe({ x: e, y: t2 }, n2, r2) {
  let i2 = x(r2);
  return {
    x: e + n2 * Math.cos(i2),
    y: t2 + n2 * Math.sin(i2)
  };
}
function ke(e, t2) {
  let n2 = x(e[0]), r2 = x(t2[0]), i2 = x(e[1]), a2 = x(t2[1]), o2 = Math.sin(r2 - n2) * Math.cos(a2), s2 = Math.cos(i2) * Math.sin(a2) - Math.sin(i2) * Math.cos(a2) * Math.cos(r2 - n2);
  return S(Math.atan2(o2, s2));
}
function L({ x: e, y: t2 }, { x: n2, y: r2 }) {
  let i2 = n2 - e, a2 = r2 - t2;
  if (i2 === 0 && a2 === 0) return 0;
  let o2 = Math.atan2(a2, i2);
  return o2 *= 180 / Math.PI, o2 > 180 ? o2 -= 360 : o2 < -180 && (o2 += 360), o2;
}
function R(e) {
  return (e + 360) % 360;
}
function Ae(e, t2, n2) {
  let r2 = [], i2 = e.length, a2, o2, s2, c2 = 0;
  for (let i3 = 0; i3 < e.length && !(t2 >= c2 && i3 === e.length - 1); i3++) {
    if (c2 > t2 && r2.length === 0) {
      if (a2 = t2 - c2, !a2) return r2.push(e[i3]), r2;
      o2 = ke(e[i3], e[i3 - 1]) - 180, s2 = De(e[i3], a2, o2), r2.push(s2);
    }
    if (c2 >= n2) return a2 = n2 - c2, a2 ? (o2 = ke(e[i3], e[i3 - 1]) - 180, s2 = De(e[i3], a2, o2), r2.push(s2), r2) : (r2.push(e[i3]), r2);
    if (c2 >= t2 && r2.push(e[i3]), i3 === e.length - 1) return r2;
    c2 += y(e[i3], e[i3 + 1]);
  }
  if (c2 < t2 && e.length === i2) throw Error("Start position is beyond line");
  let l2 = e[e.length - 1];
  return [l2, l2];
}
function je(e) {
  return Math.PI / 180 * e;
}
function Me(e) {
  return 180 / Math.PI * e;
}
var Ne = class extends D {
  constructor(e) {
    super(e), this.config = void 0, this.config = e;
  }
  generateInsertionCoordinates(e, t2, n2) {
    let r2 = [e, t2], i2 = 0;
    for (let e2 = 0; e2 < r2.length - 1; e2++) i2 += y(r2[0], r2[1]);
    if (i2 <= n2) return r2;
    let a2 = i2 / n2 - 1;
    Number.isInteger(a2) || (a2 = Math.floor(a2) + 1);
    let o2 = [];
    for (let e2 = 0; e2 < a2; e2++) {
      let t3 = Ae(r2, n2 * e2, n2 * (e2 + 1));
      o2.push(t3);
    }
    let s2 = [];
    for (let e2 = 0; e2 < o2.length; e2++) s2.push(o2[e2][1]);
    return this.limitCoordinates(s2);
  }
  generateInsertionGeodesicCoordinates(e, t2, n2) {
    let r2 = y(e, t2), i2 = (function(e2, t3, n3) {
      let r3 = [], i3 = je(e2[1]), a2 = je(e2[0]), o2 = je(t3[1]), s2 = je(t3[0]);
      n3 += 1;
      let c2 = 2 * Math.asin(Math.sqrt(Math.sin((o2 - i3) / 2) ** 2 + Math.cos(i3) * Math.cos(o2) * Math.sin((s2 - a2) / 2) ** 2));
      if (c2 === 0 || isNaN(c2)) return r3;
      for (let e3 = 0; e3 <= n3; e3++) {
        let t4 = e3 / n3, l2 = Math.sin((1 - t4) * c2) / Math.sin(c2), u2 = Math.sin(t4 * c2) / Math.sin(c2), d2 = l2 * Math.cos(i3) * Math.cos(a2) + u2 * Math.cos(o2) * Math.cos(s2), f2 = l2 * Math.cos(i3) * Math.sin(a2) + u2 * Math.cos(o2) * Math.sin(s2), p2 = l2 * Math.sin(i3) + u2 * Math.sin(o2);
        if (isNaN(d2) || isNaN(f2) || isNaN(p2)) continue;
        let m3 = Math.atan2(p2, Math.sqrt(d2 ** 2 + f2 ** 2)), h2 = Math.atan2(f2, d2);
        isNaN(m3) || isNaN(h2) || r3.push([Me(h2), Me(m3)]);
      }
      return r3.slice(1, -1);
    })(e, t2, Math.floor(r2 / n2));
    return this.limitCoordinates(i2);
  }
  limitCoordinates(e) {
    return e.map((e2) => [C(e2[0], this.config.coordinatePrecision), C(e2[1], this.config.coordinatePrecision)]);
  }
};
function Pe(e, t2) {
  if (e.geometry.type !== "LineString") return {
    valid: false,
    reason: "Feature is not a LineString"
  };
  if (e.geometry.coordinates.length < 2) return {
    valid: false,
    reason: "Feature has less than 2 coordinates"
  };
  for (let n2 = 0; n2 < e.geometry.coordinates.length; n2++) {
    if (!ce(e.geometry.coordinates[n2])) return {
      valid: false,
      reason: "Feature has invalid coordinates"
    };
    if (!se(e.geometry.coordinates[n2], t2)) return {
      valid: false,
      reason: "Feature has coordinates with excessive precision"
    };
  }
  return { valid: true };
}
function Fe(e) {
  return Math.sqrt(e[0] ** 2 + e[1] ** 2 + e[2] ** 2);
}
function z(e, t2) {
  let n2 = (function(e2, t3) {
    let [n3, r2, i2] = e2, [a2, o2, s2] = t3;
    return n3 * a2 + r2 * o2 + i2 * s2;
  })(e, t2) / (Fe(e) * Fe(t2));
  return Math.acos(Math.min(Math.max(n2, -1), 1));
}
function Ie(e) {
  let t2 = x(e[1]), n2 = x(e[0]);
  return [
    Math.cos(t2) * Math.cos(n2),
    Math.cos(t2) * Math.sin(n2),
    Math.sin(t2)
  ];
}
function B(e) {
  let [t2, n2, r2] = e, i2 = S(Math.asin(r2));
  return [S(Math.atan2(n2, t2)), i2];
}
function Le(e, t2, n2) {
  let r2 = Ie(e), i2 = Ie(t2), [a2, o2, s2] = Ie(n2), [c2, l2, u2] = (function(e2, t3) {
    let [n3, r3, i3] = e2, [a3, o3, s3] = t3;
    return [
      r3 * s3 - i3 * o3,
      i3 * a3 - n3 * s3,
      n3 * o3 - r3 * a3
    ];
  })(r2, i2), d2 = l2 * s2 - u2 * o2, f2 = u2 * a2 - c2 * s2, p2 = c2 * o2 - l2 * a2, m3 = p2 * l2 - f2 * u2, h2 = d2 * u2 - p2 * c2, g2 = f2 * c2 - d2 * l2, _2 = 1 / Math.sqrt(m3 ** 2 + h2 ** 2 + g2 ** 2), v2 = [
    m3 * _2,
    h2 * _2,
    g2 * _2
  ], b2 = [
    -1 * m3 * _2,
    -1 * h2 * _2,
    -1 * g2 * _2
  ], x2 = z(r2, i2), ee2 = z(r2, v2), S2 = z(i2, v2), C2 = z(r2, b2), te2 = z(i2, b2), w2;
  return w2 = ee2 < C2 && ee2 < te2 || S2 < C2 && S2 < te2 ? v2 : b2, z(r2, w2) > x2 || z(i2, w2) > x2 ? y(B(w2), B(r2)) <= y(B(w2), B(i2)) ? [
    B(r2),
    true,
    false
  ] : [
    B(i2),
    false,
    true
  ] : [
    B(w2),
    false,
    false
  ];
}
function Re(e, t2, n2) {
  let r2 = t2.x - e.x, i2 = t2.y - e.y, a2 = Math.max(0, Math.min(1, ((n2.x - e.x) * r2 + (n2.y - e.y) * i2) / (r2 * r2 + i2 * i2)));
  return {
    x: e.x + a2 * r2,
    y: e.y + a2 * i2
  };
}
var ze = class extends D {
  constructor(e, t2, n2) {
    super(e), this.config = void 0, this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.getSnappableCoordinateFirstClick = (e2) => {
      let t3 = this.getSnappable(e2, (e3) => !!(e3.properties && e3.properties.mode === this.mode));
      return t3.coordinate ? [C(t3.coordinate[0], this.config.coordinatePrecision), C(t3.coordinate[1], this.config.coordinatePrecision)] : void 0;
    }, this.getSnappableCoordinate = (e2, t3) => {
      let n3 = this.getSnappable(e2, (e3) => !!(e3.properties && e3.properties.mode === this.mode && e3.id !== t3));
      return n3.coordinate ? [C(n3.coordinate[0], this.config.coordinatePrecision), C(n3.coordinate[1], this.config.coordinatePrecision)] : void 0;
    }, this.config = e, this.pixelDistance = t2, this.clickBoundingBox = n2;
  }
  getSnappable(e, t2) {
    let n2 = this.clickBoundingBox.create(e), r2 = this.store.search(n2, t2), i2 = {
      featureId: void 0,
      featureCoordinateIndex: void 0,
      coordinate: void 0,
      minDistance: Infinity
    };
    return r2.forEach((t3) => {
      let n3;
      if (t3.geometry.type === "Polygon") n3 = t3.geometry.coordinates[0];
      else {
        if (t3.geometry.type !== "LineString") return;
        n3 = t3.geometry.coordinates;
      }
      let r3 = [];
      for (let e2 = 0; e2 < n3.length - 1; e2++) r3.push([n3[e2], n3[e2 + 1]]);
      let a2, o2 = [e.lng, e.lat];
      if (this.config.projection === "web-mercator" ? a2 = (function(e2, t4) {
        let n4 = [Infinity, Infinity], r4 = Infinity, i3 = 0;
        for (let a3 of t4) {
          let o3 = a3[0], s3 = a3[1], c2, l2 = Infinity, u2 = T(o3[0], o3[1]), d2 = T(s3[0], s3[1]), f2 = T(e2[0], e2[1]);
          if (o3[0] === e2[0] && o3[1] === e2[1]) c2 = o3;
          else if (s3[0] === e2[0] && s3[1] === e2[1]) c2 = s3;
          else {
            let { x: e3, y: t5 } = Re(u2, d2, f2), { lng: n5, lat: r5 } = E(e3, t5);
            c2 = [n5, r5];
          }
          c2 && (l2 = N(f2, T(c2[0], c2[1])), l2 < r4 && (n4 = c2, r4 = l2, i3 = t4.indexOf(a3)));
        }
        return r4 === Infinity ? void 0 : {
          coordinate: n4,
          lineIndex: i3,
          distance: r4
        };
      })(o2, r3) : this.config.projection === "globe" && (a2 = (function(e2, t4) {
        let n4 = [Infinity, Infinity], r4 = Infinity, i3 = 0;
        for (let a3 of t4) {
          let o3 = a3[0], s3 = a3[1], c2, l2 = Infinity;
          o3[0] === e2[0] && o3[1] === e2[1] ? c2 = o3 : s3[0] === e2[0] && s3[1] === e2[1] ? c2 = s3 : [c2] = Le(o3, s3, e2), c2 && (l2 = y(e2, c2), l2 < r4 && (n4 = c2, r4 = l2, i3 = t4.indexOf(a3)));
        }
        return r4 === Infinity ? void 0 : {
          coordinate: n4,
          distance: r4,
          lineIndex: i3
        };
      })(o2, r3)), !a2) return;
      let s2 = this.pixelDistance.measure(e, a2.coordinate);
      s2 < i2.minDistance && s2 < this.pointerDistance && (i2.featureId = t3.id, i2.coordinate = [C(a2.coordinate[0], this.config.coordinatePrecision), C(a2.coordinate[1], this.config.coordinatePrecision)], i2.featureCoordinateIndex = a2.lineIndex, i2.minDistance = s2);
    }), i2;
  }
};
function Be(e) {
  return Array.isArray(e) && e.length > 0 && Array.isArray(e[0]) && Array.isArray(e[0][0]);
}
var Ve = (e) => Be(e) ? e[0].slice(0, -1) : e;
var He = (e) => Be(e) ? e[0] : e;
var Ue = class extends D {
  constructor(e, t2, n2, r2) {
    super(e), this.config = void 0, this.pixelDistance = void 0, this.mutateFeatureBehavior = void 0, this.readFeatureBehavior = void 0, this._startEndPoints = [], this.config = e, this.pixelDistance = t2, this.mutateFeatureBehavior = n2, this.readFeatureBehavior = r2;
  }
  get ids() {
    return this._startEndPoints.concat();
  }
  set ids(e) {
  }
  create(e) {
    if (this.ids.length) throw Error("Opening and closing points already created");
    let t2 = Be(e), n2 = He(e);
    if (t2) {
      if (n2.length <= 3) throw Error("Requires at least 4 coordinates");
      this._startEndPoints = this.mutateFeatureBehavior.createGuidancePoints({
        coordinates: [n2[0], n2[n2.length - 2]],
        type: l.CLOSING_POINT
      });
    } else this._startEndPoints = [this.mutateFeatureBehavior.createGuidancePoint({
      coordinate: n2[n2.length - 2],
      type: l.CLOSING_POINT
    })];
  }
  delete() {
    this.ids.length && (this.mutateFeatureBehavior.deleteFeaturesIfPresent(this.ids), this._startEndPoints = []);
  }
  updateOne(e, t2) {
    this.mutateFeatureBehavior.updateGuidancePoints([{
      featureId: this.ids[e],
      coordinate: t2
    }]);
  }
  update(e) {
    let t2 = He(e);
    this.ids.length === 1 ? this.mutateFeatureBehavior.updateGuidancePoints([{
      featureId: this.ids[0],
      coordinate: t2[t2.length - 2]
    }]) : this.ids.length === 2 && this.mutateFeatureBehavior.updateGuidancePoints([{
      featureId: this.ids[0],
      coordinate: t2[0]
    }, {
      featureId: this.ids[1],
      coordinate: t2[t2.length - 3]
    }]);
  }
  isLineStringClosingPoint(e) {
    if (this.ids.length !== 1) return { isClosing: false };
    let t2 = this.readFeatureBehavior.getGeometry(this.ids[0]);
    return { isClosing: this.pixelDistance.measure(e, t2.coordinates) < this.pointerDistance };
  }
  isPolygonClosingPoints(e) {
    if (this.ids.length !== 2) return {
      isClosing: false,
      isPreviousClosing: false
    };
    let t2 = this.readFeatureBehavior.getGeometry(this.ids[0]), n2 = this.readFeatureBehavior.getGeometry(this.ids[1]), r2 = this.pixelDistance.measure(e, t2.coordinates), i2 = this.pixelDistance.measure(e, n2.coordinates);
    return {
      isClosing: r2 < this.pointerDistance,
      isPreviousClosing: i2 < this.pointerDistance
    };
  }
};
var We = class extends D {
  constructor(e, t2, n2) {
    super(e), this.readFeature = void 0, this.mutateFeature = void 0, this.readFeature = t2, this.mutateFeature = n2;
  }
  createOrUpdate({ featureId: e, featureCoordinates: t2 }) {
    if (!this.readFeature.hasFeature(e)) return void this.deleteOrphanedPoints(e);
    let n2 = Ve(t2), r2 = this.readFeature.getProperties(e), i2 = r2.coordinatePointIds;
    if (i2) if (i2 && i2.every((e2) => this.readFeature.hasFeature(e2))) {
      let t3 = r2.coordinatePointIds, i3 = t3.map((e2) => this.readFeature.getGeometry(e2).coordinates);
      if (t3.length !== n2.length) {
        this.deleteCoordinatePoints(t3);
        let i4 = this.createPoints(n2, r2.mode, e);
        this.setFeatureCoordinatePoints(e, i4);
      } else {
        let e2 = [];
        n2.forEach((n3, r3) => {
          n3[0] === i3[r3][0] && n3[1] === i3[r3][1] || e2.push({
            featureId: t3[r3],
            coordinate: n3
          });
        }), this.mutateFeature.updateGuidancePoints(e2);
      }
    } else {
      let t3 = i2.filter((e2) => this.readFeature.hasFeature(e2));
      t3.length && this.deleteCoordinatePoints(t3);
      let a2 = this.createPoints(n2, r2.mode, e);
      this.setFeatureCoordinatePoints(e, a2);
    }
    else {
      let t3 = this.createPoints(n2, r2.mode, e);
      this.setFeatureCoordinatePoints(e, t3);
    }
  }
  deletePointsByFeatureIds(e) {
    for (let t2 of e) this.deleteIfPresent(t2);
  }
  updateOneAtIndex(e, t2, n2) {
    let r2 = this.readFeature.getProperties(e).coordinatePointIds;
    r2 && r2.length !== 0 && r2[t2] !== void 0 && this.mutateFeature.updateGuidancePoints([{
      featureId: r2[t2],
      coordinate: n2
    }]);
  }
  updateAllInPlace({ featureId: e, featureCoordinates: t2 }) {
    let n2 = this.readFeature.getProperties(e);
    if (!n2.coordinatePointIds) return;
    let r2 = Ve(t2);
    r2.length === n2.coordinatePointIds.length && this.mutateFeature.updateGuidancePoints(n2.coordinatePointIds.map((e2, t3) => ({
      featureId: e2,
      coordinate: r2[t3]
    })));
  }
  createPoints(e, t2, n2) {
    return this.mutateFeature.createGuidancePoints({
      coordinates: e,
      type: l.COORDINATE_POINT,
      additionalProperties: (e2) => ({
        mode: t2,
        [l.COORDINATE_POINT]: true,
        [l.COORDINATE_POINT_FEATURE_ID]: n2,
        index: e2
      })
    });
  }
  setFeatureCoordinatePoints(e, t2, n2 = o.Commit) {
    let r2 = this.readFeature.getGeometryType(e), i2 = {
      featureId: e,
      propertyMutations: { [l.COORDINATE_POINT_IDS]: t2 },
      context: { updateType: n2 }
    };
    if (r2 === "Polygon") this.mutateFeature.updatePolygon(i2);
    else {
      if (r2 !== "LineString") throw Error("Unsupported geometry type for coordinate points");
      this.mutateFeature.updateLineString(i2);
    }
  }
  deleteCoordinatePoints(e) {
    this.mutateFeature.deleteFeaturesIfPresent(e);
  }
  deleteIfPresent(e) {
    if (!this.readFeature.hasFeature(e)) return;
    let t2 = this.readFeature.getProperties(e).coordinatePointIds;
    t2 && (this.deleteCoordinatePoints(t2), this.setFeatureCoordinatePoints(e, null));
  }
  deleteOrphanedPoints(e) {
    let t2 = this.readFeature.getAllFeatureIdsWhere((t3) => t3[l.COORDINATE_POINT_FEATURE_ID] === e);
    this.mutateFeature.deleteFeaturesIfPresent(t2);
  }
};
var Ge = class {
  constructor(e) {
    this.undoHistory = [], this.redoHistory = [], this.cloneCoordinatesFunction = void 0, this.maxStackSize = void 0, this.cloneCoordinatesFunction = (e2) => this.cloneRecursively(e2);
    let t2 = e?.maxStackSize;
    this.maxStackSize = t2 !== void 0 && Number.isFinite(t2) ? Math.max(0, Math.floor(t2)) : Infinity;
  }
  setMaxStackSize(e) {
    Number.isFinite(e) ? (this.maxStackSize = Math.max(0, Math.floor(e)), this.trimHistoryToMax(this.undoHistory), this.trimHistoryToMax(this.redoHistory)) : this.maxStackSize = Infinity;
  }
  trimHistoryToMax(e) {
    if (Number.isFinite(this.maxStackSize)) for (; e.length > this.maxStackSize; ) e.shift();
  }
  pushUndoEntry(e) {
    this.maxStackSize !== 0 && (this.undoHistory.push(e), this.trimHistoryToMax(this.undoHistory));
  }
  pushRedoEntry(e) {
    this.maxStackSize !== 0 && (this.redoHistory.push(e), this.trimHistoryToMax(this.redoHistory));
  }
  cloneRecursively(e) {
    return Array.isArray(e) ? e.map((e2) => this.cloneRecursively(e2)) : typeof e == "object" && e ? t({}, e) : e;
  }
  cloneCoordinates(e) {
    return this.cloneCoordinatesFunction(e);
  }
  cloneEntry(e) {
    return {
      featureCoordinates: this.cloneCoordinates(e.featureCoordinates),
      currentCoordinate: e.currentCoordinate
    };
  }
  clear() {
    this.undoHistory = [], this.redoHistory = [];
  }
  undoSize() {
    return this.undoHistory.length;
  }
  redoSize() {
    return this.redoHistory.length;
  }
  recordSnapshot(e) {
    this.pushUndoEntry(this.cloneEntry(e)), this.redoHistory = [];
  }
  beginUndo() {
    let e = this.undoHistory.pop();
    if (!e) return;
    let t2 = this.cloneEntry(e);
    this.pushRedoEntry(t2);
    let n2 = this.undoHistory[this.undoHistory.length - 1];
    return {
      undoneEntry: t2,
      previousEntry: n2 ? this.cloneEntry(n2) : void 0
    };
  }
  takeRedo() {
    let e = this.redoHistory.pop();
    if (e) return this.cloneEntry(e);
  }
  commitRedo(e) {
    this.pushUndoEntry(this.cloneEntry(e));
  }
};
var Ke = {
  cancel: "Escape",
  finish: "Enter"
};
var qe = {
  start: "crosshair",
  close: "pointer",
  dragStart: "grabbing",
  dragEnd: "crosshair"
};
var Je = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "linestring", this.currentCoordinate = 0, this.currentId = void 0, this.keyEvents = Ke, this.snapping = void 0, this.cursors = qe, this.mouseMove = false, this.insertCoordinates = void 0, this.lastCommittedCoordinates = void 0, this.snappedPointId = void 0, this.lastMouseMoveEvent = void 0, this.showCoordinatePoints = false, this.finishOnNthCoordinate = void 0, this.editable = false, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedSnapType = void 0, this.editedInsertIndex = void 0, this.editedPointId = void 0, this.coordinateSnapping = void 0, this.insertPoint = void 0, this.lineSnapping = void 0, this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.mutateFeature = void 0, this.readFeature = void 0, this.closingPoints = void 0, this.coordinatePoints = void 0, this.undoRedo = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    if (super.updateOptions(e), e?.finishOnNthCoordinate !== void 0 && Number.isInteger(e.finishOnNthCoordinate) && e.finishOnNthCoordinate > 1 && (this.finishOnNthCoordinate = Math.floor(e.finishOnNthCoordinate)), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e != null && e.snapping && (this.snapping = e.snapping), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.insertCoordinates && (this.insertCoordinates = e.insertCoordinates), e && e.editable && (this.editable = e.editable), e?.showCoordinatePoints !== void 0) {
      if (this.showCoordinatePoints = e.showCoordinatePoints, this.coordinatePoints && true === e.showCoordinatePoints) this.store.copyAllWhere((e2) => e2.mode === this.mode).forEach((e2) => {
        this.coordinatePoints.createOrUpdate({
          featureId: e2.id,
          featureCoordinates: e2.geometry.coordinates
        });
      });
      else if (this.coordinatePoints && false === this.showCoordinatePoints) {
        let e2 = this.store.copyAllWhere((e3) => e3.mode === this.mode && !!e3[l.COORDINATE_POINT_IDS]?.length);
        this.coordinatePoints.deletePointsByFeatureIds(e2.map((e3) => e3.id));
      }
    }
  }
  shouldFinishOnCommit(e) {
    return !!this.finishOnNthCoordinate && Math.max(0, e.coordinates.length - 1) >= this.finishOnNthCoordinate;
  }
  updateSnappedCoordinate(e) {
    let t2 = this.snapCoordinate(e);
    return t2 ? (this.snappedPointId ? this.mutateFeature.updateGuidancePoints([{
      featureId: this.snappedPointId,
      coordinate: t2
    }]) : this.snappedPointId = this.mutateFeature.createGuidancePoint({
      coordinate: t2,
      type: l.SNAPPING_POINT
    }), e.lng = t2[0], e.lat = t2[1]) : this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), t2;
  }
  close() {
    if (this.currentId === void 0) return;
    let e = this.mutateFeature.updateLineString({
      featureId: this.currentId,
      context: {
        updateType: o.Finish,
        action: n
      },
      coordinateMutations: [{
        type: A,
        index: -1
      }],
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 }
    });
    if (!e) return;
    this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: e.geometry.coordinates
    });
    let t2 = this.currentId;
    this.currentCoordinate = 0, this.currentId = void 0, this.lastCommittedCoordinates = void 0, this.undoRedo.clear(), this.state === "drawing" && this.setStarted(), this.closingPoints.delete(), this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.editedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), this.editedPointId = void 0, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedInsertIndex = void 0, this.editedSnapType = void 0), this.onFinish(t2, {
      mode: this.mode,
      action: n
    });
  }
  generateInsertCoordinates(e, t2) {
    if (!this.insertCoordinates || !this.lastCommittedCoordinates) throw Error("Not able to insert coordinates");
    if (this.insertCoordinates.strategy !== "amount") throw Error("Strategy does not exist");
    let n2 = y(e, t2) / (this.insertCoordinates.value + 1), r2 = [];
    return this.projection === "globe" ? r2 = this.insertPoint.generateInsertionGeodesicCoordinates(e, t2, n2) : this.projection === "web-mercator" && (r2 = this.insertPoint.generateInsertionCoordinates(e, t2, n2)), r2;
  }
  createLine(e) {
    let t2 = this.mutateFeature.createLineString({
      coordinates: [e, e],
      properties: {
        mode: this.mode,
        [l.CURRENTLY_DRAWING]: true
      }
    });
    this.lastCommittedCoordinates = t2.geometry.coordinates, this.currentId = t2.id, this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate), this.setDrawing(), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: t2.geometry.coordinates
    });
  }
  firstUpdateToLine(e) {
    if (!this.currentId) return;
    this.setCursor(this.cursors.close);
    let t2 = this.mutateFeature.updateLineString({
      featureId: this.currentId,
      context: { updateType: o.Commit },
      coordinateMutations: [{
        type: O,
        index: -1,
        coordinate: e
      }]
    });
    t2 && (this.closingPoints.create(t2.geometry.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: t2.geometry.coordinates
    }), this.lastCommittedCoordinates = t2.geometry.coordinates, this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate), this.shouldFinishOnCommit(t2.geometry) && this.close());
  }
  updateToLine(e, t2) {
    if (!this.currentId) return;
    let { isClosing: n2 } = this.closingPoints.isLineStringClosingPoint(e);
    if (n2) return void this.close();
    this.setCursor(this.cursors.close);
    let r2 = this.mutateFeature.updateLineString({
      featureId: this.currentId,
      context: { updateType: o.Commit },
      coordinateMutations: [{
        type: O,
        index: -1,
        coordinate: t2
      }]
    });
    r2 && (this.closingPoints.update(r2.geometry.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: r2.geometry.coordinates
    }), this.lastCommittedCoordinates = r2.geometry.coordinates, this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate), this.shouldFinishOnCommit(r2.geometry) && this.close());
  }
  undoSize() {
    return this.undoRedo.undoSize();
  }
  clearHistory() {
    this.undoRedo.clear();
  }
  pushHistorySnapshot(e, t2) {
    let n2 = this.readFeature.getGeometry(e);
    this.undoRedo.recordSnapshot({
      featureCoordinates: n2.coordinates,
      currentCoordinate: t2
    });
  }
  updateSnappedGuidancePointFromLastMouseMove() {
    this.snapping && this.lastMouseMoveEvent ? this.updateSnappedCoordinate(this.lastMouseMoveEvent) : this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0));
  }
  syncClosingPoints(e) {
    this.currentCoordinate >= 2 ? this.closingPoints.ids.length ? this.closingPoints.update(e) : this.closingPoints.create(e) : this.closingPoints.delete();
  }
  undo() {
    if (this.state !== "drawing" || !this.currentId) return;
    let e = this.undoRedo.beginUndo();
    if (!e) return;
    let { previousEntry: t2 } = e;
    if (!t2) {
      let e2 = this.currentId;
      this.currentId = void 0, this.currentCoordinate = 0, this.lastCommittedCoordinates = void 0, this.closingPoints.delete(), this.state === "drawing" && this.setStarted(), this.showCoordinatePoints && this.coordinatePoints.deletePointsByFeatureIds([e2]), this.mutateFeature.deleteFeatureIfPresent(e2), this.updateSnappedGuidancePointFromLastMouseMove();
      return;
    }
    let n2 = this.mutateFeature.updateLineString({
      featureId: this.currentId,
      coordinateMutations: {
        type: j,
        coordinates: t2.featureCoordinates
      },
      propertyMutations: { [l.CURRENTLY_DRAWING]: true },
      context: { updateType: o.Commit }
    });
    n2 && (this.currentCoordinate = t2.currentCoordinate, this.lastCommittedCoordinates = n2.geometry.coordinates, this.syncClosingPoints(n2.geometry.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: n2.geometry.coordinates
    }), this.updateSnappedGuidancePointFromLastMouseMove());
  }
  redoSize() {
    return this.undoRedo.redoSize();
  }
  redo() {
    let e = this.undoRedo.takeRedo();
    if (e) {
      if (this.currentId) {
        let t2 = this.mutateFeature.updateLineString({
          featureId: this.currentId,
          coordinateMutations: {
            type: j,
            coordinates: e.featureCoordinates
          },
          propertyMutations: { [l.CURRENTLY_DRAWING]: true },
          context: { updateType: o.Commit }
        });
        if (!t2) return;
        this.currentCoordinate = e.currentCoordinate, this.lastCommittedCoordinates = t2.geometry.coordinates, this.syncClosingPoints(t2.geometry.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
          featureId: this.currentId,
          featureCoordinates: t2.geometry.coordinates
        });
      } else {
        let { id: t2, geometry: n2 } = this.mutateFeature.createLineString({
          coordinates: e.featureCoordinates,
          properties: {
            mode: this.mode,
            [l.CURRENTLY_DRAWING]: true
          }
        });
        this.currentId = t2, this.currentCoordinate = e.currentCoordinate, this.lastCommittedCoordinates = n2.coordinates, this.state === "started" && this.setDrawing(), this.syncClosingPoints(n2.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
          featureId: t2,
          featureCoordinates: n2.coordinates
        });
      }
      this.undoRedo.commitRedo(e), this.updateSnappedGuidancePointFromLastMouseMove();
    }
  }
  registerBehaviors(e) {
    this.insertPoint = new Ne(e), this.clickBoundingBox = new F(e), this.pixelDistance = new I(e), this.lineSnapping = new ze(e, this.pixelDistance, this.clickBoundingBox), this.coordinateSnapping = new Ee(e, this.pixelDistance, this.clickBoundingBox), this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate }), this.closingPoints = new Ue(e, this.pixelDistance, this.mutateFeature, this.readFeature), this.coordinatePoints = new We(e, this.readFeature, this.mutateFeature), this.undoRedo = new Ge({ maxStackSize: e.undoRedoMaxStackSize });
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onMouseMove(e) {
    this.mouseMove = true, this.setCursor(this.cursors.start), this.lastMouseMoveEvent = e;
    let t2 = this.updateSnappedCoordinate(e) || [e.lng, e.lat];
    if (this.currentId === void 0 || this.currentCoordinate === 0) return;
    let { isClosing: n2 } = this.closingPoints.isLineStringClosingPoint(e);
    n2 && this.setCursor(this.cursors.close);
    let r2 = [{
      type: k,
      index: -1,
      coordinate: t2
    }];
    if (this.insertCoordinates) {
      let e2 = this.getInsertCoordinates(t2);
      e2 && (r2 = {
        type: j,
        coordinates: e2
      });
    }
    let i2 = this.mutateFeature.updateLineString({
      coordinateMutations: r2,
      featureId: this.currentId,
      context: { updateType: o.Provisional }
    });
    i2 && this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: i2.geometry.coordinates
    });
  }
  getInsertCoordinates(e) {
    if (!this.lastCommittedCoordinates) return;
    let t2 = this.lastCommittedCoordinates[this.lastCommittedCoordinates.length - 1];
    if (xe(t2, e)) return;
    let n2 = this.generateInsertCoordinates(t2, e);
    return [
      ...this.lastCommittedCoordinates.slice(0, -1),
      ...n2,
      e
    ];
  }
  onRightClick(e) {
    if (!this.editable || this.state !== "started") return;
    let { featureId: t2, featureCoordinateIndex: n2 } = this.coordinateSnapping.getSnappable(e, (e2) => this.lineStringFilter(e2));
    if (!t2 || n2 === void 0) return;
    let a2 = this.readFeature.getGeometry(t2), s2;
    if (a2.type !== "LineString" || (s2 = a2.coordinates, s2.length <= 2)) return;
    let c2 = this.mutateFeature.updateLineString({
      featureId: t2,
      coordinateMutations: [{
        type: A,
        index: n2
      }],
      context: {
        updateType: o.Finish,
        action: r
      }
    });
    c2 && this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: t2,
      featureCoordinates: c2.geometry.coordinates
    }), this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.editedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), this.editedPointId = void 0, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedInsertIndex = void 0, this.editedSnapType = void 0), this.closingPoints.delete(), this.onFinish(t2, {
      mode: this.mode,
      action: i
    });
  }
  onLeftClick(e) {
    this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0));
    let t2 = this.snapCoordinate(e) || [e.lng, e.lat];
    this.currentCoordinate === 0 ? this.createLine(t2) : this.currentCoordinate === 1 && this.currentId ? this.firstUpdateToLine(t2) : this.currentId && this.updateToLine(e, t2);
  }
  onClick(e) {
    this.currentId === void 0 || this.readFeature.hasFeature(this.currentId) || this.cleanUp(), (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) && (this.currentCoordinate > 0 && !this.mouseMove && this.onMouseMove(e), this.mouseMove = false, e.button === "right" ? this.onRightClick(e) : e.button === "left" && this.onLeftClick(e));
  }
  onKeyDown() {
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel && this.cleanUp(), e.key === this.keyEvents.finish && this.close();
  }
  onDragStart(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragStart, e) || !this.editable) return;
    let n2;
    if (this.state === "started") {
      let t3 = this.lineSnapping.getSnappable(e, (e2) => this.lineStringFilter(e2));
      t3.coordinate && (this.editedSnapType = "line", this.editedFeatureCoordinateIndex = t3.featureCoordinateIndex, this.editedFeatureId = t3.featureId, n2 = t3.coordinate);
      let r2 = this.coordinateSnapping.getSnappable(e, (e2) => this.lineStringFilter(e2));
      r2.coordinate && (this.editedSnapType = "coordinate", this.editedFeatureCoordinateIndex = r2.featureCoordinateIndex, this.editedFeatureId = r2.featureId, n2 = r2.coordinate);
    }
    this.editedFeatureId && n2 && (this.editedPointId || (this.editedPointId = this.mutateFeature.createGuidancePoint({
      coordinate: n2,
      type: l.EDITED
    })), this.setCursor(this.cursors.dragStart), t2(false));
  }
  onDrag(e, t2) {
    if (this.allowPointerEvent(this.pointerEvents.onDrag, e) && this.editedFeatureId !== void 0 && this.editedFeatureCoordinateIndex !== void 0) {
      if (this.editedSnapType === "coordinate" || this.editedSnapType === "line" && this.editedInsertIndex !== void 0) {
        let t3 = this.mutateFeature.updateLineString({
          featureId: this.editedFeatureId,
          context: { updateType: o.Provisional },
          coordinateMutations: [{
            type: k,
            index: this.editedFeatureCoordinateIndex,
            coordinate: [e.lng, e.lat]
          }]
        });
        if (!t3) return;
        this.showCoordinatePoints && (this.editedInsertIndex === void 0 ? this.coordinatePoints.updateOneAtIndex(this.editedFeatureId, this.editedFeatureCoordinateIndex, [e.lng, e.lat]) : this.coordinatePoints.createOrUpdate({
          featureId: this.editedFeatureId,
          featureCoordinates: t3.geometry.coordinates
        }));
      } else if (this.editedSnapType === "line" && this.editedInsertIndex === void 0) {
        this.editedInsertIndex = this.editedFeatureCoordinateIndex + 1;
        let e2 = this.mutateFeature.updateLineString({
          featureId: this.editedFeatureId,
          context: { updateType: o.Provisional }
        });
        if (!e2) return;
        this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
          featureId: this.editedFeatureId,
          featureCoordinates: e2.geometry.coordinates
        }), this.editedFeatureCoordinateIndex++;
      }
      this.snapping && this.snappedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), this.snappedPointId = void 0), this.editedPointId && this.mutateFeature.updateGuidancePoints([{
        featureId: this.editedPointId,
        coordinate: [e.lng, e.lat]
      }]), this.mutateFeature.updateLineString({
        featureId: this.editedFeatureId,
        context: { updateType: o.Provisional },
        propertyMutations: { [l.EDITED]: true }
      });
    }
  }
  onDragEnd(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, e) || this.editedFeatureId === void 0 || (this.setCursor(this.cursors.dragEnd), !this.mutateFeature.updateLineString({
      featureId: this.editedFeatureId,
      propertyMutations: { [l.EDITED]: false },
      context: {
        updateType: o.Finish,
        action: r
      }
    }))) return;
    let n2 = this.editedFeatureId;
    t2(true), this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.editedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), this.editedPointId = void 0, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedInsertIndex = void 0, this.editedSnapType = void 0), this.closingPoints.delete(), this.onFinish(n2, {
      mode: this.mode,
      action: r
    });
  }
  cleanUp() {
    let e = this.currentId, t2 = this.snappedPointId;
    this.snappedPointId = void 0, this.currentId = void 0, this.currentCoordinate = 0, this.lastCommittedCoordinates = void 0, this.undoRedo.clear(), this.state === "drawing" && this.setStarted(), e && this.showCoordinatePoints && this.coordinatePoints.deletePointsByFeatureIds([e]), this.mutateFeature.deleteFeatureIfPresent(e), this.mutateFeature.deleteFeatureIfPresent(t2), this.closingPoints.delete();
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    if (e.type === "Feature" && e.geometry.type === "LineString" && e.properties.mode === this.mode) return n2.lineStringDash = this.styles.lineStringDash, n2.lineStringColor = this.getHexColorStylingValue(this.styles.lineStringColor, n2.lineStringColor, e), n2.lineStringOpacity = this.getNumericStylingValue(this.styles.lineStringOpacity, n2.lineStringOpacity === void 0 ? 1 : n2.lineStringOpacity, e), n2.lineStringWidth = this.getNumericStylingValue(this.styles.lineStringWidth, n2.lineStringWidth, e), n2.zIndex = u, n2;
    if (e.type === "Feature" && e.geometry.type === "Point" && e.properties.mode === this.mode) {
      let t2 = e.properties[l.COORDINATE_POINT], r2 = e.properties[l.CLOSING_POINT] ? "closingPoint" : e.properties[l.SNAPPING_POINT] ? "snappingPoint" : t2 ? "coordinatePoint" : void 0;
      if (!r2) return n2;
      let i2 = {
        closingPoint: {
          width: this.styles.closingPointWidth,
          color: this.styles.closingPointColor,
          opacity: this.styles.closingPointOpacity,
          outlineColor: this.styles.closingPointOutlineColor,
          outlineWidth: this.styles.closingPointOutlineWidth,
          outlineOpacity: this.styles.closingPointOutlineOpacity
        },
        snappingPoint: {
          width: this.styles.snappingPointWidth,
          color: this.styles.snappingPointColor,
          opacity: this.styles.snappingPointOpacity,
          outlineColor: this.styles.snappingPointOutlineColor,
          outlineWidth: this.styles.snappingPointOutlineWidth,
          outlineOpacity: this.styles.snappingPointOutlineOpacity
        },
        coordinatePoint: {
          width: this.styles.coordinatePointWidth,
          color: this.styles.coordinatePointColor,
          opacity: this.styles.coordinatePointOpacity,
          outlineColor: this.styles.coordinatePointOutlineColor,
          outlineWidth: this.styles.coordinatePointOutlineWidth,
          outlineOpacity: this.styles.coordinatePointOutlineOpacity
        }
      };
      return n2.pointWidth = this.getNumericStylingValue(i2[r2].width, n2.pointWidth, e), n2.pointOpacity = this.getNumericStylingValue(i2[r2].opacity, 1, e), n2.pointColor = this.getHexColorStylingValue(i2[r2].color, n2.pointColor, e), n2.pointOutlineColor = this.getHexColorStylingValue(i2[r2].outlineColor, "#ffffff", e), n2.pointOutlineWidth = this.getNumericStylingValue(i2[r2].outlineWidth, 2, e), n2.pointOutlineOpacity = this.getNumericStylingValue(i2[r2].outlineOpacity, 1, e), n2.zIndex = t2 ? 20 : 50, n2;
    }
    return n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => Pe(e2, this.coordinatePrecision));
  }
  lineStringFilter(e) {
    return !!(e.geometry.type === "LineString" && e.properties && e.properties.mode === this.mode);
  }
  snapCoordinate(e) {
    var t2, n2, r2;
    let i2;
    if ((t2 = this.snapping) != null && t2.toLine) {
      let t3;
      t3 = this.currentId ? this.lineSnapping.getSnappableCoordinate(e, this.currentId) : this.lineSnapping.getSnappableCoordinateFirstClick(e), t3 && (i2 = t3);
    }
    if ((n2 = this.snapping) != null && n2.toCoordinate) {
      let t3;
      t3 = this.currentId ? this.coordinateSnapping.getSnappableCoordinate(e, this.currentId) : this.coordinateSnapping.getSnappableCoordinateFirstClick(e), t3 && (i2 = t3);
    }
    if ((r2 = this.snapping) != null && r2.toCustom) {
      let t3 = this.snapping.toCustom(e, {
        currentCoordinate: this.currentCoordinate,
        currentId: this.currentId,
        getCurrentGeometrySnapshot: this.currentId ? () => this.readFeature.getGeometry(this.currentId) : () => null,
        project: this.project,
        unproject: this.unproject
      });
      t3 && (i2 = t3);
    }
    return i2;
  }
  afterFeatureUpdated(e) {
    this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: e.id,
      featureCoordinates: e.geometry.coordinates
    }), this.editedFeatureId === e.id && this.editedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), this.editedPointId = void 0, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedSnapType = void 0), this.snappedPointId && this.lastMouseMoveEvent && this.updateSnappedCoordinate(this.lastMouseMoveEvent), this.currentId === e.id && (this.closingPoints.delete(), this.currentCoordinate = 0, this.currentId = void 0, this.lastCommittedCoordinates = void 0, this.undoRedo.clear(), this.state === "drawing" && this.setStarted());
  }
  afterFeatureAdded(e) {
    this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: e.id,
      featureCoordinates: e.geometry.coordinates
    });
  }
};
var Ye = {
  cancel: "Escape",
  finish: "Enter"
};
var Xe = {
  start: "crosshair",
  close: "pointer"
};
var Ze = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "polyline", this.currentCoordinate = 0, this.currentId = void 0, this.keyEvents = Ye, this.cursors = Xe, this.mouseMove = false, this.snapping = void 0, this.snappedPointId = void 0, this.mutateFeature = void 0, this.readFeature = void 0, this.pixelDistance = void 0, this.closingPoints = void 0, this.clickBoundingBox = void 0, this.lineSnapping = void 0, this.coordinateSnapping = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e != null && e.snapping && (this.snapping = e.snapping), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents));
  }
  registerBehaviors(e) {
    this.clickBoundingBox = new F(e), this.pixelDistance = new I(e), this.lineSnapping = new ze(e, this.pixelDistance, this.clickBoundingBox), this.coordinateSnapping = new Ee(e, this.pixelDistance, this.clickBoundingBox), this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate }), this.closingPoints = new Ue(e, this.pixelDistance, this.mutateFeature, this.readFeature);
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  finishLine() {
    if (!this.currentId || !this.mutateFeature.updateLineString({
      featureId: this.currentId,
      context: {
        updateType: o.Finish,
        action: n
      },
      coordinateMutations: [{
        type: A,
        index: -1
      }],
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 }
    })) return;
    let e = this.currentId;
    this.currentCoordinate = 0, this.currentId = void 0, this.closingPoints.delete(), this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), this.snappedPointId = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  toPolygonLikeCoordinates(e) {
    return e.length === 0 ? [e] : [[...e, e[0]]];
  }
  closeAsPolygon() {
    if (!this.currentId) return;
    let e = this.readFeature.getGeometry(this.currentId).coordinates.slice(0, -1);
    if (e.length < 3) return;
    let t2 = this.currentId, r2 = [...e, e[0]], i2 = this.mutateFeature.createPolygon({
      coordinates: r2,
      properties: { mode: this.mode },
      context: {
        updateType: o.Finish,
        action: n
      }
    });
    i2 && (this.mutateFeature.deleteFeatureIfPresent(t2), this.currentCoordinate = 0, this.currentId = void 0, this.closingPoints.delete(), this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), this.snappedPointId = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(i2.id, {
      mode: this.mode,
      action: n
    }));
  }
  onMouseMove(e) {
    if (this.mouseMove = true, this.setCursor(this.cursors.start), this.updateSnappedCoordinate(e), !this.currentId || this.currentCoordinate === 0 || !this.mutateFeature.updateLineString({
      featureId: this.currentId,
      coordinateMutations: [{
        type: k,
        index: -1,
        coordinate: [e.lng, e.lat]
      }],
      context: { updateType: o.Provisional }
    })) return;
    let { isClosing: t2, isPreviousClosing: n2 } = this.closingPoints.isPolygonClosingPoints(e);
    (t2 && this.currentCoordinate >= 3 || n2 && this.currentCoordinate >= 2) && this.setCursor(this.cursors.close);
  }
  onLeftClick(e) {
    this.updateSnappedCoordinate(e);
    let t2 = [e.lng, e.lat];
    if (this.currentCoordinate === 0) {
      let e2 = this.mutateFeature.createLineString({
        coordinates: [t2, t2],
        properties: {
          mode: this.mode,
          [l.CURRENTLY_DRAWING]: true
        }
      });
      this.currentId = e2.id, this.currentCoordinate = 1, this.setDrawing();
      return;
    }
    if (!this.currentId) return;
    let { isClosing: n2, isPreviousClosing: r2 } = this.closingPoints.isPolygonClosingPoints(e);
    if (n2 && this.currentCoordinate >= 3) return void this.closeAsPolygon();
    if (r2 && this.currentCoordinate >= 2) return void this.finishLine();
    let i2 = this.mutateFeature.updateLineString({
      featureId: this.currentId,
      context: { updateType: o.Commit },
      coordinateMutations: [{
        type: O,
        index: -1,
        coordinate: t2
      }]
    });
    if (i2 && (this.currentCoordinate++, this.currentCoordinate >= 2)) {
      let e2 = this.toPolygonLikeCoordinates(i2.geometry.coordinates);
      this.closingPoints.ids.length === 0 ? this.closingPoints.create(e2) : this.closingPoints.update(e2);
    }
  }
  onClick(e) {
    e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) && (this.currentCoordinate > 0 && !this.mouseMove && this.onMouseMove(e), this.mouseMove = false, this.onLeftClick(e));
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && this.finishLine();
  }
  onKeyDown() {
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  cleanUp() {
    let e = this.currentId;
    this.currentId = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e), this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), this.snappedPointId = void 0, this.closingPoints.delete();
  }
  updateSnappedCoordinate(e) {
    let t2 = this.snapCoordinate(e);
    t2 ? (this.snappedPointId ? this.mutateFeature.updateGuidancePoints([{
      featureId: this.snappedPointId,
      coordinate: t2
    }]) : this.snappedPointId = this.mutateFeature.createGuidancePoint({
      coordinate: t2,
      type: l.SNAPPING_POINT
    }), e.lng = t2[0], e.lat = t2[1]) : this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0));
  }
  snapCoordinate(e) {
    var t2, n2, r2;
    let i2;
    if ((t2 = this.snapping) != null && t2.toLine) {
      let t3;
      t3 = this.currentId ? this.lineSnapping.getSnappableCoordinate(e, this.currentId) : this.lineSnapping.getSnappableCoordinateFirstClick(e), t3 && (i2 = t3);
    }
    if ((n2 = this.snapping) != null && n2.toCoordinate) {
      let t3;
      t3 = this.currentId ? this.coordinateSnapping.getSnappableCoordinate(e, this.currentId) : this.coordinateSnapping.getSnappableCoordinateFirstClick(e), t3 && (i2 = t3);
    }
    if ((r2 = this.snapping) != null && r2.toCustom) {
      let t3 = this.snapping.toCustom(e, {
        currentCoordinate: this.currentCoordinate,
        currentId: this.currentId,
        getCurrentGeometrySnapshot: this.currentId ? () => this.readFeature.getGeometry(this.currentId) : () => null,
        project: this.project,
        unproject: this.unproject
      });
      t3 && (i2 = t3);
    }
    return i2;
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    if (e.properties.mode !== this.mode) return n2;
    if (e.geometry.type === "LineString") return n2.lineStringColor = this.getHexColorStylingValue(this.styles.lineStringColor, n2.lineStringColor, e), n2.lineStringWidth = this.getNumericStylingValue(this.styles.lineStringWidth, n2.lineStringWidth, e), n2.lineStringOpacity = this.getNumericStylingValue(this.styles.lineStringOpacity, 1, e), n2.zIndex = u, n2;
    if (e.geometry.type === "Polygon") return n2.polygonFillColor = this.getHexColorStylingValue(this.styles.polygonFillColor, n2.polygonFillColor, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.polygonFillOpacity, n2.polygonFillOpacity, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.polygonOutlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.polygonOutlineWidth, n2.polygonOutlineWidth, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.polygonOutlineOpacity, 1, e), n2.zIndex = u, n2;
    if (e.geometry.type === "Point") {
      let t2 = true === e.properties[l.CLOSING_POINT];
      if (!t2 && true !== e.properties[l.SNAPPING_POINT]) return n2;
      n2.pointColor = this.getHexColorStylingValue(t2 ? this.styles.closingPointColor : this.styles.snappingPointColor, n2.pointColor, e), n2.pointWidth = this.getNumericStylingValue(t2 ? this.styles.closingPointWidth : this.styles.snappingPointWidth, n2.pointWidth, e), n2.pointOpacity = this.getNumericStylingValue(t2 ? this.styles.closingPointOpacity : this.styles.snappingPointOpacity, 1, e), n2.pointOutlineColor = this.getHexColorStylingValue(t2 ? this.styles.closingPointOutlineColor : this.styles.snappingPointOutlineColor, n2.pointOutlineColor, e), n2.pointOutlineWidth = this.getNumericStylingValue(t2 ? this.styles.closingPointOutlineWidth : this.styles.snappingPointOutlineWidth, 2, e), n2.pointOutlineOpacity = this.getNumericStylingValue(t2 ? this.styles.closingPointOutlineOpacity : this.styles.snappingPointOutlineOpacity, 1, e), n2.zIndex = 30;
    }
    return n2;
  }
  afterFeatureAdded(e) {
  }
  afterFeatureUpdated(e) {
    this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.currentId === e.id && (this.currentCoordinate = 0, this.currentId = void 0, this.closingPoints.delete(), this.state === "drawing" && this.setStarted());
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => e2.geometry.type === "LineString" ? Pe(e2, this.coordinatePrecision) : e2.geometry.type === "Polygon" ? me(e2, this.coordinatePrecision) : {
      valid: false,
      reason: "Only LineString or Polygon features are valid"
    });
  }
};
var Qe = "Feature is not a Point";
var $e = "Feature has invalid coordinates";
var et = "Feature has coordinates with excessive precision";
function tt(e, t2) {
  return e.geometry.type === "Point" ? ce(e.geometry.coordinates) ? se(e.geometry.coordinates, t2) ? { valid: true } : {
    valid: false,
    reason: et
  } : {
    valid: false,
    reason: $e
  } : {
    valid: false,
    reason: Qe
  };
}
var nt = class extends D {
  constructor(e, t2, n2) {
    super(e), this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.pixelDistance = t2, this.clickBoundingBox = n2;
  }
  getNearestPointFeature(e) {
    let t2 = this.clickBoundingBox.create(e), n2 = this.store.search(t2), r2, i2 = Infinity;
    for (let t3 = 0; t3 < n2.length; t3++) {
      let a2 = n2[t3];
      if (a2.geometry.type !== "Point" || a2.properties.mode !== this.mode) continue;
      let o2 = this.pixelDistance.measure(e, a2.geometry.coordinates);
      o2 > i2 || o2 > this.pointerDistance || (i2 = o2, r2 = a2);
    }
    return r2;
  }
};
var rt = {
  create: "crosshair",
  dragStart: "grabbing",
  dragEnd: "crosshair"
};
var it = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "point", this.cursors = rt, this.editable = false, this.editedFeatureId = void 0, this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.pointSearch = void 0, this.mutateFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e != null && e.editable && (this.editable = e.editable);
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.create);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onClick(e) {
    e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e) ? this.onRightClick(e) : e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) && this.onLeftClick(e);
  }
  onMouseMove() {
  }
  onKeyDown() {
  }
  onKeyUp() {
  }
  cleanUp() {
    this.editedFeatureId = void 0;
  }
  onDragStart(e, t2) {
    if (this.allowPointerEvent(this.pointerEvents.onDragStart, e)) {
      if (this.editable) {
        let t3 = this.pointSearch.getNearestPointFeature(e);
        this.editedFeatureId = t3?.id;
      }
      this.editedFeatureId && (this.setCursor(this.cursors.dragStart), t2(false));
    }
  }
  onDrag(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDrag, e) && this.editedFeatureId !== void 0 && this.mutateFeature.updatePoint({
      featureId: this.editedFeatureId,
      coordinateMutations: {
        type: j,
        coordinates: [e.lng, e.lat]
      },
      propertyMutations: { [l.EDITED]: true },
      context: { updateType: o.Provisional }
    });
  }
  onDragEnd(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, e) || this.editedFeatureId === void 0 || !this.mutateFeature.updatePoint({
      featureId: this.editedFeatureId,
      propertyMutations: {
        mode: this.mode,
        [l.EDITED]: false
      },
      context: {
        updateType: o.Finish,
        action: "edit"
      }
    })) return;
    let r2 = this.editedFeatureId;
    this.setCursor(this.cursors.dragEnd), this.editedFeatureId = void 0, t2(true), this.onFinish(r2, {
      mode: this.mode,
      action: n
    });
  }
  registerBehaviors(e) {
    this.pixelDistance = new I(e), this.clickBoundingBox = new F(e), this.pointSearch = new nt(e, this.pixelDistance, this.clickBoundingBox), this.mutateFeature = new M(e, { validate: this.validate });
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    if (e.type === "Feature" && e.geometry.type === "Point" && e.properties.mode === this.mode) {
      let t2 = !!(e.id && this.editedFeatureId === e.id);
      n2.pointWidth = this.getNumericStylingValue(t2 ? this.styles.editedPointWidth : this.styles.pointWidth, n2.pointWidth, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.pointOpacity, n2.pointOpacity === void 0 ? 1 : n2.pointOpacity, e), n2.pointColor = this.getHexColorStylingValue(t2 ? this.styles.editedPointColor : this.styles.pointColor, n2.pointColor, e), n2.pointOutlineColor = this.getHexColorStylingValue(t2 ? this.styles.editedPointOutlineColor : this.styles.pointOutlineColor, n2.pointOutlineColor, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.pointOutlineOpacity, n2.pointOutlineOpacity === void 0 ? 1 : n2.pointOutlineOpacity, e), n2.pointOutlineWidth = this.getNumericStylingValue(t2 ? this.styles.editedPointOutlineWidth : this.styles.pointOutlineWidth, 2, e), n2.zIndex = 30;
    }
    return n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => tt(e2, this.coordinatePrecision));
  }
  onLeftClick(e) {
    let t2 = this.mutateFeature.createPoint({
      coordinates: [e.lng, e.lat],
      properties: { mode: this.mode },
      context: {
        updateType: o.Finish,
        action: n
      }
    });
    t2 && this.onFinish(t2.id, {
      mode: this.mode,
      action: n
    });
  }
  onRightClick(e) {
    if (!this.editable) return;
    let t2 = this.pointSearch.getNearestPointFeature(e);
    t2 && this.mutateFeature.deleteFeatureIfPresent(t2.id);
  }
  afterFeatureUpdated(e) {
    this.editedFeatureId === e.id && (this.editedFeatureId = void 0, this.setCursor(this.cursors.create));
  }
};
var at = {
  cancel: "Escape",
  finish: "Enter"
};
var ot = {
  start: "crosshair",
  close: "pointer",
  dragStart: "grabbing",
  dragEnd: "crosshair"
};
var st = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "polygon", this.currentCoordinate = 0, this.currentId = void 0, this.keyEvents = at, this.cursors = ot, this.mouseMove = false, this.showCoordinatePoints = false, this.lastMouseMoveEvent = void 0, this.snapping = void 0, this.snappedPointId = void 0, this.editable = false, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedSnapType = void 0, this.editedInsertIndex = void 0, this.editedPointId = void 0, this.coordinatePoints = void 0, this.lineSnapping = void 0, this.coordinateSnapping = void 0, this.pixelDistance = void 0, this.closingPoints = void 0, this.clickBoundingBox = void 0, this.mutateFeature = void 0, this.readFeature = void 0, this.undoRedo = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    if (super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.snapping && (this.snapping = e.snapping), e?.editable !== void 0 && (this.editable = e.editable), e?.pointerEvents !== void 0 && (this.pointerEvents = e.pointerEvents), e?.showCoordinatePoints !== void 0) {
      if (this.showCoordinatePoints = e.showCoordinatePoints, this.coordinatePoints && true === e.showCoordinatePoints) this.store.copyAllWhere((e2) => e2.mode === this.mode).filter((e2) => e2.geometry.type === "Polygon").forEach((e2) => {
        this.coordinatePoints.createOrUpdate({
          featureId: e2.id,
          featureCoordinates: e2.geometry.coordinates
        });
      });
      else if (this.coordinatePoints && false === this.showCoordinatePoints) {
        let e2 = this.store.copyAllWhere((e3) => e3.mode === this.mode && !!e3[l.COORDINATE_POINT_IDS]).filter((e3) => e3.geometry.type === "Polygon");
        this.coordinatePoints.deletePointsByFeatureIds(e2.map((e3) => e3.id));
      }
    }
  }
  close() {
    if (this.currentId === void 0 || this.readFeature.getCoordinates(this.currentId).length < 5) return;
    let e = this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      coordinateMutations: [{
        type: A,
        index: -2
      }],
      propertyMutations: {
        [l.CURRENTLY_DRAWING]: void 0,
        [l.COMMITTED_COORDINATE_COUNT]: void 0,
        [l.PROVISIONAL_COORDINATE_COUNT]: void 0
      },
      context: {
        updateType: o.Finish,
        action: n
      }
    });
    if (!e) return;
    this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: e.geometry.coordinates
    }), this.state === "drawing" && this.setStarted(), this.editedPointId && (this.editedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), void 0)), this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.closingPoints.delete();
    let t2 = this.currentId;
    this.currentCoordinate = 0, this.currentId = void 0, this.undoRedo.clear(), this.onFinish(t2, {
      mode: this.mode,
      action: n
    });
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate }), this.clickBoundingBox = new F(e), this.pixelDistance = new I(e), this.lineSnapping = new ze(e, this.pixelDistance, this.clickBoundingBox), this.coordinateSnapping = new Ee(e, this.pixelDistance, this.clickBoundingBox), this.closingPoints = new Ue(e, this.pixelDistance, this.mutateFeature, this.readFeature), this.coordinatePoints = new We(e, this.readFeature, this.mutateFeature), this.undoRedo = new Ge({ maxStackSize: e.undoRedoMaxStackSize });
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  updateSnappedCoordinate(e) {
    let t2 = this.snapCoordinate(e);
    t2 ? (this.snappedPointId ? this.mutateFeature.updateGuidancePoints([{
      featureId: this.snappedPointId,
      coordinate: t2
    }]) : this.snappedPointId = this.mutateFeature.createGuidancePoint({
      coordinate: t2,
      type: l.SNAPPING_POINT
    }), e.lng = t2[0], e.lat = t2[1]) : this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0));
  }
  undoSize() {
    return this.undoRedo.undoSize();
  }
  clearHistory() {
    this.undoRedo.clear();
  }
  pushHistorySnapshot(e, t2) {
    let n2 = this.readFeature.getGeometry(e);
    this.undoRedo.recordSnapshot({
      featureCoordinates: n2.coordinates,
      currentCoordinate: t2
    });
  }
  updateSnappedGuidancePointFromLastMouseMove() {
    this.snapping && this.lastMouseMoveEvent ? this.updateSnappedCoordinate(this.lastMouseMoveEvent) : this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0));
  }
  syncClosingPoints(e) {
    this.currentCoordinate >= 3 ? this.closingPoints.ids.length ? this.closingPoints.update(e) : this.closingPoints.create(e) : this.closingPoints.delete();
  }
  undo() {
    if (this.state !== "drawing" || !this.currentId) return;
    let e = this.undoRedo.beginUndo();
    if (!e) return;
    let { previousEntry: t2 } = e;
    if (!t2) {
      let e2 = this.currentId;
      this.currentId = void 0, this.currentCoordinate = 0, this.closingPoints.delete(), this.state === "drawing" && this.setStarted(), this.showCoordinatePoints && this.coordinatePoints.deletePointsByFeatureIds([e2]), this.mutateFeature.deleteFeatureIfPresent(e2), this.updateSnappedGuidancePointFromLastMouseMove();
      return;
    }
    let n2 = this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      coordinateMutations: {
        type: j,
        coordinates: t2.featureCoordinates
      },
      propertyMutations: {
        [l.CURRENTLY_DRAWING]: true,
        [l.COMMITTED_COORDINATE_COUNT]: t2.currentCoordinate,
        [l.PROVISIONAL_COORDINATE_COUNT]: t2.currentCoordinate
      },
      context: { updateType: o.Commit }
    });
    n2 && (this.currentCoordinate = t2.currentCoordinate, this.syncClosingPoints(n2.geometry.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: n2.geometry.coordinates
    }), this.updateSnappedGuidancePointFromLastMouseMove());
  }
  redoSize() {
    return this.undoRedo.redoSize();
  }
  redo() {
    let e = this.undoRedo.takeRedo();
    if (e) {
      if (this.currentId) {
        let t2 = this.mutateFeature.updatePolygon({
          featureId: this.currentId,
          coordinateMutations: {
            type: j,
            coordinates: e.featureCoordinates
          },
          propertyMutations: {
            [l.CURRENTLY_DRAWING]: true,
            [l.COMMITTED_COORDINATE_COUNT]: e.currentCoordinate,
            [l.PROVISIONAL_COORDINATE_COUNT]: e.currentCoordinate
          },
          context: { updateType: o.Commit }
        });
        if (!t2) return;
        this.currentCoordinate = e.currentCoordinate, this.syncClosingPoints(t2.geometry.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
          featureId: this.currentId,
          featureCoordinates: t2.geometry.coordinates
        });
      } else {
        let t2 = this.undoRedo.cloneCoordinates(e.featureCoordinates)[0], { id: n2, geometry: r2 } = this.mutateFeature.createPolygon({
          coordinates: t2,
          properties: {
            mode: this.mode,
            [l.CURRENTLY_DRAWING]: true,
            [l.COMMITTED_COORDINATE_COUNT]: e.currentCoordinate,
            [l.PROVISIONAL_COORDINATE_COUNT]: e.currentCoordinate
          }
        });
        this.currentId = n2, this.currentCoordinate = e.currentCoordinate, this.state === "started" && this.setDrawing(), this.syncClosingPoints(r2.coordinates), this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
          featureId: n2,
          featureCoordinates: r2.coordinates
        });
      }
      this.undoRedo.commitRedo(e), this.updateSnappedGuidancePointFromLastMouseMove();
    }
  }
  onMouseMove(e) {
    if (this.mouseMove = true, this.setCursor(this.cursors.start), this.lastMouseMoveEvent = e, this.updateSnappedCoordinate(e), this.currentId === void 0 || this.currentCoordinate === 0) return;
    let t2 = this.readFeature.getCoordinate(this.currentId, 0), n2 = [e.lng, e.lat], r2;
    if (this.currentCoordinate === 1) r2 = [{
      type: k,
      index: 1,
      coordinate: n2
    }, {
      type: k,
      index: 2,
      coordinate: [e.lng, e.lat]
    }];
    else if (this.currentCoordinate === 2) r2 = [{
      type: k,
      index: 2,
      coordinate: n2
    }];
    else {
      let { isClosing: i3, isPreviousClosing: a2 } = this.closingPoints.isPolygonClosingPoints(e);
      a2 || i3 ? (this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.setCursor(this.cursors.close), r2 = [{
        type: k,
        index: -1,
        coordinate: t2
      }, {
        type: k,
        index: -2,
        coordinate: t2
      }]) : r2 = [{
        type: k,
        index: -2,
        coordinate: n2
      }, {
        type: k,
        index: -1,
        coordinate: t2
      }];
    }
    let i2 = this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      coordinateMutations: r2,
      propertyMutations: { [l.PROVISIONAL_COORDINATE_COUNT]: this.currentCoordinate + 1 },
      context: { updateType: o.Provisional }
    });
    i2 && this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: this.currentId,
      featureCoordinates: i2.geometry.coordinates
    });
  }
  snapCoordinate(e) {
    var t2, n2, r2;
    let i2;
    if ((t2 = this.snapping) != null && t2.toLine) {
      let t3;
      t3 = this.currentId ? this.lineSnapping.getSnappableCoordinate(e, this.currentId) : this.lineSnapping.getSnappableCoordinateFirstClick(e), t3 && (i2 = t3);
    }
    if ((n2 = this.snapping) != null && n2.toCoordinate) {
      let t3;
      t3 = this.currentId ? this.coordinateSnapping.getSnappableCoordinate(e, this.currentId) : this.coordinateSnapping.getSnappableCoordinateFirstClick(e), t3 && (i2 = t3);
    }
    if ((r2 = this.snapping) != null && r2.toCustom) {
      let t3 = this.snapping.toCustom(e, {
        currentCoordinate: this.currentCoordinate,
        currentId: this.currentId,
        getCurrentGeometrySnapshot: this.currentId ? () => this.readFeature.getGeometry(this.currentId) : () => null,
        project: this.project,
        unproject: this.unproject
      });
      t3 && (i2 = t3);
    }
    return i2;
  }
  polygonFilter(e) {
    return !!(e.geometry.type === "Polygon" && e.properties && e.properties.mode === this.mode);
  }
  onRightClick(e) {
    if (!this.editable || this.state !== "started") return;
    let { featureId: t2, featureCoordinateIndex: n2 } = this.coordinateSnapping.getSnappable(e, (e2) => this.polygonFilter(e2));
    if (!t2 || n2 === void 0) return;
    let i2 = this.readFeature.getGeometry(t2);
    if (i2.type !== "Polygon") return;
    let a2 = i2.coordinates[0];
    if (a2.length <= 4) return;
    let s2;
    s2 = n2 === 0 || n2 === a2.length - 1 ? [
      {
        type: A,
        index: 0
      },
      {
        type: A,
        index: -1
      },
      {
        type: O,
        index: -1,
        coordinate: a2[1]
      }
    ] : [{
      type: A,
      index: n2
    }];
    let c2 = this.mutateFeature.updatePolygon({
      featureId: t2,
      coordinateMutations: s2,
      context: {
        updateType: o.Finish,
        action: r
      }
    });
    if (c2) {
      if (this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
        featureId: t2,
        featureCoordinates: c2.geometry.coordinates
      }), this.snappedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), this.snappedPointId = void 0, this.snapping)) {
        let t3 = this.snapCoordinate(e);
        if (t3) {
          let [e2] = this.mutateFeature.createGuidancePoints({
            type: l.SNAPPING_POINT,
            coordinates: [t3]
          });
          this.snappedPointId = e2;
        }
      }
      this.onFinish(t2, {
        mode: this.mode,
        action: r
      });
    }
  }
  onLeftClick(e) {
    this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0));
    let t2 = this.snapCoordinate(e) || [e.lng, e.lat];
    if (this.currentCoordinate === 0) {
      let { id: e2, geometry: n2 } = this.mutateFeature.createPolygon({
        coordinates: [
          t2,
          t2,
          t2,
          t2
        ],
        properties: {
          mode: this.mode,
          [l.CURRENTLY_DRAWING]: true,
          [l.COMMITTED_COORDINATE_COUNT]: this.currentCoordinate + 1,
          [l.PROVISIONAL_COORDINATE_COUNT]: this.currentCoordinate + 1
        }
      });
      this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
        featureId: e2,
        featureCoordinates: n2.coordinates
      }), this.currentId = e2, this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate), this.setDrawing();
    } else if (this.currentCoordinate === 1 && this.currentId) {
      if (this.readFeature.coordinateAtIndexIsIdentical({
        featureId: this.currentId,
        newCoordinate: t2,
        index: 0
      })) return;
      let e2 = this.mutateFeature.updatePolygon({
        featureId: this.currentId,
        coordinateMutations: [{
          type: k,
          index: 1,
          coordinate: t2
        }, {
          type: k,
          index: 2,
          coordinate: t2
        }],
        propertyMutations: { [l.COMMITTED_COORDINATE_COUNT]: this.currentCoordinate + 1 },
        context: { updateType: o.Commit }
      });
      if (!e2) return;
      this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
        featureId: this.currentId,
        featureCoordinates: e2.geometry.coordinates
      }), this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate);
    } else if (this.currentCoordinate === 2 && this.currentId) {
      if (this.readFeature.coordinateAtIndexIsIdentical({
        featureId: this.currentId,
        newCoordinate: t2,
        index: 1
      })) return;
      let e2 = this.mutateFeature.updatePolygon({
        featureId: this.currentId,
        coordinateMutations: [{
          type: k,
          index: 2,
          coordinate: t2
        }, {
          type: O,
          index: 2,
          coordinate: t2
        }],
        propertyMutations: { [l.COMMITTED_COORDINATE_COUNT]: this.currentCoordinate + 1 },
        context: { updateType: o.Commit }
      });
      if (!e2) return;
      this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
        featureId: this.currentId,
        featureCoordinates: e2.geometry.coordinates
      }), this.currentCoordinate === 2 && this.closingPoints.create(e2.geometry.coordinates), this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate);
    } else if (this.currentId) {
      let { isClosing: n2, isPreviousClosing: r2 } = this.closingPoints.isPolygonClosingPoints(e);
      if (r2 || n2) this.close();
      else {
        if (this.readFeature.coordinateAtIndexIsIdentical({
          featureId: this.currentId,
          newCoordinate: t2,
          index: this.currentCoordinate - 1
        })) return;
        let e2 = this.mutateFeature.updatePolygon({
          featureId: this.currentId,
          coordinateMutations: [{
            type: _e,
            index: -1,
            coordinate: t2
          }],
          propertyMutations: { [l.COMMITTED_COORDINATE_COUNT]: this.currentCoordinate + 1 },
          context: { updateType: o.Commit }
        });
        if (!e2) return;
        this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
          featureId: this.currentId,
          featureCoordinates: e2.geometry.coordinates
        }), this.currentCoordinate++, this.pushHistorySnapshot(this.currentId, this.currentCoordinate), this.closingPoints.ids.length && this.closingPoints.update(e2.geometry.coordinates);
      }
    }
  }
  onClick(e) {
    this.currentCoordinate > 0 && !this.mouseMove && this.onMouseMove(e), this.mouseMove = false, e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e) ? this.onRightClick(e) : e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) && this.onLeftClick(e);
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && this.close();
  }
  onKeyDown() {
  }
  onDragStart(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragStart, e) || !this.editable) return;
    let n2;
    if (this.state === "started") {
      let t3 = this.lineSnapping.getSnappable(e, (e2) => this.polygonFilter(e2));
      t3.coordinate && (this.editedSnapType = "line", this.editedFeatureCoordinateIndex = t3.featureCoordinateIndex, this.editedFeatureId = t3.featureId, n2 = t3.coordinate);
      let r2 = this.coordinateSnapping.getSnappable(e, (e2) => this.polygonFilter(e2));
      r2.coordinate && (this.editedSnapType = "coordinate", this.editedFeatureCoordinateIndex = r2.featureCoordinateIndex, this.editedFeatureId = r2.featureId, n2 = r2.coordinate);
    }
    this.editedFeatureId && n2 && (this.editedPointId || (this.editedPointId = this.mutateFeature.createGuidancePoint({
      coordinate: n2,
      type: l.EDITED
    })), this.setCursor(this.cursors.dragStart), t2(false));
  }
  onDrag(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDrag, e) || this.editedFeatureId === void 0 || this.editedFeatureCoordinateIndex === void 0) return;
    let n2 = this.readFeature.getGeometry(this.editedFeatureId), r2 = [e.lng, e.lat], i2 = [];
    if (this.editedSnapType === "coordinate" || this.editedSnapType === "line" && this.editedInsertIndex !== void 0 ? i2 = this.editedFeatureCoordinateIndex === 0 || this.editedFeatureCoordinateIndex === n2.coordinates[0].length - 1 ? [{
      type: k,
      index: 0,
      coordinate: r2
    }, {
      type: k,
      index: -1,
      coordinate: r2
    }] : [{
      type: k,
      index: this.editedFeatureCoordinateIndex,
      coordinate: r2
    }] : this.editedSnapType === "line" && this.editedInsertIndex === void 0 && (this.editedInsertIndex = this.editedFeatureCoordinateIndex + 1, i2 = [{
      type: _e,
      index: this.editedInsertIndex,
      coordinate: r2
    }], this.editedFeatureCoordinateIndex++), i2.length === 0) return;
    let a2 = this.mutateFeature.updatePolygon({
      featureId: this.editedFeatureId,
      coordinateMutations: i2,
      propertyMutations: { [l.EDITED]: true },
      context: { updateType: o.Provisional }
    });
    a2 && (this.showCoordinatePoints && (this.editedInsertIndex ? this.coordinatePoints.createOrUpdate({
      featureId: this.editedFeatureId,
      featureCoordinates: a2.geometry.coordinates
    }) : this.coordinatePoints.updateOneAtIndex(this.editedFeatureId, this.editedFeatureCoordinateIndex, a2.geometry.coordinates[0][this.editedFeatureCoordinateIndex])), this.snapping && this.snappedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), this.snappedPointId = void 0), this.editedPointId && this.mutateFeature.updateGuidancePoints([{
      featureId: this.editedPointId,
      coordinate: r2
    }]));
  }
  onDragEnd(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, e) || this.editedFeatureId === void 0 || (this.setCursor(this.cursors.dragEnd), !this.mutateFeature.updatePolygon({
      featureId: this.editedFeatureId,
      propertyMutations: { [l.EDITED]: false },
      context: {
        updateType: o.Finish,
        action: r
      }
    }))) return;
    let n2 = this.editedFeatureId;
    this.editedPointId && (this.editedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), void 0)), this.snappedPointId && (this.snappedPointId = (this.mutateFeature.deleteFeatureIfPresent(this.snappedPointId), void 0)), this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedInsertIndex = void 0, this.editedSnapType = void 0, t2(true), this.onFinish(n2, {
      mode: this.mode,
      action: r
    });
  }
  cleanUp() {
    let e = this.currentId, t2 = this.snappedPointId, n2 = this.editedPointId;
    this.currentId = void 0, this.snappedPointId = void 0, this.editedPointId = void 0, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedInsertIndex = void 0, this.editedSnapType = void 0, this.currentCoordinate = 0, this.undoRedo.clear(), this.state === "drawing" && this.setStarted(), e && this.coordinatePoints.deletePointsByFeatureIds([e]), this.mutateFeature.deleteFeatureIfPresent(e), this.mutateFeature.deleteFeatureIfPresent(n2), this.mutateFeature.deleteFeatureIfPresent(t2), this.closingPoints.ids.length && this.closingPoints.delete();
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    if (e.properties.mode === this.mode) {
      if (e.geometry.type === "Polygon") return n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.zIndex = u, n2;
      if (e.geometry.type === "Point") {
        let t2 = e.properties[l.EDITED], r2 = e.properties[l.COORDINATE_POINT], i2 = t2 ? "editedPoint" : e.properties[l.CLOSING_POINT] ? "closingPoint" : e.properties[l.SNAPPING_POINT] ? "snappingPoint" : r2 ? "coordinatePoint" : void 0;
        if (!i2) return n2;
        let a2 = {
          editedPoint: {
            width: this.styles.editedPointOutlineWidth,
            color: this.styles.editedPointColor,
            opacity: this.styles.editedPointOpacity,
            outlineColor: this.styles.editedPointOutlineColor,
            outlineWidth: this.styles.editedPointOutlineWidth,
            outlineOpacity: this.styles.editedPointOutlineOpacity
          },
          closingPoint: {
            width: this.styles.closingPointWidth,
            color: this.styles.closingPointColor,
            opacity: this.styles.closingPointOpacity,
            outlineColor: this.styles.closingPointOutlineColor,
            outlineWidth: this.styles.closingPointOutlineWidth,
            outlineOpacity: this.styles.closingPointOutlineOpacity
          },
          snappingPoint: {
            width: this.styles.snappingPointWidth,
            color: this.styles.snappingPointColor,
            opacity: this.styles.snappingPointOpacity,
            outlineColor: this.styles.snappingPointOutlineColor,
            outlineWidth: this.styles.snappingPointOutlineWidth,
            outlineOpacity: this.styles.snappingPointOutlineOpacity
          },
          coordinatePoint: {
            width: this.styles.coordinatePointWidth,
            color: this.styles.coordinatePointColor,
            opacity: this.styles.coordinatePointOpacity,
            outlineColor: this.styles.coordinatePointOutlineColor,
            outlineWidth: this.styles.coordinatePointOutlineWidth,
            outlineOpacity: this.styles.coordinatePointOutlineOpacity
          }
        };
        return n2.pointWidth = this.getNumericStylingValue(a2[i2].width, n2.pointWidth, e), n2.pointOpacity = this.getNumericStylingValue(a2[i2].opacity, 1, e), n2.pointColor = this.getHexColorStylingValue(a2[i2].color, n2.pointColor, e), n2.pointOutlineColor = this.getHexColorStylingValue(a2[i2].outlineColor, n2.pointOutlineColor, e), n2.pointOutlineOpacity = this.getNumericStylingValue(a2[i2].outlineOpacity, 1, e), n2.pointOutlineWidth = this.getNumericStylingValue(a2[i2].outlineWidth, 2, e), n2.zIndex = t2 ? 40 : r2 ? 20 : 30, n2;
      }
    }
    return n2;
  }
  afterFeatureAdded(e) {
    this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: e.id,
      featureCoordinates: e.geometry.coordinates
    });
  }
  afterFeatureUpdated(e) {
    this.showCoordinatePoints && this.coordinatePoints.createOrUpdate({
      featureId: e.id,
      featureCoordinates: e.geometry.coordinates
    }), this.editedFeatureId === e.id && this.editedPointId && (this.mutateFeature.deleteFeatureIfPresent(this.editedPointId), this.editedPointId = void 0, this.editedFeatureId = void 0, this.editedFeatureCoordinateIndex = void 0, this.editedSnapType = void 0), this.snappedPointId && this.lastMouseMoveEvent && this.updateSnappedCoordinate(this.lastMouseMoveEvent), this.currentId === e.id && (this.currentCoordinate = 0, this.currentId = void 0, this.undoRedo.clear(), this.closingPoints.delete(), this.state === "drawing" && this.setStarted());
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => me(e2, this.coordinatePrecision));
  }
};
var ct = {
  cancel: "Escape",
  finish: "Enter"
};
var lt = { start: "crosshair" };
var ut = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "rectangle", this.startPosition = void 0, this.endPosition = void 0, this.currentRectangleId = void 0, this.keyEvents = ct, this.cursors = lt, this.drawInteraction = "click-move", this.drawType = void 0, this.mutateFeature = void 0, this.readFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.drawInteraction && (this.drawInteraction = e.drawInteraction);
  }
  updateRectangle(e, t2) {
    if (!this.startPosition || !this.currentRectangleId) return;
    let r2 = t2 === o.Finish;
    return this.mutateFeature.updatePolygon({
      featureId: this.currentRectangleId,
      coordinateMutations: [
        {
          type: k,
          index: 1,
          coordinate: [e[0], this.startPosition[1]]
        },
        {
          type: k,
          index: 2,
          coordinate: e
        },
        {
          type: k,
          index: 3,
          coordinate: [this.startPosition[0], e[1]]
        }
      ],
      propertyMutations: r2 ? { [l.CURRENTLY_DRAWING]: void 0 } : {},
      context: r2 ? {
        updateType: t2,
        action: n
      } : { updateType: t2 }
    });
  }
  close() {
    if (!this.currentRectangleId || !this.endPosition || !this.updateRectangle(this.endPosition, o.Finish)) return;
    let e = this.currentRectangleId;
    this.startPosition = void 0, this.currentRectangleId = void 0, this.drawType = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  beginDrawing(e, t2 = "click") {
    this.startPosition = [e.lng, e.lat], this.endPosition = [e.lng, e.lat];
    let n2 = this.mutateFeature.createPolygon({
      coordinates: [
        [e.lng, e.lat],
        [e.lng, e.lat],
        [e.lng, e.lat],
        [e.lng, e.lat],
        [e.lng, e.lat]
      ],
      properties: {
        mode: this.mode,
        [l.CURRENTLY_DRAWING]: true
      }
    });
    this.currentRectangleId = n2.id, this.drawType = t2, this.setDrawing();
  }
  moveDrawAllowed() {
    return this.drawInteraction === "click-move" || this.drawInteraction === "click-move-or-drag";
  }
  dragDrawAllowed() {
    return this.drawInteraction === "click-drag" || this.drawInteraction === "click-move-or-drag";
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onClick(e) {
    this.moveDrawAllowed() && (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) && (this.startPosition ? (this.endPosition = [e.lng, e.lat], this.close()) : this.beginDrawing(e));
  }
  onMouseMove(e) {
    this.endPosition = [e.lng, e.lat], this.updateRectangle(this.endPosition, o.Provisional);
  }
  onKeyDown() {
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && this.close();
  }
  onDragStart(e, t2) {
    this.state !== "drawing" && this.allowPointerEvent(this.pointerEvents.onDragStart, e) && this.dragDrawAllowed() && (this.beginDrawing(e, "drag"), t2(false));
  }
  onDrag(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDrag, e) && this.dragDrawAllowed() && this.drawType === "drag" && (this.endPosition = [e.lng, e.lat], this.updateRectangle(this.endPosition, o.Provisional));
  }
  onDragEnd(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDragEnd, e) && this.dragDrawAllowed() && this.drawType === "drag" && (this.endPosition = [e.lng, e.lat], this.close(), t2(true));
  }
  cleanUp() {
    let e = this.currentRectangleId;
    this.startPosition = void 0, this.currentRectangleId = void 0, this.drawType = void 0, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e);
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.type === "Feature" && e.geometry.type === "Polygon" && e.properties.mode === this.mode ? (n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u, n2) : n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => he(e2, this.coordinatePrecision));
  }
  afterFeatureUpdated(e) {
    this.currentRectangleId === e.id && (this.startPosition = void 0, this.currentRectangleId = void 0, this.drawType = void 0, this.state === "drawing" && this.setStarted());
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate });
  }
};
var V = class extends _ {
  constructor(e) {
    if (!e.modeName) throw Error("Mode name is required for TerraDrawRenderMode");
    super(e, true), this.type = h.Render, this.mode = "render", this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e);
  }
  registerBehaviors(e) {
    this.mode = e.mode;
  }
  start() {
    this.setStarted();
  }
  stop() {
    this.setStopped();
  }
  onKeyUp() {
  }
  onKeyDown() {
  }
  onClick() {
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  onMouseMove() {
  }
  cleanUp() {
  }
  styleFeature(e) {
    return {
      pointColor: this.getHexColorStylingValue(this.styles.pointColor, "#3f97e0", e),
      pointWidth: this.getNumericStylingValue(this.styles.pointWidth, 6, e),
      pointOpacity: this.getNumericStylingValue(this.styles.pointOpacity, 1, e),
      pointOutlineColor: this.getHexColorStylingValue(this.styles.pointOutlineColor, "#ffffff", e),
      pointOutlineWidth: this.getNumericStylingValue(this.styles.pointOutlineWidth, 0, e),
      pointOutlineOpacity: this.getNumericStylingValue(this.styles.pointOutlineOpacity, 1, e),
      polygonFillColor: this.getHexColorStylingValue(this.styles.polygonFillColor, "#3f97e0", e),
      polygonFillOpacity: this.getNumericStylingValue(this.styles.polygonFillOpacity, 0.3, e),
      polygonOutlineColor: this.getHexColorStylingValue(this.styles.polygonOutlineColor, "#3f97e0", e),
      polygonOutlineWidth: this.getNumericStylingValue(this.styles.polygonOutlineWidth, 4, e),
      lineStringWidth: this.getNumericStylingValue(this.styles.lineStringWidth, 4, e),
      lineStringColor: this.getHexColorStylingValue(this.styles.lineStringColor, "#3f97e0", e),
      lineStringOpacity: this.getNumericStylingValue(this.styles.lineStringOpacity, 1, e),
      zIndex: this.getNumericStylingValue(this.styles.zIndex, 0, e),
      lineStringDash: void 0
    };
  }
  validateFeature(e) {
    let t2 = super.validateFeature(e);
    if (t2.valid) {
      let t3 = e, n2 = tt(t3, this.coordinatePrecision).valid || me(t3, this.coordinatePrecision).valid || Pe(t3, this.coordinatePrecision).valid;
      return n2 ? { valid: true } : {
        valid: n2,
        reason: "Feature is not a valid Point, Polygon or LineString feature"
      };
    }
    return t2;
  }
};
function dt(e, t2) {
  let n2 = e, r2 = t2, i2 = x(n2[1]), a2 = x(r2[1]), o2 = x(r2[0] - n2[0]);
  o2 > Math.PI && (o2 -= 2 * Math.PI), o2 < -Math.PI && (o2 += 2 * Math.PI);
  let s2 = Math.log(Math.tan(a2 / 2 + Math.PI / 4) / Math.tan(i2 / 2 + Math.PI / 4)), c2 = (S(Math.atan2(o2, s2)) + 360) % 360;
  return c2 > 180 ? -(360 - c2) : c2;
}
function ft(e, t2, n2) {
  let r2 = t2;
  t2 < 0 && (r2 = -Math.abs(r2));
  let i2 = r2 / b, a2 = e[0] * Math.PI / 180, o2 = x(e[1]), s2 = x(n2), c2 = i2 * Math.cos(s2), l2 = o2 + c2;
  Math.abs(l2) > Math.PI / 2 && (l2 = l2 > 0 ? Math.PI - l2 : -Math.PI - l2);
  let u2 = Math.log(Math.tan(l2 / 2 + Math.PI / 4) / Math.tan(o2 / 2 + Math.PI / 4)), d2 = Math.abs(u2) > 1e-11 ? c2 / u2 : Math.cos(o2), f2 = [(180 * (a2 + i2 * Math.sin(s2) / d2) / Math.PI + 540) % 360 - 180, 180 * l2 / Math.PI];
  return f2[0] += f2[0] - e[0] > 180 ? -360 : e[0] - f2[0] > 180 ? 360 : 0, f2;
}
function pt(e, t2, n2, r2, i2) {
  let a2 = r2(e[0], e[1]), o2 = r2(t2[0], t2[1]), { lng: s2, lat: c2 } = i2((a2.x + o2.x) / 2, (a2.y + o2.y) / 2);
  return [C(s2, n2), C(c2, n2)];
}
function mt(e, t2, n2) {
  let r2 = ft(e, 1e3 * y(e, t2) / 2, dt(e, t2));
  return [C(r2[0], n2), C(r2[1], n2)];
}
function ht({ featureCoords: e, precision: t2, unproject: n2, project: r2, projection: i2 }) {
  let a2 = [];
  for (let o2 = 0; o2 < e.length - 1; o2++) {
    let s2;
    if (i2 === "web-mercator") s2 = pt(e[o2], e[o2 + 1], t2, r2, n2);
    else {
      if (i2 !== "globe") throw Error("Invalid projection");
      s2 = mt(e[o2], e[o2 + 1], t2);
    }
    a2.push(s2);
  }
  return a2;
}
var gt = class extends D {
  constructor(e, t2, n2, r2, i2, a2) {
    super(e), this.config = void 0, this.selectionPointBehavior = void 0, this.coordinatePointBehavior = void 0, this.mutateFeature = void 0, this.readFeature = void 0, this.pixelDistance = void 0, this._midPoints = [], this.config = e, this.selectionPointBehavior = t2, this.coordinatePointBehavior = n2, this.mutateFeature = r2, this.readFeature = i2, this.pixelDistance = a2;
  }
  getMidpointConfig(e) {
    return {
      featureCoords: e,
      precision: this.coordinatePrecision,
      project: this.config.project,
      unproject: this.config.unproject,
      projection: this.config.projection
    };
  }
  get ids() {
    return this._midPoints.concat();
  }
  set ids(e) {
  }
  getNearestMidPoint(e) {
    let t2, n2 = Infinity;
    return this.ids.forEach((r2) => {
      let i2 = this.readFeature.getGeometry(r2), a2 = this.pixelDistance.measure(e, i2.coordinates);
      a2 < this.pointerDistance && a2 < n2 && (n2 = a2, t2 = r2);
    }), t2;
  }
  insert({ featureId: e, midPointId: t2 }) {
    let n2 = this.readFeature.getGeometry(t2), { midPointFeatureId: r2, midPointSegment: i2 } = this.readFeature.getProperties(t2), a2 = this.readFeature.getGeometry(r2), s2 = {
      featureId: r2,
      coordinateMutations: [{
        type: O,
        index: i2,
        coordinate: n2.coordinates
      }],
      context: { updateType: o.Commit }
    }, c2 = null;
    if (a2.type === "Polygon") c2 = this.mutateFeature.updatePolygon(s2);
    else {
      if (a2.type !== "LineString") throw Error("Midpoints can only be added to polygons or linestrings");
      c2 = this.mutateFeature.updateLineString(s2);
    }
    if (!c2) throw Error("Failed to insert midpoint coordinate");
    let u2 = c2.geometry.coordinates;
    this.readFeature.getProperties(e)[l.COORDINATE_POINT_IDS] && this.coordinatePointBehavior.createOrUpdate({
      featureId: e,
      featureCoordinates: u2
    }), this.mutateFeature.deleteFeaturesIfPresent([...this.selectionPointBehavior.ids, ...this._midPoints]), this.create({
      featureCoordinates: u2,
      featureId: r2
    }), this.selectionPointBehavior.create({
      featureCoordinates: u2,
      featureId: e
    });
  }
  create({ featureCoordinates: e, featureId: t2 }) {
    if (!this.readFeature.hasFeature(t2)) throw Error("Store does not have feature with this id");
    let n2 = He(e), r2 = ht(this.getMidpointConfig(n2));
    this._midPoints = this.mutateFeature.createGuidancePoints({
      additionalProperties: (e2) => ({
        mode: this.mode,
        midPointSegment: e2,
        midPointFeatureId: t2,
        [c.MID_POINT]: true
      }),
      coordinates: r2,
      type: c.MID_POINT
    });
  }
  delete() {
    this._midPoints.length && (this.mutateFeature.deleteFeaturesIfPresent(this._midPoints), this._midPoints = []);
  }
  updateAllInPlace({ featureCoordinates: e }) {
    if (this._midPoints.length === 0) return;
    let t2 = He(e), n2 = ht(this.getMidpointConfig(t2));
    this.mutateFeature.updateGuidancePoints(this._midPoints.map((e2, t3) => ({
      featureId: e2,
      coordinate: n2[t3]
    })));
  }
  updateOneAtIndex(e, t2) {
    if (e < 0 && (e = this._midPoints.length + e), this._midPoints[e] === void 0) return;
    let n2 = He(t2), r2 = ht(this.getMidpointConfig(n2));
    this.mutateFeature.updateGuidancePoints([{
      featureId: this._midPoints[e],
      coordinate: r2[e]
    }]);
  }
};
var _t = class extends D {
  constructor(e, t2) {
    super(e), this.mutateFeature = void 0, this._selectionPoints = [], this.mutateFeature = t2;
  }
  get ids() {
    return this._selectionPoints.concat();
  }
  set ids(e) {
  }
  create({ featureId: e, featureCoordinates: t2 }) {
    let n2 = Ve(t2);
    this._selectionPoints = this.mutateFeature.createGuidancePoints({
      coordinates: n2,
      type: c.SELECTION_POINT,
      additionalProperties: (t3) => ({
        [c.SELECTION_POINT_FEATURE_ID]: e,
        index: t3
      })
    });
  }
  delete() {
    this.ids.length && (this.mutateFeature.deleteFeaturesIfPresent(this.ids), this._selectionPoints = []);
  }
  updateAllInPlace({ featureCoordinates: e }) {
    if (this._selectionPoints.length === 0) return;
    let t2 = Ve(e);
    t2.length === this._selectionPoints.length && this.mutateFeature.updateGuidancePoints(this._selectionPoints.map((e2, n2) => ({
      featureId: e2,
      coordinate: t2[n2]
    })));
  }
  updateOneAtIndex(e, t2) {
    this._selectionPoints[e] !== void 0 && this.mutateFeature.updateGuidancePoints([{
      featureId: this._selectionPoints[e],
      coordinate: t2
    }]);
  }
};
function vt(e, t2) {
  let n2 = false;
  for (let o2 = 0, s2 = t2.length; o2 < s2; o2++) {
    let s3 = t2[o2];
    for (let t3 = 0, o3 = s3.length, c2 = o3 - 1; t3 < o3; c2 = t3++) (i2 = s3[t3])[1] > (r2 = e)[1] != (a2 = s3[c2])[1] > r2[1] && r2[0] < (a2[0] - i2[0]) * (r2[1] - i2[1]) / (a2[1] - i2[1]) + i2[0] && (n2 = !n2);
  }
  var r2, i2, a2;
  return n2;
}
var yt = (e, t2, n2) => {
  let r2 = (e2) => e2 * e2, i2 = (e2, t3) => r2(e2.x - t3.x) + r2(e2.y - t3.y);
  return Math.sqrt(((e2, t3, n3) => {
    let r3 = i2(t3, n3);
    if (r3 === 0) return i2(e2, t3);
    let a2 = ((e2.x - t3.x) * (n3.x - t3.x) + (e2.y - t3.y) * (n3.y - t3.y)) / r3;
    return a2 = Math.max(0, Math.min(1, a2)), i2(e2, {
      x: t3.x + a2 * (n3.x - t3.x),
      y: t3.y + a2 * (n3.y - t3.y)
    });
  })(e, t2, n2));
};
var bt = class extends D {
  constructor(e, t2, n2) {
    super(e), this.config = void 0, this.createClickBoundingBox = void 0, this.pixelDistance = void 0, this.config = e, this.createClickBoundingBox = t2, this.pixelDistance = n2;
  }
  find(e, t2) {
    let n2, r2, i2, a2 = Infinity, o2 = Infinity, s2 = this.createClickBoundingBox.create(e), l2 = this.store.search(s2);
    for (let s3 = 0; s3 < l2.length; s3++) {
      let u2 = l2[s3], d2 = u2.geometry;
      if (d2.type === "Point") {
        if (u2.properties.selectionPoint || u2.properties.coordinatePoint || !t2 && u2.properties[c.MID_POINT]) continue;
        let r3 = this.pixelDistance.measure(e, d2.coordinates);
        !u2.properties[c.MID_POINT] && r3 < this.pointerDistance && r3 < a2 && (a2 = r3, n2 = u2);
      } else if (d2.type === "LineString") {
        if (n2) continue;
        for (let t3 = 0; t3 < d2.coordinates.length - 1; t3++) {
          let n3 = d2.coordinates[t3], i3 = d2.coordinates[t3 + 1], a3 = yt({
            x: e.containerX,
            y: e.containerY
          }, this.project(n3[0], n3[1]), this.project(i3[0], i3[1]));
          a3 < this.pointerDistance && a3 < o2 && (o2 = a3, r2 = u2);
        }
      } else if (d2.type === "Polygon") {
        if (n2 || r2) continue;
        vt([e.lng, e.lat], d2.coordinates) && (i2 = u2);
      }
    }
    return { clickedFeature: n2 || r2 || i2 };
  }
};
var xt = class extends D {
  constructor(e, t2, n2, r2, i2, a2, o2) {
    super(e), this.config = void 0, this.featuresAtCursorEvent = void 0, this.selectionPoints = void 0, this.midPoints = void 0, this.coordinatePoints = void 0, this.readFeature = void 0, this.mutateFeature = void 0, this.draggedFeatureId = null, this.dragPosition = void 0, this.config = e, this.featuresAtCursorEvent = t2, this.selectionPoints = n2, this.midPoints = r2, this.coordinatePoints = i2, this.readFeature = a2, this.mutateFeature = o2;
  }
  startDragging(e, t2) {
    this.draggedFeatureId = t2, this.dragPosition = [e.lng, e.lat];
  }
  stopDragging() {
    this.draggedFeatureId = null, this.dragPosition = void 0;
  }
  isDragging() {
    return this.draggedFeatureId !== null;
  }
  canDrag(e, t2) {
    let { clickedFeature: n2 } = this.featuresAtCursorEvent.find(e, true);
    return !(!n2 || n2.id !== t2);
  }
  drag(e) {
    if (!this.draggedFeatureId) return;
    let t2 = this.readFeature.getGeometry(this.draggedFeatureId), n2 = [e.lng, e.lat];
    if (t2.type === "Polygon" || t2.type === "LineString") {
      let r2, i2;
      if (t2.type === "Polygon" ? (r2 = t2.coordinates[0], i2 = r2.length - 1) : (r2 = t2.coordinates, i2 = r2.length), !this.dragPosition) return false;
      for (let e2 = 0; e2 < i2; e2++) {
        let t3 = r2[e2], i3, a3;
        if (this.config.projection === "web-mercator") {
          let e3 = T(this.dragPosition[0], this.dragPosition[1]), r3 = T(n2[0], n2[1]), o2 = T(t3[0], t3[1]), s3 = {
            x: e3.x - r3.x,
            y: e3.y - r3.y
          }, { lng: c3, lat: l2 } = E(o2.x - s3.x, o2.y - s3.y);
          i3 = c3, a3 = l2;
        } else {
          let e3 = [this.dragPosition[0] - n2[0], this.dragPosition[1] - n2[1]];
          i3 = t3[0] - e3[0], a3 = t3[1] - e3[1];
        }
        if (i3 = C(i3, this.config.coordinatePrecision), a3 = C(a3, this.config.coordinatePrecision), i3 > 180 || i3 < -180 || a3 > 90 || a3 < -90) return false;
        r2[e2] = [i3, a3];
      }
      t2.type === "Polygon" && (r2[r2.length - 1] = [r2[0][0], r2[0][1]]);
      let a2 = this.draggedFeatureId, s2 = null;
      if (t2.type === "Polygon") s2 = this.mutateFeature.updatePolygon({
        featureId: a2,
        coordinateMutations: {
          type: j,
          coordinates: [r2]
        },
        context: { updateType: o.Provisional }
      });
      else {
        if (t2.type !== "LineString") return;
        s2 = this.mutateFeature.updateLineString({
          featureId: a2,
          coordinateMutations: {
            type: j,
            coordinates: r2
          },
          context: { updateType: o.Provisional }
        });
      }
      if (!s2) return false;
      let c2 = s2.geometry.coordinates;
      this.midPoints.updateAllInPlace({ featureCoordinates: c2 }), this.selectionPoints.updateAllInPlace({ featureCoordinates: c2 }), this.coordinatePoints.updateAllInPlace({
        featureId: a2,
        featureCoordinates: c2
      }), this.dragPosition = [e.lng, e.lat];
    } else t2.type === "Point" && (this.mutateFeature.updatePoint({
      featureId: this.draggedFeatureId,
      coordinateMutations: {
        type: j,
        coordinates: n2
      },
      context: { updateType: o.Provisional }
    }), this.dragPosition = [e.lng, e.lat]);
  }
};
var St = class extends D {
  constructor(e, t2, n2, r2, i2, a2, o2, s2, c2) {
    super(e), this.config = void 0, this.pixelDistance = void 0, this.selectionPoints = void 0, this.midPoints = void 0, this.coordinatePoints = void 0, this.coordinateSnapping = void 0, this.lineSnapping = void 0, this.readFeature = void 0, this.mutateFeature = void 0, this.draggedCoordinate = {
      id: null,
      index: -1
    }, this.config = e, this.pixelDistance = t2, this.selectionPoints = n2, this.midPoints = r2, this.coordinatePoints = i2, this.coordinateSnapping = a2, this.lineSnapping = o2, this.readFeature = s2, this.mutateFeature = c2;
  }
  getClosestCoordinate(e, t2) {
    let n2 = {
      dist: Infinity,
      index: -1,
      isFirstOrLastPolygonCoord: false
    }, r2;
    if (t2.type === "LineString") r2 = t2.coordinates;
    else {
      if (t2.type !== "Polygon") return n2;
      r2 = t2.coordinates[0];
    }
    for (let i2 = 0; i2 < r2.length; i2++) {
      let a2 = this.pixelDistance.measure(e, r2[i2]);
      if (a2 < this.pointerDistance && a2 < n2.dist) {
        let e2 = t2.type === "Polygon" && (i2 === r2.length - 1 || i2 === 0);
        n2.dist = a2, n2.index = e2 ? 0 : i2, n2.isFirstOrLastPolygonCoord = e2;
      }
    }
    return n2;
  }
  getDraggable(e, t2) {
    let n2 = this.readFeature.getGeometry(t2);
    return this.getClosestCoordinate(e, n2);
  }
  getDraggableIndex(e, t2) {
    let n2 = this.readFeature.getGeometry(t2), r2 = this.getClosestCoordinate(e, n2);
    return r2.index === -1 ? -1 : r2.index;
  }
  snapCoordinate(e, t2, n2) {
    let r2 = [e.lng, e.lat], i2 = (e2) => !!(e2.properties && e2.properties.mode === n2.properties.mode && e2.id !== this.draggedCoordinate.id);
    if (t2 != null && t2.toLine) {
      let t3;
      t3 = this.lineSnapping.getSnappable(e, i2).coordinate, t3 && (r2 = t3);
    }
    if (t2.toCoordinate) {
      let t3;
      t3 = this.coordinateSnapping.getSnappable(e, i2).coordinate, t3 && (r2 = t3);
    }
    if (t2 != null && t2.toCustom) {
      let i3;
      i3 = t2.toCustom(e, {
        currentCoordinate: this.draggedCoordinate.index,
        currentId: n2.id,
        getCurrentGeometrySnapshot: n2.id ? () => this.readFeature.getGeometry(n2.id) : () => null,
        project: this.project,
        unproject: this.unproject
      }), i3 && (r2 = i3);
    }
    return r2;
  }
  drag(e, t2, n2) {
    let r2 = this.draggedCoordinate.id;
    if (r2 === null) return false;
    let i2 = this.draggedCoordinate.index, a2 = this.readFeature.getGeometry(r2), s2 = this.readFeature.getProperties(r2), c2 = a2.type === "LineString" ? a2.coordinates : a2.coordinates[0], l2 = a2.type === "Polygon" && (i2 === c2.length - 1 || i2 === 0), u2 = this.snapCoordinate(e, n2, {
      type: "Feature",
      id: r2,
      geometry: a2,
      properties: s2
    });
    if (e.lng > 180 || e.lng < -180 || e.lat > 90 || e.lat < -90) return false;
    if (l2) {
      let e2 = c2.length - 1;
      c2[0] = u2, c2[e2] = u2;
    } else c2[i2] = u2;
    if (a2.type !== "Point" && !t2 && ae({
      type: "Feature",
      geometry: a2,
      properties: {}
    })) return false;
    let d2 = r2, f2 = null;
    return a2.type === "Polygon" ? f2 = this.mutateFeature.updatePolygon({
      featureId: d2,
      coordinateMutations: {
        type: j,
        coordinates: [c2]
      },
      context: { updateType: o.Provisional }
    }) : a2.type === "LineString" && (f2 = this.mutateFeature.updateLineString({
      featureId: d2,
      coordinateMutations: {
        type: j,
        coordinates: c2
      },
      context: { updateType: o.Provisional }
    })), !!f2 && (this.midPoints.updateOneAtIndex(i2 > 0 ? i2 - 1 : -1, c2), this.midPoints.updateOneAtIndex(i2, c2), this.selectionPoints.updateOneAtIndex(i2, u2), this.coordinatePoints.updateOneAtIndex(d2, i2, u2), true);
  }
  isDragging() {
    return this.draggedCoordinate.id !== null;
  }
  startDragging(e, t2) {
    this.draggedCoordinate = {
      id: e,
      index: t2
    };
  }
  stopDragging() {
    this.draggedCoordinate = {
      id: null,
      index: -1
    };
  }
};
function Ct(e) {
  let t2 = 0, n2 = 0, r2 = 0;
  return (e.geometry.type === "Polygon" ? e.geometry.coordinates[0].slice(0, -1) : e.geometry.coordinates).forEach((e2) => {
    t2 += e2[0], n2 += e2[1], r2++;
  }, true), [t2 / r2, n2 / r2];
}
var wt = (e, t2) => {
  if (t2 === 0 || t2 === 360 || t2 === -360) return e;
  let n2 = 0.017453292519943295 * t2, r2 = (e.geometry.type === "Polygon" ? e.geometry.coordinates[0] : e.geometry.coordinates).map(([e2, t3]) => T(e2, t3)), i2 = r2.reduce((e2, t3) => ({
    x: e2.x + t3.x,
    y: e2.y + t3.y
  }), {
    x: 0,
    y: 0
  });
  i2.x /= r2.length, i2.y /= r2.length;
  let a2 = r2.map((e2) => ({
    x: i2.x + (e2.x - i2.x) * Math.cos(n2) - (e2.y - i2.y) * Math.sin(n2),
    y: i2.y + (e2.x - i2.x) * Math.sin(n2) + (e2.y - i2.y) * Math.cos(n2)
  })).map(({ x: e2, y: t3 }) => [E(e2, t3).lng, E(e2, t3).lat]);
  return e.geometry.type === "Polygon" ? e.geometry.coordinates[0] = a2 : e.geometry.coordinates = a2, e;
};
function Tt(e) {
  let t2 = (e.geometry.type === "Polygon" ? e.geometry.coordinates[0] : e.geometry.coordinates).map((e2) => {
    let { x: t3, y: n2 } = T(e2[0], e2[1]);
    return [t3, n2];
  });
  return e.geometry.type === "Polygon" ? (function(e2) {
    let t3 = 0, n2 = 0, r2 = 0, i2 = e2.length;
    for (let a2 = 0; a2 < i2 - 1; a2++) {
      let [i3, o2] = e2[a2], [s2, c2] = e2[a2 + 1], l2 = i3 * c2 - s2 * o2;
      t3 += l2, n2 += (i3 + s2) * l2, r2 += (o2 + c2) * l2;
    }
    return t3 /= 2, n2 /= 6 * t3, r2 /= 6 * t3, {
      x: n2,
      y: r2
    };
  })(t2) : (function(e2) {
    let t3 = e2.length, n2 = 0, r2 = 0;
    for (let i2 = 0; i2 < t3; i2++) {
      let [t4, a2] = e2[i2];
      n2 += t4, r2 += a2;
    }
    return {
      x: n2 / t3,
      y: r2 / t3
    };
  })(t2);
}
var Et = class extends D {
  constructor(e, t2, n2, r2, i2, a2) {
    super(e), this.config = void 0, this.selectionPoints = void 0, this.midPoints = void 0, this.coordinatePoints = void 0, this.readFeature = void 0, this.mutateFeature = void 0, this.lastBearing = void 0, this.selectedGeometry = void 0, this.selectedGeometryCentroid = void 0, this.selectedGeometryWebMercatorCentroid = void 0, this.config = e, this.selectionPoints = t2, this.midPoints = n2, this.coordinatePoints = r2, this.readFeature = i2, this.mutateFeature = a2;
  }
  reset() {
    this.lastBearing = void 0, this.selectedGeometry = void 0, this.selectedGeometryWebMercatorCentroid = void 0, this.selectedGeometryCentroid = void 0;
  }
  rotate(e, t2) {
    this.selectedGeometry || (this.selectedGeometry = this.readFeature.getGeometry(t2));
    let n2 = this.selectedGeometry;
    if (n2.type !== "Polygon" && n2.type !== "LineString") return;
    let r2 = [e.lng, e.lat], i2, a2 = {
      type: "Feature",
      geometry: n2,
      properties: {}
    };
    if (this.config.projection === "web-mercator") {
      this.selectedGeometryWebMercatorCentroid || (this.selectedGeometryWebMercatorCentroid = Tt(a2));
      let t3 = T(e.lng, e.lat);
      if (i2 = L(this.selectedGeometryWebMercatorCentroid, t3), i2 === 0) return;
      if (!this.lastBearing) return void (this.lastBearing = i2);
      wt(a2, -(this.lastBearing - i2));
    } else {
      if (this.config.projection !== "globe") throw Error("Unsupported projection");
      if (this.selectedGeometryCentroid || (this.selectedGeometryCentroid = Ct({
        type: "Feature",
        geometry: n2,
        properties: {}
      })), i2 = dt(this.selectedGeometryCentroid, r2), !this.lastBearing) return void (this.lastBearing = i2 + 180);
      (function(e2, t3) {
        if (t3 === 0 || t3 === 360 || t3 === -360) return e2;
        let n3 = Ct(e2);
        (e2.geometry.type === "Polygon" ? e2.geometry.coordinates[0] : e2.geometry.coordinates).forEach((e3) => {
          let r3 = dt(n3, e3) + t3, i3 = ft(n3, (function(e4, t4) {
            e4[0] += e4[0] - t4[0] > 180 ? -360 : t4[0] - e4[0] > 180 ? 360 : 0;
            let n4 = b, r4 = t4[1] * Math.PI / 180, i4 = e4[1] * Math.PI / 180, a3 = i4 - r4, o2 = Math.abs(e4[0] - t4[0]) * Math.PI / 180;
            o2 > Math.PI && (o2 -= 2 * Math.PI);
            let s3 = Math.log(Math.tan(i4 / 2 + Math.PI / 4) / Math.tan(r4 / 2 + Math.PI / 4)), c3 = Math.abs(s3) > 1e-11 ? a3 / s3 : Math.cos(r4);
            return Math.sqrt(a3 * a3 + c3 * c3 * o2 * o2) * n4;
          })(n3, e3), r3);
          e3[0] = i3[0], e3[1] = i3[1];
        });
      })(a2, -(this.lastBearing - (i2 + 180)));
    }
    let s2 = n2.type === "Polygon" ? n2.coordinates[0] : n2.coordinates;
    s2.forEach((e2) => {
      e2[0] = C(e2[0], this.coordinatePrecision), e2[1] = C(e2[1], this.coordinatePrecision);
    });
    let c2 = {
      featureId: t2,
      coordinateMutations: {
        type: j,
        coordinates: n2.type === "Polygon" ? [s2] : s2
      },
      context: { updateType: o.Provisional }
    }, l2 = null;
    if (a2.geometry.type === "Polygon") l2 = this.mutateFeature.updatePolygon(c2);
    else {
      if (a2.geometry.type !== "LineString") return;
      l2 = this.mutateFeature.updateLineString(c2);
    }
    if (!l2) return false;
    let u2 = l2.geometry.coordinates;
    this.midPoints.updateAllInPlace({ featureCoordinates: u2 }), this.selectionPoints.updateAllInPlace({ featureCoordinates: u2 }), this.coordinatePoints.updateAllInPlace({
      featureId: t2,
      featureCoordinates: u2
    }), this.projection === "web-mercator" ? this.lastBearing = i2 : this.projection === "globe" && (this.lastBearing = i2 + 180);
  }
};
var Dt = class extends D {
  constructor(e, t2) {
    super(e), this.config = void 0, this.dragCoordinateResizeBehavior = void 0, this.config = e, this.dragCoordinateResizeBehavior = t2;
  }
  scale(e, t2) {
    if (!this.dragCoordinateResizeBehavior.isDragging()) {
      let n2 = this.dragCoordinateResizeBehavior.getDraggableIndex(e, t2);
      this.dragCoordinateResizeBehavior.startDragging(t2, n2);
    }
    this.dragCoordinateResizeBehavior.drag(e, "center-fixed");
  }
  reset() {
    this.dragCoordinateResizeBehavior.stopDragging();
  }
};
function Ot({ coordinates: e, originX: t2, originY: n2, xScale: r2, yScale: i2 }) {
  r2 === 1 && i2 === 1 || e.forEach((e2) => {
    let { x: a2, y: o2 } = T(e2[0], e2[1]), { lng: s2, lat: c2 } = E(t2 + (a2 - t2) * r2, n2 + (o2 - n2) * i2);
    e2[0] = s2, e2[1] = c2;
  });
}
var kt = class extends D {
  constructor(e, t2, n2, r2, i2, a2, o2) {
    super(e), this.config = void 0, this.pixelDistance = void 0, this.selectionPoints = void 0, this.midPoints = void 0, this.coordinatePoints = void 0, this.readFeature = void 0, this.mutateFeature = void 0, this.minimumScale = 1e-4, this.draggedCoordinate = {
      id: null,
      index: -1
    }, this.boundingBoxMaps = { opposite: {
      0: 4,
      1: 5,
      2: 6,
      3: 7,
      4: 0,
      5: 1,
      6: 2,
      7: 3
    } }, this.config = e, this.pixelDistance = t2, this.selectionPoints = n2, this.midPoints = r2, this.coordinatePoints = i2, this.readFeature = a2, this.mutateFeature = o2;
  }
  getClosestCoordinate(e, t2) {
    let n2 = {
      dist: Infinity,
      index: -1,
      isFirstOrLastPolygonCoord: false
    }, r2;
    if (t2.type === "LineString") r2 = t2.coordinates;
    else {
      if (t2.type !== "Polygon") return n2;
      r2 = t2.coordinates[0];
    }
    for (let i2 = 0; i2 < r2.length; i2++) {
      let a2 = this.pixelDistance.measure(e, r2[i2]);
      if (a2 < this.pointerDistance && a2 < n2.dist) {
        let e2 = t2.type === "Polygon" && (i2 === r2.length - 1 || i2 === 0);
        n2.dist = a2, n2.index = e2 ? 0 : i2, n2.isFirstOrLastPolygonCoord = e2;
      }
    }
    return n2;
  }
  isValidDragWebMercator(e, t2, n2) {
    switch (e) {
      case 0:
        if (t2 <= 0 || n2 >= 0) return false;
        break;
      case 1:
        if (n2 >= 0) return false;
        break;
      case 2:
        if (t2 >= 0 || n2 >= 0) return false;
        break;
      case 3:
        if (t2 >= 0) return false;
        break;
      case 4:
        if (t2 >= 0 || n2 <= 0) return false;
        break;
      case 5:
        if (n2 <= 0) return false;
        break;
      case 6:
        if (t2 <= 0 || n2 <= 0) return false;
        break;
      case 7:
        if (t2 <= 0) return false;
    }
    return true;
  }
  getSelectedFeatureDataWebMercator() {
    if (!this.draggedCoordinate.id || this.draggedCoordinate.index === -1) return null;
    let e = this.getFeature(this.draggedCoordinate.id);
    if (!e) return null;
    let t2 = this.getNormalisedCoordinates(e.geometry);
    return {
      boundingBox: this.getBBoxWebMercator(t2),
      feature: e,
      updatedCoords: t2,
      selectedCoordinate: t2[this.draggedCoordinate.index]
    };
  }
  centerWebMercatorDrag(e) {
    let t2 = this.getSelectedFeatureDataWebMercator();
    if (!t2) return null;
    let { feature: n2, boundingBox: r2, updatedCoords: i2, selectedCoordinate: a2 } = t2, o2 = Tt(n2);
    if (!o2) return null;
    let s2 = T(a2[0], a2[1]), { closestBBoxIndex: c2 } = this.getIndexesWebMercator(r2, s2), l2 = T(e.lng, e.lat);
    return this.scaleWebMercator({
      closestBBoxIndex: c2,
      updatedCoords: i2,
      webMercatorCursor: l2,
      webMercatorSelected: s2,
      webMercatorOrigin: o2
    }), i2;
  }
  centerFixedWebMercatorDrag(e) {
    let t2 = this.getSelectedFeatureDataWebMercator();
    if (!t2) return null;
    let { feature: n2, boundingBox: r2, updatedCoords: i2, selectedCoordinate: a2 } = t2, o2 = Tt(n2);
    if (!o2) return null;
    let s2 = T(a2[0], a2[1]), { closestBBoxIndex: c2 } = this.getIndexesWebMercator(r2, s2), l2 = T(e.lng, e.lat);
    return this.scaleFixedWebMercator({
      closestBBoxIndex: c2,
      updatedCoords: i2,
      webMercatorCursor: l2,
      webMercatorSelected: s2,
      webMercatorOrigin: o2
    }), i2;
  }
  scaleFixedWebMercator({ closestBBoxIndex: e, webMercatorOrigin: t2, webMercatorSelected: n2, webMercatorCursor: r2, updatedCoords: i2 }) {
    if (!this.isValidDragWebMercator(e, t2.x - r2.x, t2.y - r2.y)) return null;
    let a2 = N(t2, r2) / N(t2, n2);
    return a2 < 0 && (a2 = this.minimumScale), Ot({
      coordinates: i2,
      originX: t2.x,
      originY: t2.y,
      xScale: a2,
      yScale: a2
    }), i2;
  }
  oppositeFixedWebMercatorDrag(e) {
    let t2 = this.getSelectedFeatureDataWebMercator();
    if (!t2) return null;
    let { boundingBox: n2, updatedCoords: r2, selectedCoordinate: i2 } = t2, a2 = T(i2[0], i2[1]), { oppositeBboxIndex: o2, closestBBoxIndex: s2 } = this.getIndexesWebMercator(n2, a2), c2 = {
      x: n2[o2][0],
      y: n2[o2][1]
    }, l2 = T(e.lng, e.lat);
    return this.scaleFixedWebMercator({
      closestBBoxIndex: s2,
      updatedCoords: r2,
      webMercatorCursor: l2,
      webMercatorSelected: a2,
      webMercatorOrigin: c2
    }), r2;
  }
  oppositeWebMercatorDrag(e) {
    let t2 = this.getSelectedFeatureDataWebMercator();
    if (!t2) return null;
    let { boundingBox: n2, updatedCoords: r2, selectedCoordinate: i2 } = t2, a2 = T(i2[0], i2[1]), { oppositeBboxIndex: o2, closestBBoxIndex: s2 } = this.getIndexesWebMercator(n2, a2), c2 = {
      x: n2[o2][0],
      y: n2[o2][1]
    }, l2 = T(e.lng, e.lat);
    return this.scaleWebMercator({
      closestBBoxIndex: s2,
      updatedCoords: r2,
      webMercatorCursor: l2,
      webMercatorSelected: a2,
      webMercatorOrigin: c2
    }), r2;
  }
  scaleWebMercator({ closestBBoxIndex: e, webMercatorOrigin: t2, webMercatorSelected: n2, webMercatorCursor: r2, updatedCoords: i2 }) {
    let a2 = t2.x - r2.x, o2 = t2.y - r2.y;
    if (!this.isValidDragWebMercator(e, a2, o2)) return null;
    let s2 = 1;
    a2 !== 0 && e !== 1 && e !== 5 && (s2 = 1 - (t2.x - n2.x - a2) / a2);
    let c2 = 1;
    return o2 !== 0 && e !== 3 && e !== 7 && (c2 = 1 - (t2.y - n2.y - o2) / o2), this.validateScale(s2, c2) ? (s2 < 0 && (s2 = this.minimumScale), c2 < 0 && (c2 = this.minimumScale), this.performWebMercatorScale(i2, t2.x, t2.y, s2, c2), i2) : null;
  }
  getFeature(e) {
    if (this.draggedCoordinate.id === null) return null;
    let t2 = this.readFeature.getGeometry(e);
    return t2.type !== "Polygon" && t2.type !== "LineString" ? null : {
      id: e,
      type: "Feature",
      geometry: t2,
      properties: {}
    };
  }
  getNormalisedCoordinates(e) {
    return e.type === "Polygon" ? e.coordinates[0] : e.coordinates;
  }
  validateScale(e, t2) {
    return !isNaN(e) && t2 < 2 ** 53 - 1 && !isNaN(t2) && t2 < 2 ** 53 - 1;
  }
  performWebMercatorScale(e, t2, n2, r2, i2) {
    e.forEach((e2) => {
      let { x: a2, y: o2 } = T(e2[0], e2[1]), { lng: s2, lat: c2 } = E(t2 + (a2 - t2) * r2, n2 + (o2 - n2) * i2);
      e2[0] = s2, e2[1] = c2;
    });
  }
  getBBoxWebMercator(e) {
    let t2 = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity
    ];
    (e = e.map((e2) => {
      let { x: t3, y: n3 } = T(e2[0], e2[1]);
      return [t3, n3];
    })).forEach(([e2, n3]) => {
      e2 < t2[0] && (t2[0] = e2), n3 < t2[1] && (t2[1] = n3), e2 > t2[2] && (t2[2] = e2), n3 > t2[3] && (t2[3] = n3);
    });
    let [n2, r2, i2, a2] = t2;
    return [
      [n2, a2],
      [(n2 + i2) / 2, a2],
      [i2, a2],
      [i2, a2 + (r2 - a2) / 2],
      [i2, r2],
      [(n2 + i2) / 2, r2],
      [n2, r2],
      [n2, a2 + (r2 - a2) / 2]
    ];
  }
  getIndexesWebMercator(e, t2) {
    let n2, r2 = Infinity;
    for (let i2 = 0; i2 < e.length; i2++) {
      let a2 = N({
        x: t2.x,
        y: t2.y
      }, {
        x: e[i2][0],
        y: e[i2][1]
      });
      a2 < r2 && (n2 = i2, r2 = a2);
    }
    if (n2 === void 0) throw Error("No closest coordinate found");
    return {
      oppositeBboxIndex: this.boundingBoxMaps.opposite[n2],
      closestBBoxIndex: n2
    };
  }
  isDragging() {
    return this.draggedCoordinate.id !== null;
  }
  startDragging(e, t2) {
    this.draggedCoordinate = {
      id: e,
      index: t2
    };
  }
  stopDragging() {
    this.draggedCoordinate = {
      id: null,
      index: -1
    };
  }
  getDraggableIndex(e, t2) {
    let n2 = this.readFeature.getGeometry(t2), r2 = this.getClosestCoordinate(e, n2);
    return r2.index === -1 ? -1 : r2.index;
  }
  drag(e, t2) {
    if (!this.draggedCoordinate.id) return false;
    let n2 = this.getFeature(this.draggedCoordinate.id);
    if (!n2) return false;
    let r2 = null;
    if (t2 === "center" ? r2 = this.centerWebMercatorDrag(e) : t2 === "opposite" ? r2 = this.oppositeWebMercatorDrag(e) : t2 === "center-fixed" ? r2 = this.centerFixedWebMercatorDrag(e) : t2 === "opposite-fixed" && (r2 = this.oppositeFixedWebMercatorDrag(e)), !r2) return false;
    for (let e2 = 0; e2 < r2.length; e2++) {
      let t3 = r2[e2];
      if (t3[0] = C(t3[0], this.coordinatePrecision), t3[1] = C(t3[1], this.coordinatePrecision), !se(t3, this.coordinatePrecision)) return false;
    }
    let i2 = n2.id, a2 = null;
    if (n2.geometry.type === "Polygon" ? a2 = this.mutateFeature.updatePolygon({
      featureId: i2,
      coordinateMutations: {
        type: j,
        coordinates: [r2]
      },
      context: { updateType: o.Provisional }
    }) : n2.geometry.type === "LineString" && (a2 = this.mutateFeature.updateLineString({
      featureId: i2,
      coordinateMutations: {
        type: j,
        coordinates: r2
      },
      context: { updateType: o.Provisional }
    })), !a2) return false;
    let s2 = a2.geometry.coordinates;
    return this.midPoints.updateAllInPlace({ featureCoordinates: s2 }), this.selectionPoints.updateAllInPlace({ featureCoordinates: s2 }), this.coordinatePoints.updateAllInPlace({
      featureId: i2,
      featureCoordinates: s2
    }), true;
  }
};
var At = {
  deselect: "Escape",
  delete: "Delete",
  rotate: ["Control", "r"],
  scale: ["Control", "s"]
};
var jt = {
  pointerOver: "move",
  dragStart: "move",
  dragEnd: "move",
  insertMidpoint: "crosshair"
};
var Mt = class extends v {
  getPointerOverFeatureCursor() {
    return this.cursors.pointerOverFeature ?? this.cursors.pointerOver;
  }
  getPointerOverCoordinateCursor() {
    return this.cursors.pointerOverCoordinate ?? this.cursors.pointerOver;
  }
  getPointerOverResizeHandleCursor() {
    return this.cursors.pointerOverResizeHandle ?? this.cursors.pointerOver;
  }
  constructor(e) {
    super(e, true), this.mode = "select", this.allowManualDeselection = true, this.allowManualSelection = true, this.dragEventThrottle = 5, this.dragEventCount = 0, this.selected = [], this.flags = {}, this.keyEvents = At, this.cursors = jt, this.validations = {}, this.dragTarget = { type: "none" }, this.selectionPoints = void 0, this.midPoints = void 0, this.coordinateSnap = void 0, this.featuresAtMouseEvent = void 0, this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.dragFeature = void 0, this.dragCoordinate = void 0, this.rotateFeature = void 0, this.scaleFeature = void 0, this.dragCoordinateResizeFeature = void 0, this.coordinatePoints = void 0, this.lineSnap = void 0, this.mutateFeature = void 0, this.readFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    if (super.updateOptions(e), this.cursors = e && e.cursors ? t({}, this.cursors, e.cursors) : jt, e?.keyEvents === null ? this.keyEvents = {
      deselect: null,
      delete: null,
      rotate: null,
      scale: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e?.dragEventThrottle !== void 0 && (this.dragEventThrottle = e.dragEventThrottle), e?.allowManualDeselection !== void 0 && (this.allowManualDeselection = e.allowManualDeselection), e?.allowManualSelection !== void 0 && (this.allowManualSelection = e.allowManualSelection), e != null && e.flags) {
      this.flags = t({}, this.flags, e.flags), this.validations = {};
      for (let e2 in this.flags) {
        let t2 = this.flags[e2].feature;
        t2 && t2.validation && (this.validations[e2] = t2.validation);
      }
    }
  }
  selectFeature(e) {
    this.select(e, false);
  }
  setSelecting() {
    if (this._state !== "started") throw Error("Mode must be started to move to selecting state");
    this._state = "selecting";
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: (e2, t2) => {
      let n2 = e2.properties.mode;
      return this.validations && this.validations[n2] ? this.validations[n2](e2, t2) : { valid: true };
    } }), this.pixelDistance = new I(e), this.clickBoundingBox = new F(e), this.featuresAtMouseEvent = new bt(e, this.clickBoundingBox, this.pixelDistance), this.selectionPoints = new _t(e, this.mutateFeature), this.coordinatePoints = new We(e, this.readFeature, this.mutateFeature), this.midPoints = new gt(e, this.selectionPoints, this.coordinatePoints, this.mutateFeature, this.readFeature, this.pixelDistance), this.coordinateSnap = new Ee(e, this.pixelDistance, this.clickBoundingBox), this.lineSnap = new ze(e, this.pixelDistance, this.clickBoundingBox), this.rotateFeature = new Et(e, this.selectionPoints, this.midPoints, this.coordinatePoints, this.readFeature, this.mutateFeature), this.dragFeature = new xt(e, this.featuresAtMouseEvent, this.selectionPoints, this.midPoints, this.coordinatePoints, this.readFeature, this.mutateFeature), this.dragCoordinate = new St(e, this.pixelDistance, this.selectionPoints, this.midPoints, this.coordinatePoints, this.coordinateSnap, this.lineSnap, this.readFeature, this.mutateFeature), this.dragCoordinateResizeFeature = new kt(e, this.pixelDistance, this.selectionPoints, this.midPoints, this.coordinatePoints, this.readFeature, this.mutateFeature), this.scaleFeature = new Dt(e, this.dragCoordinateResizeFeature);
  }
  deselectFeature(e) {
    this.deselect(e);
  }
  deselect(e) {
    this.selected.includes(e) && (this.mutateFeature.setDeselected(this.selected), this.onDeselect(this.selected[0]), this.selected = [], this.selectionPoints.delete(), this.midPoints.delete(), this.dragTarget = { type: "none" });
  }
  deleteSelected() {
    this.selected.length && this.mutateFeature.deleteFeaturesIfPresent(this.selected), this.selected = [], this.dragTarget = { type: "none" };
  }
  clearDragTargetAndCursor() {
    this.dragTarget = { type: "none" }, this.setCursor("unset");
  }
  getSelectedFlags(e) {
    let t2 = this.readFeature.getProperties(e), n2 = this.flags[t2.mode]?.feature, r2 = n2?.coordinates;
    return {
      featureFlags: n2,
      coordinatesFlags: r2,
      hasDraggableFlags: n2 && (n2.draggable || r2?.draggable || r2?.resizable || typeof r2?.midpoints == "object" && r2.midpoints.draggable)
    };
  }
  onRightClick(e) {
    if (!this.selectionPoints.ids.length) return;
    let t2, n2 = Infinity;
    if (this.selectionPoints.ids.forEach((r3) => {
      let i2 = this.readFeature.getGeometry(r3), a3 = this.pixelDistance.measure(e, i2.coordinates);
      a3 < this.pointerDistance && a3 < n2 && (n2 = a3, t2 = this.readFeature.getProperties(r3));
    }), !t2) return;
    let r2 = t2.selectionPointFeatureId, a2 = t2.index, s2 = this.readFeature.getProperties(r2), c2 = this.flags[s2.mode];
    if (!(c2 && c2.feature && c2.feature.coordinates && c2.feature.coordinates.deletable)) return;
    let l2 = this.readFeature.getGeometry(r2), u2;
    if (l2.type === "Polygon") {
      if (u2 = l2.coordinates[0], u2.length <= 4) return;
    } else if (l2.type !== "LineString" || (u2 = l2.coordinates, u2.length <= 2)) return;
    l2.type !== "Polygon" || a2 !== 0 && a2 !== u2.length - 1 ? u2.splice(a2, 1) : (u2.shift(), u2.pop(), u2.push([u2[0][0], u2[0][1]]));
    let d2 = null;
    if (l2.type === "Polygon" ? d2 = this.mutateFeature.updatePolygon({
      featureId: r2,
      coordinateMutations: {
        type: j,
        coordinates: [u2]
      },
      context: { updateType: o.Commit }
    }) : l2.type === "LineString" && (d2 = this.mutateFeature.updateLineString({
      featureId: r2,
      coordinateMutations: {
        type: j,
        coordinates: u2
      },
      context: { updateType: o.Commit }
    })), !d2) return;
    let f2 = d2.geometry.coordinates;
    this.mutateFeature.deleteFeaturesIfPresent([...this.midPoints.ids, ...this.selectionPoints.ids]), s2.coordinatePointIds && this.coordinatePoints.createOrUpdate({
      featureId: r2,
      featureCoordinates: f2
    }), this.selectionPoints.create({
      featureCoordinates: f2,
      featureId: r2
    }), c2 && c2.feature && c2.feature.coordinates && c2.feature.coordinates.midpoints && this.midPoints.create({
      featureCoordinates: f2,
      featureId: r2
    }), this.onFinish(r2, {
      action: i,
      mode: this.mode
    });
  }
  select(e, t2 = true) {
    if (this.selected[0] === e) return;
    let { mode: n2 } = this.readFeature.getProperties(e), r2 = this.flags[n2];
    if (!r2 || !r2.feature) return;
    let i2 = this.selected[0];
    if (i2) {
      if (i2 === e) return;
      this.deselect(i2);
    }
    t2 && this.setCursor(this.getPointerOverFeatureCursor()), this.selected = [e], this.mutateFeature.setSelected(e), this.onSelect(e);
    let { type: a2, coordinates: o2 } = this.readFeature.getGeometry(e);
    a2 !== "LineString" && a2 !== "Polygon" || o2 && r2 && r2.feature.coordinates && (this.selectionPoints.create({
      featureCoordinates: o2,
      featureId: e
    }), r2.feature.coordinates.midpoints && this.midPoints.create({
      featureCoordinates: o2,
      featureId: e
    }));
  }
  onLeftClick(e) {
    let { clickedFeature: t2 } = this.featuresAtMouseEvent.find(e, this.selected.length > 0), n2 = this.midPoints.getNearestMidPoint(e), r2 = this.selected[0];
    if (r2) {
      var i2;
      let { featureFlags: t3 } = this.getSelectedFlags(r2);
      if (t3 != null && (i2 = t3.coordinates) != null && i2.midpoints && n2) {
        if (t3.coordinates.draggable) {
          let t4 = this.pixelDistance.measure(e, this.readFeature.getGeometry(n2).coordinates), { dist: i3 } = this.dragCoordinate.getDraggable(e, r2);
          if (i3 !== void 0 && t4 > i3) return;
        }
        this.midPoints.insert({
          featureId: r2,
          midPointId: n2
        }), this.onFinish(this.selected[0], {
          action: a,
          mode: this.mode
        });
        return;
      }
    }
    if (t2 != null && t2.id) this.allowManualSelection && this.select(t2.id, true);
    else if (this.selected.length && this.allowManualDeselection) return void this.deselect(this.selected[0]);
  }
  start() {
    this.setStarted(), this.setSelecting();
  }
  stop() {
    this.cleanUp(), this.setStarted(), this.setStopped();
  }
  onClick(e) {
    e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e) ? this.onRightClick(e) : e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) && this.onLeftClick(e);
  }
  canScale(e) {
    return this.keyEvents.scale && this.keyEvents.scale.every((t2) => e.heldKeys.includes(t2));
  }
  canRotate(e) {
    return this.keyEvents.rotate && this.keyEvents.rotate.every((t2) => e.heldKeys.includes(t2));
  }
  preventDefaultKeyEvent(e) {
    let t2 = this.canRotate(e), n2 = this.canScale(e);
    (t2 || n2) && e.preventDefault();
  }
  onKeyDown(e) {
    this.preventDefaultKeyEvent(e);
  }
  onKeyUp(e) {
    if (this.preventDefaultKeyEvent(e), this.keyEvents.delete && e.key === this.keyEvents.delete) {
      if (!this.selected.length) return;
      let e2 = this.selected[0];
      this.onDeselect(this.selected[0]), this.coordinatePoints.deletePointsByFeatureIds([e2]), this.deleteSelected(), this.selectionPoints.delete(), this.midPoints.delete();
    } else this.keyEvents.deselect && e.key === this.keyEvents.deselect && this.cleanUp();
  }
  cleanUp() {
    this.selected.length && this.deselect(this.selected[0]);
  }
  onDragStart(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragStart, e)) return;
    let n2 = this.selected[0];
    if (!n2) return;
    let { featureFlags: r2, coordinatesFlags: i2, hasDraggableFlags: o2 } = this.getSelectedFlags(n2);
    if (!o2) return;
    this.dragEventCount = 0;
    let s2 = this.dragTarget.type !== "none" && this.dragTarget.featureId === n2 ? this.dragTarget : { type: "none" }, c2 = s2.type === "coordinate" ? s2.coordinateIndex : this.dragCoordinate.getDraggableIndex(e, n2), l2 = s2.type === "resize" ? s2.coordinateIndex : this.dragCoordinateResizeFeature.getDraggableIndex(e, n2), u2 = i2?.resizable && l2 !== -1, d2 = i2?.draggable && c2 !== -1, f2 = i2 && typeof i2.midpoints == "object" && i2.midpoints.draggable, p2 = r2?.draggable && (s2.type === "feature" || this.dragFeature.canDrag(e, n2));
    if (u2) return this.setCursor(this.cursors.dragStart), this.dragCoordinateResizeFeature.startDragging(n2, l2), void t2(false);
    if (d2) return this.setCursor(this.cursors.dragStart), this.dragCoordinate.startDragging(n2, c2), void t2(false);
    if (f2) {
      let r3 = s2.type === "midpoint" ? s2.midPointId : this.midPoints.getNearestMidPoint(e);
      if (this.selected.length && r3) {
        this.midPoints.insert({
          featureId: n2,
          midPointId: r3
        }), this.onFinish(this.selected[0], {
          action: a,
          mode: this.mode
        });
        let i3 = this.dragCoordinate.getDraggableIndex(e, n2);
        this.dragCoordinate.startDragging(n2, i3), t2(false);
        return;
      }
    }
    if (p2) return this.setCursor(this.cursors.dragStart), this.dragFeature.startDragging(e, n2), void t2(false);
    this.setCursor("unset");
  }
  onDrag(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDrag, e)) return;
    let n2 = this.selected[0];
    if (!n2) return;
    let r2 = this.readFeature.getProperties(n2), i2 = this.flags[r2.mode], a2 = true === (i2 && i2.feature && i2.feature.selfIntersectable);
    if (this.dragEventCount++, this.dragEventCount % this.dragEventThrottle != 0) {
      if (i2 && i2.feature && i2.feature.rotateable && this.canRotate(e)) return t2(false), void this.rotateFeature.rotate(e, n2);
      if (i2 && i2.feature && i2.feature.scaleable && this.canScale(e)) return t2(false), void this.scaleFeature.scale(e, n2);
      if (this.dragCoordinateResizeFeature.isDragging() && i2.feature && i2.feature.coordinates && i2.feature.coordinates.resizable) {
        if (this.projection === "globe") throw Error("Globe is currently unsupported projection for resizable");
        t2(false), this.dragCoordinateResizeFeature.drag(e, i2.feature.coordinates.resizable);
        return;
      }
      if (this.dragCoordinate.isDragging()) {
        var o2;
        let t3 = (o2 = i2.feature) == null || (o2 = o2.coordinates) == null ? void 0 : o2.snappable, n3 = { toCoordinate: false };
        true === t3 ? n3 = { toCoordinate: true } : typeof t3 == "object" && (n3 = t3), this.dragCoordinate.drag(e, a2, n3);
        return;
      }
      this.dragFeature.isDragging() ? this.dragFeature.drag(e) : t2(true);
    }
  }
  onDragEnd(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDragEnd, e) && (this.setCursor(this.cursors.dragEnd), this.dragCoordinate.isDragging() ? this.onFinish(this.selected[0], {
      mode: this.mode,
      action: "dragCoordinate"
    }) : this.dragFeature.isDragging() ? this.onFinish(this.selected[0], {
      mode: this.mode,
      action: "dragFeature"
    }) : this.dragCoordinateResizeFeature.isDragging() && this.onFinish(this.selected[0], {
      mode: this.mode,
      action: "dragCoordinateResize"
    }), this.dragCoordinate.stopDragging(), this.dragFeature.stopDragging(), this.dragCoordinateResizeFeature.stopDragging(), this.rotateFeature.reset(), this.scaleFeature.reset(), t2(true));
  }
  onMouseMove(e) {
    let t2 = this.selected[0];
    if (!t2) return void this.clearDragTargetAndCursor();
    if (this.dragFeature.isDragging() || this.dragCoordinate.isDragging() || this.dragCoordinateResizeFeature.isDragging()) return;
    let { featureFlags: n2 } = this.getSelectedFlags(t2);
    if (!n2) return void this.clearDragTargetAndCursor();
    let r2, i2 = n2.coordinates;
    if (i2 != null && i2.midpoints && (r2 = this.midPoints.getNearestMidPoint(e), r2 && (this.dragTarget = {
      type: "midpoint",
      featureId: t2,
      midPointId: r2
    }, this.setCursor(this.cursors.insertMidpoint))), i2 && i2.draggable) {
      let { index: n3, dist: i3 } = this.dragCoordinate.getDraggable(e, t2);
      if (n3 > -1) {
        if (r2 && this.pixelDistance.measure(e, this.readFeature.getGeometry(r2).coordinates) < i3) return;
        this.dragTarget = {
          type: "coordinate",
          featureId: t2,
          coordinateIndex: n3
        }, this.setCursor(this.getPointerOverCoordinateCursor());
        return;
      }
    }
    if (i2 && i2.resizable) {
      let n3 = this.dragCoordinateResizeFeature.getDraggableIndex(e, t2);
      if (n3 > -1) return this.dragTarget = {
        type: "resize",
        featureId: t2,
        coordinateIndex: n3
      }, void this.setCursor(this.getPointerOverResizeHandleCursor());
    }
    if (n2.draggable && this.dragFeature.canDrag(e, t2)) {
      if (r2) return;
      this.dragTarget = {
        type: "feature",
        featureId: t2
      }, this.setCursor(this.getPointerOverFeatureCursor());
      return;
    }
    r2 || this.clearDragTargetAndCursor();
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    if (e.properties.mode === this.mode && e.geometry.type === "Point") {
      if (e.properties[c.SELECTION_POINT]) return n2.pointColor = this.getHexColorStylingValue(this.styles.selectionPointColor, n2.pointColor, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.selectionPointOpacity, 1, e), n2.pointOutlineColor = this.getHexColorStylingValue(this.styles.selectionPointOutlineColor, n2.pointOutlineColor, e), n2.pointWidth = this.getNumericStylingValue(this.styles.selectionPointWidth, n2.pointWidth, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.selectionPointOutlineOpacity, 1, e), n2.pointOutlineWidth = this.getNumericStylingValue(this.styles.selectionPointOutlineWidth, 2, e), n2.zIndex = 30, n2;
      if (e.properties[c.MID_POINT]) return n2.pointColor = this.getHexColorStylingValue(this.styles.midPointColor, n2.pointColor, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.midPointOpacity, 1, e), n2.pointOutlineColor = this.getHexColorStylingValue(this.styles.midPointOutlineColor, n2.pointOutlineColor, e), n2.pointWidth = this.getNumericStylingValue(this.styles.midPointWidth, 4, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.midPointOutlineOpacity, 1, e), n2.pointOutlineWidth = this.getNumericStylingValue(this.styles.midPointOutlineWidth, 2, e), n2.zIndex = 50, n2;
    } else if (e.properties[c.SELECTED]) {
      if (e.geometry.type === "Point" && e.properties[l.MARKER]) return n2.markerUrl = this.getUrlStylingValue(this.styles.selectedMarkerUrl, s, e), n2.markerHeight = this.getNumericStylingValue(this.styles.selectedMarkerHeight, 40, e), n2.markerWidth = this.getNumericStylingValue(this.styles.selectedMarkerWidth, 32, e), n2;
      if (e.geometry.type === "Polygon") return n2.polygonFillColor = this.getHexColorStylingValue(this.styles.selectedPolygonColor, n2.polygonFillColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.selectedPolygonOutlineWidth, n2.polygonOutlineWidth, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.selectedPolygonOutlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.selectedPolygonOutlineOpacity, 1, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.selectedPolygonFillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u, n2;
      if (e.geometry.type === "LineString") return n2.lineStringColor = this.getHexColorStylingValue(this.styles.selectedLineStringColor, n2.lineStringColor, e), n2.lineStringWidth = this.getNumericStylingValue(this.styles.selectedLineStringWidth, n2.lineStringWidth, e), n2.lineStringOpacity = this.getNumericStylingValue(this.styles.selectedLineStringOpacity, 1, e), n2.zIndex = u, n2;
      if (e.geometry.type === "Point") return n2.pointWidth = this.getNumericStylingValue(this.styles.selectedPointWidth, n2.pointWidth, e), n2.pointColor = this.getHexColorStylingValue(this.styles.selectedPointColor, n2.pointColor, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.selectedPointOpacity, 1, e), n2.pointOutlineColor = this.getHexColorStylingValue(this.styles.selectedPointOutlineColor, n2.pointOutlineColor, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.selectedPointOutlineOpacity, 1, e), n2.pointOutlineWidth = this.getNumericStylingValue(this.styles.selectedPointOutlineWidth, n2.pointOutlineWidth, e), n2.zIndex = u, n2;
    }
    return n2;
  }
  afterFeatureUpdated(e) {
    if (this.selected.length && e.id === this.selected[0]) {
      var t2, n2;
      let r2 = this.flags[e.properties.mode];
      if (r2 == null || (t2 = r2.feature) == null || !t2.coordinates) return;
      let i2 = e.geometry.type, a2 = e.id;
      if (this.selectionPoints.delete(), this.midPoints.delete(), i2 !== "LineString" && i2 !== "Polygon") return;
      let o2 = e.geometry.coordinates;
      this.selectionPoints.create({
        featureCoordinates: o2,
        featureId: a2
      }), r2 != null && (n2 = r2.feature) != null && (n2 = n2.coordinates) != null && n2.midpoints && this.midPoints.create({
        featureCoordinates: o2,
        featureId: a2
      });
    }
  }
};
var Nt = class extends _ {
  constructor(...e) {
    super(...e), this.type = h.Static, this.mode = "static";
  }
  start() {
  }
  stop() {
  }
  onKeyUp() {
  }
  onKeyDown() {
  }
  onClick() {
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  onMouseMove() {
  }
  cleanUp() {
  }
  styleFeature() {
    return t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
  }
};
function Pt(e, t2, n2, r2, i2) {
  for (; r2 > n2; ) {
    if (r2 - n2 > 600) {
      let a3 = r2 - n2 + 1, o3 = t2 - n2 + 1, s3 = Math.log(a3), c2 = 0.5 * Math.exp(2 * s3 / 3), l2 = 0.5 * Math.sqrt(s3 * c2 * (a3 - c2) / a3) * (o3 - a3 / 2 < 0 ? -1 : 1);
      Pt(e, t2, Math.max(n2, Math.floor(t2 - o3 * c2 / a3 + l2)), Math.min(r2, Math.floor(t2 + (a3 - o3) * c2 / a3 + l2)), i2);
    }
    let a2 = e[t2], o2 = n2, s2 = r2;
    for (Ft(e, n2, t2), i2(e[r2], a2) > 0 && Ft(e, n2, r2); o2 < s2; ) {
      for (Ft(e, o2, s2), o2++, s2--; i2(e[o2], a2) < 0; ) o2++;
      for (; i2(e[s2], a2) > 0; ) s2--;
    }
    i2(e[n2], a2) === 0 ? Ft(e, n2, s2) : (s2++, Ft(e, s2, r2)), s2 <= t2 && (n2 = s2 + 1), t2 <= s2 && (r2 = s2 - 1);
  }
}
function Ft(e, t2, n2) {
  let r2 = e[t2];
  e[t2] = e[n2], e[n2] = r2;
}
function H(e, t2) {
  It(e, 0, e.children.length, t2, e);
}
function It(e, t2, n2, r2, i2) {
  i2 || (i2 = U([])), i2.minX = Infinity, i2.minY = Infinity, i2.maxX = -Infinity, i2.maxY = -Infinity;
  for (let a2 = t2; a2 < n2; a2++) {
    let t3 = e.children[a2];
    Lt(i2, e.leaf ? r2(t3) : t3);
  }
  return i2;
}
function Lt(e, t2) {
  return e.minX = Math.min(e.minX, t2.minX), e.minY = Math.min(e.minY, t2.minY), e.maxX = Math.max(e.maxX, t2.maxX), e.maxY = Math.max(e.maxY, t2.maxY), e;
}
function Rt(e, t2) {
  return e.minX - t2.minX;
}
function zt(e, t2) {
  return e.minY - t2.minY;
}
function Bt(e) {
  return (e.maxX - e.minX) * (e.maxY - e.minY);
}
function Vt(e) {
  return e.maxX - e.minX + (e.maxY - e.minY);
}
function Ht(e, t2) {
  let n2 = Math.max(e.minX, t2.minX), r2 = Math.max(e.minY, t2.minY), i2 = Math.min(e.maxX, t2.maxX), a2 = Math.min(e.maxY, t2.maxY);
  return Math.max(0, i2 - n2) * Math.max(0, a2 - r2);
}
function Ut(e, t2) {
  return e.minX <= t2.minX && e.minY <= t2.minY && t2.maxX <= e.maxX && t2.maxY <= e.maxY;
}
function Wt(e, t2) {
  return t2.minX <= e.maxX && t2.minY <= e.maxY && t2.maxX >= e.minX && t2.maxY >= e.minY;
}
function U(e) {
  return {
    children: e,
    height: 1,
    leaf: true,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity
  };
}
function Gt(e, t2, n2, r2, i2) {
  let a2 = [t2, n2];
  for (; a2.length; ) {
    if ((n2 = a2.pop()) - (t2 = a2.pop()) <= r2) continue;
    let o2 = t2 + Math.ceil((n2 - t2) / r2 / 2) * r2;
    Pt(e, o2, t2, n2, i2), a2.push(t2, o2, o2, n2);
  }
}
var Kt = class {
  constructor(e) {
    this._maxEntries = void 0, this._minEntries = void 0, this.data = void 0, this._maxEntries = Math.max(4, e), this._minEntries = Math.max(2, Math.ceil(0.4 * this._maxEntries)), this.clear();
  }
  search(e) {
    let t2 = this.data, n2 = [];
    if (!Wt(e, t2)) return n2;
    let r2 = this.toBBox, i2 = [];
    for (; t2; ) {
      for (let a2 = 0; a2 < t2.children.length; a2++) {
        let o2 = t2.children[a2], s2 = t2.leaf ? r2(o2) : o2;
        Wt(e, s2) && (t2.leaf ? n2.push(o2) : Ut(e, s2) ? this._all(o2, n2) : i2.push(o2));
      }
      t2 = i2.pop();
    }
    return n2;
  }
  collides(e) {
    let t2 = this.data;
    if (Wt(e, t2)) {
      let n2 = [];
      for (; t2; ) {
        for (let r2 = 0; r2 < t2.children.length; r2++) {
          let i2 = t2.children[r2], a2 = t2.leaf ? this.toBBox(i2) : i2;
          if (Wt(e, a2)) {
            if (t2.leaf || Ut(e, a2)) return true;
            n2.push(i2);
          }
        }
        t2 = n2.pop();
      }
    }
    return false;
  }
  load(e) {
    if (e.length < this._minEntries) {
      for (let t3 = 0; t3 < e.length; t3++) this.insert(e[t3]);
      return;
    }
    let t2 = this._build(e.slice(), 0, e.length - 1, 0);
    if (this.data.children.length) if (this.data.height === t2.height) this._splitRoot(this.data, t2);
    else {
      if (this.data.height < t2.height) {
        let e2 = this.data;
        this.data = t2, t2 = e2;
      }
      this._insert(t2, this.data.height - t2.height - 1, true);
    }
    else this.data = t2;
  }
  insert(e) {
    this._insert(e, this.data.height - 1);
  }
  clear() {
    this.data = U([]);
  }
  remove(e) {
    let t2 = this.data, n2 = this.toBBox(e), r2 = [], i2 = [], a2, o2, s2 = false;
    for (; t2 || r2.length; ) {
      if (t2 || (t2 = r2.pop(), o2 = r2[r2.length - 1], a2 = i2.pop(), s2 = true), t2.leaf) {
        let n3 = t2.children.indexOf(e);
        n3 !== -1 && (t2.children.splice(n3, 1), r2.push(t2), this._condense(r2));
      }
      s2 || t2.leaf || !Ut(t2, n2) ? o2 ? (a2++, t2 = o2.children[a2], s2 = false) : t2 = null : (r2.push(t2), i2.push(a2), a2 = 0, o2 = t2, t2 = t2.children[0]);
    }
  }
  toBBox(e) {
    return e;
  }
  compareMinX(e, t2) {
    return e.minX - t2.minX;
  }
  compareMinY(e, t2) {
    return e.minY - t2.minY;
  }
  _all(e, t2) {
    let n2 = [];
    for (; e; ) e.leaf ? t2.push(...e.children) : n2.push(...e.children), e = n2.pop();
    return t2;
  }
  _build(e, t2, n2, r2) {
    let i2 = n2 - t2 + 1, a2, o2 = this._maxEntries;
    if (i2 <= o2) return a2 = U(e.slice(t2, n2 + 1)), H(a2, this.toBBox), a2;
    r2 || (r2 = Math.ceil(Math.log(i2) / Math.log(o2)), o2 = Math.ceil(i2 / o2 ** (r2 - 1))), a2 = U([]), a2.leaf = false, a2.height = r2;
    let s2 = Math.ceil(i2 / o2), c2 = s2 * Math.ceil(Math.sqrt(o2));
    Gt(e, t2, n2, c2, this.compareMinX);
    for (let i3 = t2; i3 <= n2; i3 += c2) {
      let t3 = Math.min(i3 + c2 - 1, n2);
      Gt(e, i3, t3, s2, this.compareMinY);
      for (let n3 = i3; n3 <= t3; n3 += s2) {
        let i4 = Math.min(n3 + s2 - 1, t3);
        a2.children.push(this._build(e, n3, i4, r2 - 1));
      }
    }
    return H(a2, this.toBBox), a2;
  }
  _chooseSubtree(e, t2, n2, r2) {
    for (; r2.push(t2), !t2.leaf && r2.length - 1 !== n2; ) {
      let n3, r3 = Infinity, o2 = Infinity;
      for (let s2 = 0; s2 < t2.children.length; s2++) {
        let c2 = t2.children[s2], l2 = Bt(c2), u2 = (i2 = e, a2 = c2, (Math.max(a2.maxX, i2.maxX) - Math.min(a2.minX, i2.minX)) * (Math.max(a2.maxY, i2.maxY) - Math.min(a2.minY, i2.minY)) - l2);
        u2 < o2 ? (o2 = u2, r3 = l2 < r3 ? l2 : r3, n3 = c2) : u2 === o2 && l2 < r3 && (r3 = l2, n3 = c2);
      }
      t2 = n3 || t2.children[0];
    }
    var i2, a2;
    return t2;
  }
  _insert(e, t2, n2) {
    let r2 = n2 ? e : this.toBBox(e), i2 = [], a2 = this._chooseSubtree(r2, this.data, t2, i2);
    for (a2.children.push(e), Lt(a2, r2); t2 >= 0 && i2[t2].children.length > this._maxEntries; ) this._split(i2, t2), t2--;
    this._adjustParentBBoxes(r2, i2, t2);
  }
  _split(e, t2) {
    let n2 = e[t2], r2 = n2.children.length, i2 = this._minEntries;
    this._chooseSplitAxis(n2, i2, r2);
    let a2 = this._chooseSplitIndex(n2, i2, r2), o2 = U(n2.children.splice(a2, n2.children.length - a2));
    o2.height = n2.height, o2.leaf = n2.leaf, H(n2, this.toBBox), H(o2, this.toBBox), t2 ? e[t2 - 1].children.push(o2) : this._splitRoot(n2, o2);
  }
  _splitRoot(e, t2) {
    this.data = U([e, t2]), this.data.height = e.height + 1, this.data.leaf = false, H(this.data, this.toBBox);
  }
  _chooseSplitIndex(e, t2, n2) {
    let r2, i2 = Infinity, a2 = Infinity;
    for (let o2 = t2; o2 <= n2 - t2; o2++) {
      let t3 = It(e, 0, o2, this.toBBox), s2 = It(e, o2, n2, this.toBBox), c2 = Ht(t3, s2), l2 = Bt(t3) + Bt(s2);
      c2 < i2 ? (i2 = c2, r2 = o2, a2 = l2 < a2 ? l2 : a2) : c2 === i2 && l2 < a2 && (a2 = l2, r2 = o2);
    }
    return r2 || n2 - t2;
  }
  _chooseSplitAxis(e, t2, n2) {
    let r2 = e.leaf ? this.compareMinX : Rt, i2 = e.leaf ? this.compareMinY : zt;
    this._allDistMargin(e, t2, n2, r2) < this._allDistMargin(e, t2, n2, i2) && e.children.sort(r2);
  }
  _allDistMargin(e, t2, n2, r2) {
    e.children.sort(r2);
    let i2 = this.toBBox, a2 = It(e, 0, t2, i2), o2 = It(e, n2 - t2, n2, i2), s2 = Vt(a2) + Vt(o2);
    for (let r3 = t2; r3 < n2 - t2; r3++) {
      let t3 = e.children[r3];
      Lt(a2, e.leaf ? i2(t3) : t3), s2 += Vt(a2);
    }
    for (let r3 = n2 - t2 - 1; r3 >= t2; r3--) {
      let t3 = e.children[r3];
      Lt(o2, e.leaf ? i2(t3) : t3), s2 += Vt(o2);
    }
    return s2;
  }
  _adjustParentBBoxes(e, t2, n2) {
    for (let r2 = n2; r2 >= 0; r2--) Lt(t2[r2], e);
  }
  _condense(e) {
    for (let t2, n2 = e.length - 1; n2 >= 0; n2--) e[n2].children.length === 0 ? n2 > 0 ? (t2 = e[n2 - 1].children, t2.splice(t2.indexOf(e[n2]), 1)) : this.clear() : H(e[n2], this.toBBox);
  }
};
var qt = class {
  constructor(e) {
    this.tree = void 0, this.idToNode = void 0, this.nodeToId = void 0, this.tree = new Kt(e && e.maxEntries ? e.maxEntries : 9), this.idToNode = /* @__PURE__ */ new Map(), this.nodeToId = /* @__PURE__ */ new Map();
  }
  setMaps(e, t2) {
    this.idToNode.set(e.id, t2), this.nodeToId.set(t2, e.id);
  }
  toBBox(e) {
    let t2 = [], n2 = [], r2;
    if (e.geometry.type === "Polygon") r2 = e.geometry.coordinates[0];
    else if (e.geometry.type === "LineString") r2 = e.geometry.coordinates;
    else {
      if (e.geometry.type !== "Point") throw Error("Not a valid feature to turn into a bounding box");
      r2 = [e.geometry.coordinates];
    }
    for (let e2 = 0; e2 < r2.length; e2++) n2.push(r2[e2][1]), t2.push(r2[e2][0]);
    let i2 = Math.min(...n2), a2 = Math.max(...n2);
    return {
      minX: Math.min(...t2),
      minY: i2,
      maxX: Math.max(...t2),
      maxY: a2
    };
  }
  insert(e) {
    if (this.idToNode.get(String(e.id))) throw Error("Feature already exists");
    let t2 = this.toBBox(e);
    this.setMaps(e, t2), this.tree.insert(t2);
  }
  load(e) {
    let t2 = [], n2 = /* @__PURE__ */ new Set();
    e.forEach((e2) => {
      let r2 = this.toBBox(e2);
      if (this.setMaps(e2, r2), n2.has(String(e2.id))) throw Error(`Duplicate feature ID found ${e2.id}`);
      n2.add(String(e2.id)), t2.push(r2);
    }), this.tree.load(t2);
  }
  update(e) {
    this.remove(e.id);
    let t2 = this.toBBox(e);
    this.setMaps(e, t2), this.tree.insert(t2);
  }
  remove(e) {
    let t2 = this.idToNode.get(e);
    if (!t2) throw Error(`${e} not inserted into the spatial index`);
    this.tree.remove(t2);
  }
  clear() {
    this.tree.clear();
  }
  search(e) {
    return this.tree.search(this.toBBox(e)).map((e2) => this.nodeToId.get(e2));
  }
  collides(e) {
    return this.tree.collides(this.toBBox(e));
  }
};
var Jt = {
  getId: () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(e) {
    let t2 = 16 * Math.random() | 0;
    return (e == "x" ? t2 : 3 & t2 | 8).toString(16);
  }),
  isValidId: (e) => typeof e == "string" && e.length === 36
};
var Yt = { target: "geometry" };
var Xt = { target: "properties" };
var Zt = class {
  constructor(e) {
    this.idStrategy = void 0, this.tracked = void 0, this.spatialIndex = void 0, this.store = void 0, this._onChange = () => {
    }, this.store = {}, this.spatialIndex = new qt(), this.tracked = !e || false !== e.tracked, this.idStrategy = e && e.idStrategy ? e.idStrategy : Jt;
  }
  clone(e) {
    return JSON.parse(JSON.stringify(e));
  }
  getId() {
    return this.idStrategy.getId();
  }
  has(e) {
    return !!this.store[e];
  }
  load(e, t2, n2, r2) {
    if (e.length === 0) return [];
    let i2 = this.clone(e), a2 = [], o2 = [];
    i2 = i2.filter((e2) => {
      e2.id ?? (e2.id = this.idStrategy.getId());
      let n3 = e2.id;
      if (t2) {
        let r3 = t2(e2);
        if (!r3.valid) return a2.push({
          id: n3,
          valid: false,
          reason: r3.reason
        }), false;
      }
      if (this.tracked) {
        if (e2.properties.createdAt) {
          if (!p(e2.properties.createdAt)) return a2.push({
            id: e2.id,
            valid: false,
            reason: "createdAt is not a valid numeric timestamp"
          }), false;
        } else e2.properties.createdAt = +/* @__PURE__ */ new Date();
        if (e2.properties.updatedAt) {
          if (!p(e2.properties.updatedAt)) return a2.push({
            id: e2.id,
            valid: false,
            reason: "updatedAt is not a valid numeric timestamp"
          }), false;
        } else e2.properties.updatedAt = +/* @__PURE__ */ new Date();
      }
      return this.has(n3) ? (a2.push({
        id: n3,
        valid: false,
        reason: `Feature already exists with this id: ${n3}`
      }), false) : (this.store[n3] = e2, o2.push(e2), a2.push({
        id: n3,
        valid: true
      }), true);
    }), this.spatialIndex.load(i2);
    let s2 = o2.map(({ id: e2 }) => e2);
    return s2.length > 0 && (this._onChange(s2, "create", r2), n2 && o2.forEach((e2) => {
      n2(e2);
    })), a2;
  }
  search(e, t2) {
    let n2 = this.spatialIndex.search(e).map((e2) => this.store[e2]);
    return this.clone(t2 ? n2.filter(t2) : n2);
  }
  registerOnChange(e) {
    this._onChange = (t2, n2, r2) => {
      e(t2, n2, r2);
    };
  }
  getGeometryCopy(e) {
    let t2 = this.store[e];
    if (!t2) throw Error(`No feature with this id (${e}), can not get geometry copy`);
    return this.clone(t2.geometry);
  }
  getPropertiesCopy(e) {
    let t2 = this.store[e];
    if (!t2) throw Error(`No feature with this id (${e}), can not get properties copy`);
    return this.clone(t2.properties);
  }
  updateProperty(e, n2) {
    let r2 = /* @__PURE__ */ new Set();
    e.forEach(({ id: e2, property: t2, value: n3 }) => {
      let i2 = this.store[e2];
      if (!i2) throw Error(`No feature with this (${e2}), can not update geometry`);
      i2.properties[t2] !== n3 && (r2.add(e2), n3 === void 0 ? delete i2.properties[t2] : i2.properties[t2] = n3, this.tracked && (i2.properties.updatedAt = +/* @__PURE__ */ new Date()));
    }), this._onChange && r2.size > 0 && this._onChange(Array.from(r2), "update", n2 ? t({}, n2, Xt) : Xt);
  }
  updateGeometry(e, n2) {
    let r2 = /* @__PURE__ */ new Set();
    e.forEach(({ id: e2, geometry: t2 }) => {
      r2.add(e2);
      let n3 = this.store[e2];
      if (!n3) throw Error(`No feature with this (${e2}), can not update geometry`);
      n3.geometry = this.clone(t2), this.spatialIndex.update(n3), this.tracked && (n3.properties.updatedAt = +/* @__PURE__ */ new Date());
    }), this._onChange && r2.size > 0 && this._onChange(Array.from(r2), "update", n2 ? t({}, n2, Yt) : Yt);
  }
  create(e, n2) {
    let r2 = [];
    return e.forEach(({ geometry: e2, properties: n3 }) => {
      let i2, a2 = t({}, n3);
      this.tracked && (i2 = +/* @__PURE__ */ new Date(), n3 ? (a2.createdAt = typeof n3.createdAt == "number" ? n3.createdAt : i2, a2.updatedAt = typeof n3.updatedAt == "number" ? n3.updatedAt : i2) : a2 = {
        createdAt: i2,
        updatedAt: i2
      });
      let o2 = this.getId(), s2 = {
        id: o2,
        type: "Feature",
        geometry: e2,
        properties: a2
      };
      this.store[o2] = s2, this.spatialIndex.insert(s2), r2.push(o2);
    }), this._onChange && this._onChange([...r2], "create", n2), r2;
  }
  delete(e, t2) {
    e.forEach((e2) => {
      if (!this.store[e2]) throw Error(`No feature with id ${e2}, can not delete`);
      delete this.store[e2], this.spatialIndex.remove(e2);
    }), this._onChange && this._onChange([...e], "delete", t2);
  }
  copy(e) {
    return this.clone(this.store[e]);
  }
  copyAll() {
    return this.clone(Object.keys(this.store).map((e) => this.store[e]));
  }
  copyAllWhere(e) {
    return this.clone(Object.keys(this.store).map((e2) => this.store[e2]).filter((t2) => t2.properties && e(t2.properties)));
  }
  clear(e) {
    let t2 = Object.keys(this.store);
    this.store = {}, this.spatialIndex.clear(), this._onChange(t2, "delete", e);
  }
  size() {
    return Object.keys(this.store).length;
  }
};
Math.PI / 180;
var Qt = "Feature is not a Polygon or LineString";
var $t = "Feature intersects itself";
var en = (e) => e.geometry.type !== "Polygon" && e.geometry.type !== "LineString" ? {
  valid: false,
  reason: Qt
} : ae(e) ? {
  valid: false,
  reason: $t
} : { valid: true };
function tn(e, t2, n2) {
  let r2 = L(e, t2), i2 = L(t2, n2) - r2;
  return i2 < 0 && (i2 += 360), 180 - Math.abs(i2 - 90 - 90);
}
var nn = {
  cancel: "Escape",
  finish: "Enter"
};
var rn = {
  start: "crosshair",
  close: "pointer"
};
var an = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "angled-rectangle", this.currentCoordinate = 0, this.currentId = void 0, this.keyEvents = nn, this.cursors = rn, this.mouseMove = false, this.mutateFeature = void 0, this.readFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents));
  }
  close() {
    if (this.currentId === void 0 || !this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 },
      context: {
        updateType: o.Finish,
        action: n
      }
    })) return;
    let e = this.currentId;
    this.currentCoordinate = 0, this.currentId = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onMouseMove(e) {
    if (this.mouseMove = true, this.setCursor(this.cursors.start), this.currentId === void 0 || this.currentCoordinate === 0) return;
    let t2 = [];
    if (this.currentCoordinate === 1) t2 = this.getUpdateForSecondCoordinate(e);
    else {
      if (this.currentCoordinate !== 2) return;
      t2 = this.getNewSecondAndThirdCoordinates(e);
    }
    this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      coordinateMutations: t2,
      context: { updateType: o.Provisional }
    });
  }
  getUpdateForSecondCoordinate(e) {
    return [{
      type: k,
      index: 1,
      coordinate: [e.lng, e.lat]
    }, {
      type: k,
      index: 2,
      coordinate: [e.lng, e.lat]
    }];
  }
  getNewSecondAndThirdCoordinates(e) {
    if (!this.currentId) throw Error("No current feature being drawn");
    let t2 = this.readFeature.getCoordinate(this.currentId, 0), n2 = this.readFeature.getCoordinate(this.currentId, 1), r2 = pt(t2, n2, this.coordinatePrecision, this.project, this.unproject), i2 = T(t2[0], t2[1]), a2 = T(r2[0], r2[1]), o2 = T(n2[0], n2[1]), s2 = T(e.lng, e.lat), c2 = N(s2, i2) < N(s2, o2), l2 = tn(i2, a2, s2), u2 = c2 ? 90 - l2 : tn(i2, a2, s2) - 90, d2 = N(a2, s2), f2 = Math.cos(x(u2)) * d2, p2 = L(i2, o2) + ((function(e2, t3, n3) {
      let r3 = (n3.x - t3.x) * (e2.y - t3.y) - (n3.y - t3.y) * (e2.x - t3.x);
      return r3 > 1e-10 ? "left" : r3 < -1e-10 ? "right" : "left";
    })(i2, o2, s2) === "right" ? -90 : 90), m3 = Oe(i2, f2, p2), h2 = Oe(o2, f2, p2), g2 = E(m3.x, m3.y), _2 = E(h2.x, h2.y);
    return [{
      type: k,
      index: 2,
      coordinate: [C(_2.lng, this.coordinatePrecision), C(_2.lat, this.coordinatePrecision)]
    }, {
      type: k,
      index: 3,
      coordinate: [C(g2.lng, this.coordinatePrecision), C(g2.lat, this.coordinatePrecision)]
    }];
  }
  onClick(e) {
    if (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) if (this.currentCoordinate > 0 && !this.mouseMove && this.onMouseMove(e), this.mouseMove = false, this.currentCoordinate === 0) {
      let { id: t2 } = this.mutateFeature.createPolygon({
        coordinates: [
          [e.lng, e.lat],
          [e.lng, e.lat],
          [e.lng, e.lat],
          [e.lng, e.lat]
        ],
        properties: {
          mode: this.mode,
          [l.CURRENTLY_DRAWING]: true
        }
      });
      this.currentId = t2, this.currentCoordinate++, this.setDrawing();
    } else if (this.currentCoordinate === 1 && this.currentId) {
      let t2 = this.readFeature.getCoordinate(this.currentId, 0);
      if (xe([e.lng, e.lat], t2) || !this.mutateFeature.updatePolygon({
        featureId: this.currentId,
        coordinateMutations: [{
          type: k,
          index: 1,
          coordinate: [e.lng, e.lat]
        }, {
          type: O,
          index: 1,
          coordinate: [e.lng, e.lat]
        }],
        context: { updateType: o.Commit }
      })) return;
      this.currentCoordinate++;
    } else this.currentCoordinate === 2 && this.currentId && this.close();
  }
  onKeyUp(e) {
    if (e.key === this.keyEvents.cancel) this.cleanUp();
    else if (e.key === this.keyEvents.finish) {
      if (this.currentCoordinate < 2) return void this.cleanUp();
      this.close();
    }
  }
  onKeyDown() {
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  cleanUp() {
    let e = this.currentId;
    this.currentId = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e);
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.properties.mode === this.mode && e.geometry.type === "Polygon" && (n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u), n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => he(e2, this.coordinatePrecision));
  }
  afterFeatureUpdated(e) {
    this.currentId === e.id && (this.currentId = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted());
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate });
  }
};
function on(e, t2, n2) {
  return (t2.x - e.x) * (n2.y - e.y) - (t2.y - e.y) * (n2.x - e.x) <= 0;
}
var sn = {
  cancel: "Escape",
  finish: "Enter"
};
var cn = {
  start: "crosshair",
  close: "pointer"
};
var ln = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "sector", this.currentCoordinate = 0, this.currentId = void 0, this.keyEvents = sn, this.direction = void 0, this.arcPoints = 64, this.cursors = cn, this.mouseMove = false, this.readFeature = void 0, this.mutateFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.arcPoints && (this.arcPoints = e.arcPoints);
  }
  close() {
    if (this.currentId === void 0 || !this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 },
      coordinateMutations: {
        coordinates: this.readFeature.getGeometry(this.currentId).coordinates,
        type: j
      },
      context: {
        updateType: o.Finish,
        action: n
      }
    })) return;
    let e = this.currentId;
    this.currentCoordinate = 0, this.currentId = void 0, this.direction = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  getSectorCoordinates(e) {
    let t2 = this.readFeature.getCoordinates(this.currentId), n2 = t2[0], r2 = t2[1], i2 = [e.lng, e.lat], a2 = T(n2[0], n2[1]), o2 = T(r2[0], r2[1]), s2 = T(i2[0], i2[1]);
    if (this.direction === void 0) {
      let e2 = on(a2, o2, s2);
      this.direction = e2 ? "clockwise" : "anticlockwise";
    }
    let c2 = N(a2, o2), l2 = L(a2, o2), u2 = L(a2, s2), d2 = this.arcPoints, f2 = [n2], p2 = R(l2), m3 = R(u2), h2;
    this.direction === "anticlockwise" ? (h2 = m3 - p2, h2 < 0 && (h2 += 360)) : (h2 = p2 - m3, h2 < 0 && (h2 += 360));
    let g2 = (this.direction === "anticlockwise" ? 1 : -1) * h2 / d2;
    f2.push(r2);
    for (let e2 = 0; e2 <= d2; e2++) {
      let t3 = Oe(a2, c2, p2 + e2 * g2), { lng: n3, lat: r3 } = E(t3.x, t3.y), i3 = [C(n3, this.coordinatePrecision), C(r3, this.coordinatePrecision)];
      i3[0] !== f2[f2.length - 1][0] && i3[1] !== f2[f2.length - 1][1] && f2.push(i3);
    }
    return f2.push(n2), f2;
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onMouseMove(e) {
    if (this.mouseMove = true, this.setCursor(this.cursors.start), this.currentId === void 0 || this.currentCoordinate === 0) return;
    let t2;
    if (this.currentCoordinate === 1) t2 = [{
      type: k,
      index: 1,
      coordinate: [e.lng, e.lat]
    }, {
      type: k,
      index: 2,
      coordinate: [e.lng, e.lat]
    }];
    else {
      if (this.currentCoordinate !== 2) return;
      {
        let n2 = this.getSectorCoordinates(e);
        if (!n2) return;
        t2 = {
          type: j,
          coordinates: [n2]
        };
      }
    }
    this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      coordinateMutations: t2,
      context: { updateType: o.Provisional }
    });
  }
  onClick(e) {
    if (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) if (this.currentCoordinate > 0 && !this.mouseMove && this.onMouseMove(e), this.mouseMove = false, this.currentCoordinate === 0) {
      let t2 = this.mutateFeature.createPolygon({
        coordinates: [
          [e.lng, e.lat],
          [e.lng, e.lat],
          [e.lng, e.lat],
          [e.lng, e.lat]
        ],
        properties: {
          mode: this.mode,
          [l.CURRENTLY_DRAWING]: true
        }
      });
      this.currentId = t2?.id, this.currentCoordinate++, this.setDrawing();
    } else if (this.currentCoordinate === 1 && this.currentId) {
      if (this.readFeature.coordinateAtIndexIsIdentical({
        featureId: this.currentId,
        index: 0,
        newCoordinate: [e.lng, e.lat]
      }) || !this.mutateFeature.updatePolygon({
        featureId: this.currentId,
        coordinateMutations: [{
          type: k,
          index: 1,
          coordinate: [e.lng, e.lat]
        }, {
          type: k,
          index: 2,
          coordinate: [e.lng, e.lat]
        }],
        context: { updateType: o.Provisional }
      })) return;
      this.currentCoordinate++;
    } else this.currentCoordinate === 2 && this.currentId && this.close();
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && this.close();
  }
  onKeyDown() {
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  cleanUp() {
    let e = this.currentId;
    this.currentId = void 0, this.direction = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e);
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.properties.mode === this.mode && e.geometry.type === "Polygon" && (n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u), n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => he(e2, this.coordinatePrecision));
  }
  afterFeatureUpdated(e) {
    this.currentId === e.id && (this.currentId = void 0, this.direction = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted());
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate });
  }
};
var un = {
  cancel: "Escape",
  finish: "Enter"
};
var dn = {
  start: "crosshair",
  close: "pointer"
};
var fn = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "sensor", this.currentCoordinate = 0, this.currentId = void 0, this.currentInitialArcId = void 0, this.currentStartingPointId = void 0, this.keyEvents = un, this.direction = void 0, this.arcPoints = 64, this.cursors = dn, this.mouseMove = false, this.readFeature = void 0, this.mutateFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.arcPoints && (this.arcPoints = e.arcPoints);
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onMouseMove(e) {
    if (this.mouseMove = true, this.setCursor(this.cursors.start), this.currentInitialArcId !== void 0 && this.currentStartingPointId !== void 0 && this.currentCoordinate !== 0) {
      if (this.currentCoordinate === 2) {
        let t2 = this.getUpdatedLineStringCoordinates(e);
        if (!t2) return;
        this.mutateFeature.updateLineString({
          featureId: this.currentInitialArcId,
          coordinateMutations: {
            type: j,
            coordinates: t2
          },
          context: { updateType: o.Provisional }
        });
      } else if (this.currentCoordinate === 3) {
        let t2 = this.getUpdatedPolygonCoordinates(e);
        if (!t2) return;
        if (this.currentId) this.mutateFeature.updatePolygon({
          featureId: this.currentId,
          coordinateMutations: {
            type: j,
            coordinates: [t2]
          },
          context: { updateType: o.Provisional }
        });
        else {
          let e2 = this.mutateFeature.createPolygon({
            coordinates: t2,
            properties: {
              mode: this.mode,
              [l.CURRENTLY_DRAWING]: true
            }
          });
          if (!e2) return;
          this.currentId = e2.id;
        }
      }
    }
  }
  onClick(e) {
    if (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) if (this.currentCoordinate > 0 && !this.mouseMove && this.onMouseMove(e), this.mouseMove = false, this.currentCoordinate === 0) {
      let t2 = this.mutateFeature.createPoint({
        coordinates: [e.lng, e.lat],
        properties: { mode: this.mode }
      });
      if (!t2) return;
      this.currentStartingPointId = t2.id, this.currentCoordinate++, this.setDrawing();
    } else if (this.currentCoordinate === 1 && this.currentStartingPointId) {
      let t2 = this.mutateFeature.createLineString({
        coordinates: [[e.lng, e.lat], [e.lng, e.lat]],
        properties: { mode: this.mode }
      });
      if (!t2) return;
      this.currentInitialArcId = t2.id, this.currentCoordinate++;
    } else this.currentCoordinate === 2 && this.currentStartingPointId ? this.currentCoordinate++ : this.currentCoordinate === 3 && this.currentStartingPointId && this.close();
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && this.close();
  }
  onKeyDown() {
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  cleanUp() {
    this.mutateFeature.deleteFeatureIfPresent(this.currentStartingPointId), this.mutateFeature.deleteFeatureIfPresent(this.currentInitialArcId), this.mutateFeature.deleteFeatureIfPresent(this.currentId), this.currentStartingPointId = void 0, this.direction = void 0, this.currentId = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted();
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.properties.mode === this.mode && (e.geometry.type === "Polygon" ? (n2.polygonFillColor = this.getHexColorStylingValue(this.styles.fillColor, n2.polygonFillColor, e), n2.polygonOutlineColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.polygonOutlineWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.polygonOutlineOpacity = this.getNumericStylingValue(this.styles.outlineOpacity, 1, e), n2.polygonFillOpacity = this.getNumericStylingValue(this.styles.fillOpacity, n2.polygonFillOpacity, e), n2.zIndex = u) : e.geometry.type === "LineString" ? (n2.lineStringColor = this.getHexColorStylingValue(this.styles.outlineColor, n2.polygonOutlineColor, e), n2.lineStringWidth = this.getNumericStylingValue(this.styles.outlineWidth, n2.polygonOutlineWidth, e), n2.zIndex = u) : e.geometry.type === "Point" && (n2.pointColor = this.getHexColorStylingValue(this.styles.centerPointColor, n2.pointColor, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.centerPointOpacity, 1, e), n2.pointWidth = this.getNumericStylingValue(this.styles.centerPointWidth, n2.pointWidth, e), n2.pointOutlineColor = this.getHexColorStylingValue(this.styles.centerPointOutlineColor, n2.pointOutlineColor, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.centerPointOutlineOpacity, 1, e), n2.pointOutlineWidth = this.getNumericStylingValue(this.styles.centerPointOutlineWidth, n2.pointOutlineWidth, e), n2.zIndex = 20)), n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => he(e2, this.coordinatePrecision));
  }
  afterFeatureUpdated(e) {
    this.currentId === e.id && (this.mutateFeature.deleteFeatureIfPresent(this.currentStartingPointId), this.mutateFeature.deleteFeatureIfPresent(this.currentInitialArcId), this.currentStartingPointId = void 0, this.direction = void 0, this.currentId = void 0, this.currentCoordinate = 0, this.state === "drawing" && this.setStarted());
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate });
  }
  close() {
    if (this.currentStartingPointId === void 0) return;
    let e = this.currentStartingPointId, t2 = this.currentInitialArcId;
    if (this.currentId && !this.mutateFeature.updatePolygon({
      featureId: this.currentId,
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 },
      coordinateMutations: {
        coordinates: this.readFeature.getGeometry(this.currentId).coordinates,
        type: j
      },
      context: {
        updateType: o.Finish,
        action: n
      }
    })) return;
    let r2 = this.currentId;
    this.mutateFeature.deleteFeatureIfPresent(e), this.mutateFeature.deleteFeatureIfPresent(t2), this.currentCoordinate = 0, this.currentStartingPointId = void 0, this.currentInitialArcId = void 0, this.currentId = void 0, this.direction = void 0, this.state === "drawing" && this.setStarted(), r2 && this.onFinish(r2, {
      mode: this.mode,
      action: n
    });
  }
  getUpdatedPolygonCoordinates(e) {
    if (this.currentInitialArcId === void 0 || this.currentStartingPointId === void 0 || this.currentCoordinate < 3) return;
    let t2 = this.readFeature.getCoordinates(this.currentInitialArcId);
    if (t2.length < 2 || !this.direction) return;
    let n2 = this.readFeature.getGeometry(this.currentStartingPointId).coordinates, r2 = t2[0], i2 = t2[t2.length - 1], a2 = T(e.lng, e.lat), o2 = T(r2[0], r2[1]), s2 = T(i2[0], i2[1]), c2 = T(n2[0], n2[1]), l2 = N(c2, o2), u2 = N(c2, a2) < l2 ? o2 : a2, d2 = L(c2, a2), f2 = L(c2, o2), p2 = L(c2, s2), m3 = R(f2), h2 = R(p2), g2 = R(d2);
    if (this.notInSector({
      normalizedCursor: g2,
      normalizedStart: m3,
      normalizedEnd: h2,
      direction: this.direction
    })) return;
    let _2 = this.getDeltaBearing(this.direction, m3, h2), v2 = this.arcPoints, y2 = (this.direction === "anticlockwise" ? 1 : -1) * _2 / v2, b2 = N(c2, u2), x2 = [];
    for (let e2 = 0; e2 <= v2; e2++) {
      let n3 = Oe(c2, b2, m3 + e2 * y2), { lng: r3, lat: i3 } = E(n3.x, n3.y), a3 = [C(r3, this.coordinatePrecision), C(i3, this.coordinatePrecision)];
      a3[0] !== t2[t2.length - 1][0] && a3[1] !== t2[t2.length - 1][1] && x2.unshift(a3);
    }
    return t2.push(...x2), t2.push(t2[0]), t2;
  }
  getUpdatedLineStringCoordinates(e) {
    if (this.currentInitialArcId === void 0 || this.currentStartingPointId === void 0 || this.currentCoordinate < 2) return;
    let t2 = this.readFeature.getGeometry(this.currentInitialArcId).coordinates, n2 = this.readFeature.getGeometry(this.currentStartingPointId).coordinates, r2 = t2[0], i2 = [e.lng, e.lat], a2 = T(r2[0], r2[1]), o2 = T(i2[0], i2[1]), s2 = T(n2[0], n2[1]), c2 = N(s2, a2);
    if (this.direction === void 0) {
      let e2 = on(s2, a2, o2);
      this.direction = e2 ? "clockwise" : "anticlockwise";
    }
    let l2 = L(s2, a2), u2 = L(s2, o2), d2 = this.arcPoints, f2 = [r2], p2 = R(l2), m3 = R(u2), h2;
    this.direction === "anticlockwise" ? (h2 = m3 - p2, h2 < 0 && (h2 += 360)) : (h2 = p2 - m3, h2 < 0 && (h2 += 360));
    let g2 = (this.direction === "anticlockwise" ? 1 : -1) * h2 / d2;
    for (let e2 = 0; e2 <= d2; e2++) {
      let t3 = Oe(s2, c2, p2 + e2 * g2), { lng: n3, lat: r3 } = E(t3.x, t3.y), i3 = [C(n3, this.coordinatePrecision), C(r3, this.coordinatePrecision)];
      i3[0] !== f2[f2.length - 1][0] && i3[1] !== f2[f2.length - 1][1] && f2.push(i3);
    }
    return f2;
  }
  getDeltaBearing(e, t2, n2) {
    let r2;
    return e === "anticlockwise" ? (r2 = n2 - t2, r2 < 0 && (r2 += 360)) : (r2 = t2 - n2, r2 < 0 && (r2 += 360)), r2;
  }
  notInSector({ normalizedCursor: e, normalizedStart: t2, normalizedEnd: n2, direction: r2 }) {
    return r2 === "clockwise" ? t2 <= n2 ? e >= t2 && e <= n2 : e >= t2 || e <= n2 : t2 >= n2 ? e <= t2 && e >= n2 : e <= t2 || e >= n2;
  }
};
var W = class {
  constructor({ name: e, callback: t2, unregister: n2, register: r2 }) {
    this.name = void 0, this.callback = void 0, this.registered = false, this.register = void 0, this.unregister = void 0, this.name = e, this.register = () => {
      this.registered || (this.registered = true, r2(t2));
    }, this.unregister = () => {
      this.register && (this.registered = false, n2(t2));
    }, this.callback = t2;
  }
};
var pn = {
  __proto__: null,
  GeoJSONStore: Zt,
  TerraDrawBaseDrawMode: _,
  TerraDrawBaseSelectMode: v,
  TerraDrawBaseAdapter: class {
    constructor(e) {
      this._nextKeyUpIsContextMenu = false, this._lastPointerDownEventTarget = void 0, this._ignoreMismatchedPointerEvents = false, this._minPixelDragDistance = void 0, this._minPixelDragDistanceDrawing = void 0, this._minPixelDragDistanceSelecting = void 0, this._lastDrawEvent = void 0, this._coordinatePrecision = void 0, this._heldKeys = /* @__PURE__ */ new Set(), this._listeners = [], this._dragState = "not-dragging", this._currentModeCallbacks = void 0, this._ignoreMismatchedPointerEvents = typeof e.ignoreMismatchedPointerEvents == "boolean" && e.ignoreMismatchedPointerEvents, this._minPixelDragDistance = typeof e.minPixelDragDistance == "number" ? e.minPixelDragDistance : 1, this._minPixelDragDistanceSelecting = typeof e.minPixelDragDistanceSelecting == "number" ? e.minPixelDragDistanceSelecting : 1, this._minPixelDragDistanceDrawing = typeof e.minPixelDragDistanceDrawing == "number" ? e.minPixelDragDistanceDrawing : 8, this._coordinatePrecision = typeof e.coordinatePrecision == "number" ? e.coordinatePrecision : 9;
    }
    getButton(e) {
      return e.button === -1 ? "neither" : e.button === 0 ? "left" : e.button === 1 ? "middle" : e.button === 2 ? "right" : "neither";
    }
    getMapElementXYPosition(e) {
      let { left: t2, top: n2 } = this.getMapEventElement(e.type).getBoundingClientRect();
      return {
        containerX: e.clientX - t2,
        containerY: e.clientY - n2
      };
    }
    getDrawEventFromEvent(e, t2 = false) {
      let n2 = this.getLngLatFromEvent(e);
      if (!n2) return null;
      let { lng: r2, lat: i2 } = n2, { containerX: a2, containerY: o2 } = this.getMapElementXYPosition(e), s2 = this.getButton(e), c2 = Array.from(this._heldKeys);
      return {
        lng: C(r2, this._coordinatePrecision),
        lat: C(i2, this._coordinatePrecision),
        containerX: a2,
        containerY: o2,
        button: s2,
        heldKeys: c2,
        isContextMenu: t2
      };
    }
    register(e) {
      this._currentModeCallbacks = e, this._listeners = this.getAdapterListeners(), this._listeners.forEach((e2) => {
        e2.register();
      });
    }
    getCoordinatePrecision() {
      return this._coordinatePrecision;
    }
    getAdapterListeners() {
      return [
        new W({
          name: "pointerdown",
          callback: (e) => {
            if (!this._currentModeCallbacks || !e.isPrimary) return;
            let t2 = this.getDrawEventFromEvent(e);
            t2 && (this._dragState = "pre-dragging", this._lastDrawEvent = t2, this._lastPointerDownEventTarget = e.target ? e.target : void 0);
          },
          register: (e) => {
            this.getMapEventElement("pointerdown").addEventListener("pointerdown", e);
          },
          unregister: (e) => {
            this.getMapEventElement("pointerdown").removeEventListener("pointerdown", e);
          }
        }),
        new W({
          name: "pointermove",
          callback: (e) => {
            if (!this._currentModeCallbacks || !e.isPrimary) return;
            e.preventDefault();
            let t2 = this.getDrawEventFromEvent(e);
            if (t2) if (this._dragState === "not-dragging") this._currentModeCallbacks.onMouseMove(t2), this._lastDrawEvent = t2;
            else if (this._dragState === "pre-dragging") {
              if (!this._lastDrawEvent) return;
              let e2 = {
                x: this._lastDrawEvent.containerX,
                y: this._lastDrawEvent.containerY
              }, n2 = {
                x: t2.containerX,
                y: t2.containerY
              }, r2 = this._currentModeCallbacks.getState(), i2 = N(e2, n2), a2 = false;
              if (a2 = r2 === "drawing" ? i2 < this._minPixelDragDistanceDrawing : r2 === "selecting" ? i2 < this._minPixelDragDistanceSelecting : i2 < this._minPixelDragDistance, a2) return;
              this._nextKeyUpIsContextMenu = false, this._dragState = "dragging", this._currentModeCallbacks.onDragStart(t2, (e3) => {
                this.setDraggability.bind(this)(e3);
              });
            } else this._dragState === "dragging" && this._currentModeCallbacks.onDrag(t2, (e2) => {
              this.setDraggability.bind(this)(e2);
            });
          },
          register: (e) => {
            this.getMapEventElement("pointermove").addEventListener("pointermove", e);
          },
          unregister: (e) => {
            this.getMapEventElement("pointermove").removeEventListener("pointermove", e);
          }
        }),
        new W({
          name: "contextmenu",
          callback: (e) => {
            this._currentModeCallbacks && (e.preventDefault(), this._nextKeyUpIsContextMenu = true);
          },
          register: (e) => {
            this.getMapEventElement("contextmenu").addEventListener("contextmenu", e);
          },
          unregister: (e) => {
            this.getMapEventElement("contextmenu").removeEventListener("contextmenu", e);
          }
        }),
        new W({
          name: "pointerup",
          callback: (e) => {
            if (!this._currentModeCallbacks || e.target !== this.getMapEventElement("pointerup") || this._ignoreMismatchedPointerEvents && this._lastPointerDownEventTarget !== e.target || (this._lastPointerDownEventTarget = void 0, !e.isPrimary)) return;
            let t2 = this.getDrawEventFromEvent(e);
            t2 && (this._dragState === "dragging" ? this._currentModeCallbacks.onDragEnd(t2, (e2) => {
              this.setDraggability.bind(this)(e2);
            }) : this._dragState !== "not-dragging" && this._dragState !== "pre-dragging" || (this._nextKeyUpIsContextMenu && (this._nextKeyUpIsContextMenu = (t2.isContextMenu = true, false)), this._currentModeCallbacks.onClick(t2)), this._dragState = "not-dragging", this.setDraggability(true));
          },
          register: (e) => {
            this.getMapEventElement("pointerup").addEventListener("pointerup", e);
          },
          unregister: (e) => {
            this.getMapEventElement("pointerup").removeEventListener("pointerup", e);
          }
        }),
        new W({
          name: "keyup",
          callback: (e) => {
            this._currentModeCallbacks && (this._heldKeys.delete(e.key), this._currentModeCallbacks.onKeyUp({
              key: e.key,
              heldKeys: Array.from(this._heldKeys),
              preventDefault: () => e.preventDefault()
            }));
          },
          register: (e) => {
            this.getMapEventElement("keyup").addEventListener("keyup", e);
          },
          unregister: (e) => {
            this.getMapEventElement("keyup").removeEventListener("keyup", e);
          }
        }),
        new W({
          name: "keydown",
          callback: (e) => {
            this._currentModeCallbacks && (this._heldKeys.add(e.key), this._currentModeCallbacks.onKeyDown({
              key: e.key,
              heldKeys: Array.from(this._heldKeys),
              preventDefault: () => e.preventDefault()
            }));
          },
          register: (e) => {
            this.getMapEventElement("keydown").addEventListener("keydown", e);
          },
          unregister: (e) => {
            this.getMapEventElement("keydown").removeEventListener("keydown", e);
          }
        })
      ];
    }
    unregister() {
      this._listeners.forEach((e) => {
        e.unregister();
      }), this.clear(), this._currentModeCallbacks = void 0, this._lastDrawEvent = void 0, this._lastPointerDownEventTarget = void 0, this._nextKeyUpIsContextMenu = false;
    }
  },
  getDefaultStyling: () => ({
    polygonFillColor: "#3f97e0",
    polygonOutlineColor: "#3f97e0",
    polygonOutlineWidth: 4,
    polygonOutlineOpacity: 1,
    polygonFillOpacity: 0.3,
    pointColor: "#3f97e0",
    pointOpacity: 1,
    pointOutlineColor: "#ffffff",
    pointOutlineOpacity: 1,
    pointOutlineWidth: 0,
    pointWidth: 6,
    lineStringColor: "#3f97e0",
    lineStringWidth: 4,
    lineStringOpacity: 1,
    zIndex: 0,
    markerUrl: void 0,
    markerHeight: void 0,
    markerWidth: void 0,
    lineStringDash: void 0
  }),
  SELECT_PROPERTIES: c
};
var mn = {
  cancel: "Escape",
  finish: "Enter"
};
var hn = {
  start: "crosshair",
  close: "pointer"
};
var gn = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "freehand-linestring", this.canClose = false, this.currentId = void 0, this.minDistance = 20, this.keyEvents = mn, this.cursors = hn, this.preventNewFeature = false, this.mutateFeature = void 0, this.readFeature = void 0, this.pixelDistance = void 0, this.closingPoints = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.minDistance && (this.minDistance = e.minDistance), e?.keyEvents === null ? this.keyEvents = {
      cancel: null,
      finish: null
    } : e != null && e.keyEvents && (this.keyEvents = t({}, this.keyEvents, e.keyEvents)), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors));
  }
  close() {
    if (this.currentId === void 0 || !this.mutateFeature.updateLineString({
      featureId: this.currentId,
      propertyMutations: { [l.CURRENTLY_DRAWING]: void 0 },
      context: {
        updateType: o.Finish,
        action: n
      }
    })) return;
    let e = this.currentId;
    this.closingPoints.delete(), this.canClose = false, this.currentId = void 0, this.state === "drawing" && this.setStarted(), this.onFinish(e, {
      mode: this.mode,
      action: n
    });
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.start);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onMouseMove(e) {
    if (this.currentId === void 0 || false === this.canClose) return void this.setCursor(this.cursors.start);
    let [t2, n2] = this.readFeature.getCoordinate(this.currentId, -2), { x: r2, y: i2 } = this.project(t2, n2), a2 = N({
      x: r2,
      y: i2
    }, {
      x: e.containerX,
      y: e.containerY
    }), [s2, c2] = this.readFeature.getCoordinate(this.currentId, -1), { x: l2, y: u2 } = this.project(s2, c2), d2 = N({
      x: l2,
      y: u2
    }, {
      x: e.containerX,
      y: e.containerY
    });
    if (this.setCursor(d2 < this.pointerDistance ? this.cursors.close : this.cursors.start), a2 < this.minDistance) return;
    let f2 = this.mutateFeature.updateLineString({
      featureId: this.currentId,
      coordinateMutations: [{
        type: O,
        index: -1,
        coordinate: [e.lng, e.lat]
      }],
      context: { updateType: o.Provisional }
    });
    f2 && this.closingPoints.update(f2.geometry.coordinates);
  }
  onClick(e) {
    if (e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e)) {
      if (this.preventNewFeature) return;
      if (false === this.canClose) {
        let { id: t2, geometry: n2 } = this.mutateFeature.createLineString({
          coordinates: [[e.lng, e.lat], [e.lng, e.lat]],
          properties: {
            mode: this.mode,
            [l.CURRENTLY_DRAWING]: true
          }
        });
        this.closingPoints.create(n2.coordinates), this.currentId = t2, this.canClose = true, this.state !== "drawing" && this.setDrawing();
        return;
      }
      this.close();
    }
  }
  onKeyDown() {
  }
  onKeyUp(e) {
    e.key === this.keyEvents.cancel ? this.cleanUp() : e.key === this.keyEvents.finish && true === this.canClose && this.close();
  }
  onDragStart() {
  }
  onDrag() {
  }
  onDragEnd() {
  }
  cleanUp() {
    let e = this.currentId;
    this.currentId = void 0, this.canClose = false, this.state === "drawing" && this.setStarted(), this.mutateFeature.deleteFeatureIfPresent(e), this.closingPoints.delete();
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.type === "Feature" && e.geometry.type === "LineString" && e.properties.mode === this.mode ? (n2.lineStringDash = this.styles.lineStringDash, n2.lineStringColor = this.getHexColorStylingValue(this.styles.lineStringColor, n2.lineStringColor, e), n2.lineStringOpacity = this.getNumericStylingValue(this.styles.lineStringOpacity, n2.lineStringOpacity === void 0 ? 1 : n2.lineStringOpacity, e), n2.lineStringWidth = this.getNumericStylingValue(this.styles.lineStringWidth, n2.lineStringWidth, e), n2.zIndex = u, n2) : e.type === "Feature" && e.geometry.type === "Point" && e.properties.mode === this.mode ? (n2.pointWidth = this.getNumericStylingValue(this.styles.closingPointWidth, n2.pointWidth, e), n2.pointOpacity = this.getNumericStylingValue(this.styles.closingPointOpacity, 1, e), n2.pointColor = this.getHexColorStylingValue(this.styles.closingPointColor, n2.pointColor, e), n2.pointOutlineColor = this.getHexColorStylingValue(this.styles.closingPointOutlineColor, n2.pointOutlineColor, e), n2.pointOutlineOpacity = this.getNumericStylingValue(this.styles.closingPointOutlineOpacity, 1, e), n2.pointOutlineWidth = this.getNumericStylingValue(this.styles.closingPointOutlineWidth, 2, e), n2.zIndex = 50, n2) : n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => Pe(e2, this.coordinatePrecision));
  }
  afterFeatureUpdated(e) {
    this.currentId === e.id && (this.closingPoints.delete(), this.canClose = false, this.currentId = void 0);
  }
  registerBehaviors(e) {
    this.readFeature = new P(e), this.mutateFeature = new M(e, { validate: this.validate }), this.pixelDistance = new I(e), this.closingPoints = new Ue(e, this.pixelDistance, this.mutateFeature, this.readFeature);
  }
};
function _n(e) {
  if (e === null || typeof e == "boolean" || typeof e == "string") return true;
  if (e === void 0) return false;
  if (typeof e == "number") return Number.isFinite(e);
  if (typeof e == "bigint" || typeof e == "symbol" || typeof e == "function" || e instanceof RegExp || e instanceof Map || e instanceof Set || e instanceof Date) return false;
  if (typeof e == "object" && e && !Array.isArray(e)) {
    let t2 = Object.getPrototypeOf(e);
    if (t2 !== Object.prototype && t2 !== null) return false;
  }
  if (ArrayBuffer.isView(e) && !(e instanceof DataView)) return false;
  if (Array.isArray(e)) {
    for (let t2 of e) if (!_n(t2)) return false;
  }
  return typeof e == "object" && Object.keys(e).every((t2) => typeof t2 == "string" && _n(e[t2]));
}
var vn = {
  create: "crosshair",
  dragStart: "grabbing",
  dragEnd: "crosshair"
};
var yn = class extends _ {
  constructor(e) {
    super(e, true), this.mode = "marker", this.cursors = vn, this.editable = false, this.editedFeatureId = void 0, this.pixelDistance = void 0, this.clickBoundingBox = void 0, this.pointSearch = void 0, this.mutateFeature = void 0, this.updateOptions(e);
  }
  updateOptions(e) {
    super.updateOptions(e), e != null && e.cursors && (this.cursors = t({}, this.cursors, e.cursors)), e != null && e.editable && (this.editable = e.editable);
  }
  start() {
    this.setStarted(), this.setCursor(this.cursors.create);
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset");
  }
  onClick(e) {
    e.button === "right" && this.allowPointerEvent(this.pointerEvents.rightClick, e) || e.isContextMenu && this.allowPointerEvent(this.pointerEvents.contextMenu, e) ? this.onRightClick(e) : e.button === "left" && this.allowPointerEvent(this.pointerEvents.leftClick, e) && this.onLeftClick(e);
  }
  onMouseMove() {
  }
  onKeyDown() {
  }
  onKeyUp() {
  }
  cleanUp() {
    this.editedFeatureId = void 0;
  }
  onDragStart(e, t2) {
    if (this.allowPointerEvent(this.pointerEvents.onDragStart, e)) {
      if (this.editable) {
        let t3 = this.pointSearch.getNearestPointFeature(e);
        this.editedFeatureId = t3?.id;
      }
      this.editedFeatureId && (this.setCursor(this.cursors.dragStart), t2(false));
    }
  }
  onDrag(e, t2) {
    this.allowPointerEvent(this.pointerEvents.onDrag, e) && this.editedFeatureId !== void 0 && this.mutateFeature.updatePoint({
      featureId: this.editedFeatureId,
      coordinateMutations: {
        type: j,
        coordinates: [e.lng, e.lat]
      },
      propertyMutations: { [l.EDITED]: true },
      context: { updateType: o.Provisional }
    });
  }
  onDragEnd(e, t2) {
    if (!this.allowPointerEvent(this.pointerEvents.onDragEnd, e) || this.editedFeatureId === void 0 || !this.mutateFeature.updatePoint({
      featureId: this.editedFeatureId,
      propertyMutations: {
        mode: this.mode,
        [l.EDITED]: false
      },
      context: {
        updateType: o.Finish,
        action: "edit"
      }
    })) return;
    let r2 = this.editedFeatureId;
    this.setCursor(this.cursors.dragEnd), this.editedFeatureId = void 0, t2(true), this.onFinish(r2, {
      mode: this.mode,
      action: n
    });
  }
  registerBehaviors(e) {
    this.pixelDistance = new I(e), this.clickBoundingBox = new F(e), this.pointSearch = new nt(e, this.pixelDistance, this.clickBoundingBox), this.mutateFeature = new M(e, { validate: this.validate });
  }
  styleFeature(e) {
    let n2 = t({}, {
      polygonFillColor: "#3f97e0",
      polygonOutlineColor: "#3f97e0",
      polygonOutlineWidth: 4,
      polygonOutlineOpacity: 1,
      polygonFillOpacity: 0.3,
      pointColor: "#3f97e0",
      pointOpacity: 1,
      pointOutlineColor: "#ffffff",
      pointOutlineOpacity: 1,
      pointOutlineWidth: 0,
      pointWidth: 6,
      lineStringColor: "#3f97e0",
      lineStringWidth: 4,
      lineStringOpacity: 1,
      zIndex: 0,
      markerUrl: void 0,
      markerHeight: void 0,
      markerWidth: void 0,
      lineStringDash: void 0
    });
    return e.type === "Feature" && e.geometry.type === "Point" && e.properties.mode === this.mode && (n2.zIndex = 30, n2.markerHeight = this.getNumericStylingValue(this.styles?.markerHeight, 40, e), n2.markerWidth = this.getNumericStylingValue(this.styles?.markerWidth, 32, e), n2.markerUrl = this.getUrlStylingValue(this.styles?.markerUrl, s, e)), n2;
  }
  validateFeature(e) {
    return this.validateModeFeature(e, (e2) => tt(e2, this.coordinatePrecision));
  }
  onLeftClick(e) {
    let t2 = this.mutateFeature.createPoint({
      coordinates: [e.lng, e.lat],
      properties: {
        mode: this.mode,
        [l.MARKER]: true
      },
      context: {
        updateType: o.Finish,
        action: n
      }
    });
    t2 && this.onFinish(t2.id, {
      mode: this.mode,
      action: n
    });
  }
  onRightClick(e) {
    if (!this.editable) return;
    let t2 = this.pointSearch.getNearestPointFeature(e);
    t2 && this.mutateFeature.deleteFeatureIfPresent(t2.id);
  }
  afterFeatureUpdated(e) {
    this.editedFeatureId === e.id && (this.editedFeatureId = void 0, this.setCursor(this.cursors.create));
  }
};
var bn = [{
  key: "z",
  heldKeys: ["meta"]
}, {
  key: "z",
  heldKeys: ["control"]
}];
var xn = [
  {
    key: "z",
    heldKeys: ["meta", "shift"]
  },
  {
    key: "z",
    heldKeys: ["control", "shift"]
  },
  {
    key: "y",
    heldKeys: ["control"]
  }
];
var Sn = (e, t2) => {
  let n2 = e.key.toLowerCase(), r2 = new Set(e.heldKeys.map((e2) => e2.toLowerCase()).filter((e2) => e2 !== n2));
  if (t2.key.toLowerCase() !== n2) return false;
  let i2 = new Set(t2.heldKeys.map((e2) => e2.toLowerCase()));
  if (r2.size !== i2.size) return false;
  for (let e2 of i2) if (!r2.has(e2)) return false;
  return true;
};
var Cn = class {
  constructor(e) {
    this.undoKeyboardShortcuts = void 0, this.redoKeyboardShortcuts = void 0, this.undoKeyboardShortcuts = e?.undo ?? bn, this.redoKeyboardShortcuts = e?.redo ?? xn;
  }
  isUndoKeyboardShortcut(e) {
    return this.undoKeyboardShortcuts.some((t2) => Sn(e, t2));
  }
  isRedoKeyboardShortcut(e) {
    return this.redoKeyboardShortcuts.some((t2) => Sn(e, t2));
  }
};
function wn(e) {
  return e !== void 0 && Number.isFinite(e) ? Math.max(0, Math.floor(e)) : Infinity;
}
var G = "undo";
var K = "redo";
var q = "push";
var J = "mode";
var Tn = "session";
var En = class {
  constructor(e) {
    this.getModeState = void 0, this.getModeHistorySizes = void 0, this.undoMode = void 0, this.redoMode = void 0, this.clearModeHistory = void 0, this.onHistoryChange = void 0, this.maxStackSize = void 0, this.lastHistorySizes = {
      undoSize: 0,
      redoSize: 0
    }, this.maxStackSize = wn(e?.maxStackSize);
  }
  getMaxStackSize() {
    return this.maxStackSize;
  }
  register(e) {
    this.getModeState = e.getModeState, this.getModeHistorySizes = e.getModeHistorySizes, this.undoMode = e.undoMode, this.redoMode = e.redoMode, this.clearModeHistory = e.clearModeHistory, this.onHistoryChange = e.onHistoryChange;
  }
  inDrawingState() {
    return !!this.getModeState && this.getModeState() === "drawing";
  }
  canUndo() {
    if (!this.inDrawingState()) return false;
    let { undoSize: e } = this.getHistorySizes();
    return e > 0;
  }
  canRedo() {
    if (!this.inDrawingState()) return false;
    let { redoSize: e } = this.getHistorySizes();
    return e > 0;
  }
  undo() {
    return !(!this.canUndo() || !this.undoMode || (this.undoMode(), this.emitHistoryChange(G), 0));
  }
  redo() {
    return !(!this.canRedo() || !this.redoMode || (this.redoMode(), this.emitHistoryChange(K), 0));
  }
  clearHistory() {
    this.clearModeHistory && this.clearModeHistory(), this.lastHistorySizes = {
      undoSize: 0,
      redoSize: 0
    };
  }
  getHistorySizes() {
    return this.getModeHistorySizes ? this.getModeHistorySizes() : {
      undoSize: 0,
      redoSize: 0
    };
  }
  undoSize() {
    return this.getHistorySizes().undoSize;
  }
  redoSize() {
    return this.getHistorySizes().redoSize;
  }
  emitPushIfHistoryChangedFromLastSnapshot() {
    if (!this.inDrawingState()) return;
    let e = this.getHistorySizes();
    e.undoSize === this.lastHistorySizes.undoSize && e.redoSize === this.lastHistorySizes.redoSize || this.emitHistoryChange(q);
  }
  emitPushIfHistoryChanged(e) {
    if (!this.inDrawingState()) return;
    let t2 = this.getHistorySizes();
    t2.undoSize === e.undoSize && t2.redoSize === e.redoSize || this.emitHistoryChange(q);
  }
  emitHistoryChange(e) {
    if (!this.onHistoryChange) return;
    let { undoSize: t2, redoSize: n2 } = this.getHistorySizes();
    this.lastHistorySizes = {
      undoSize: t2,
      redoSize: n2
    }, this.onHistoryChange({
      cause: e,
      stack: J,
      undoStackSize: t2,
      redoStackSize: n2
    });
  }
};
var Dn = class {
  constructor(e) {
    this.draw = void 0, this.onHistoryChange = void 0, this.maxStackSize = void 0, this.historyById = {}, this.undoStack = [], this.ignoreProgrammaticCreate = {}, this.ignoreProgrammaticDelete = {}, this.deletedFeatureIds = {}, this.redoStack = [], this.isReplayingHistory = false, this.emitStackChange = (e2) => {
      this.onHistoryChange && this.onHistoryChange({
        cause: e2,
        stack: Tn,
        undoStackSize: this.undoStack.length,
        redoStackSize: this.redoStack.length
      });
    }, this.handleChange = (e2, t2, n2) => {
      if (!this.draw || this.isDrawing() || this.maxStackSize === 0) return;
      if (t2 === "update") {
        if (n2 === void 0 || !("origin" in n2) || n2.origin !== "api" || this.isReplayingHistory) return;
        let t3 = Array.isArray(e2) ? e2 : [e2], r3 = false;
        for (let e3 of t3) {
          if (e3 == null) continue;
          let t4 = String(e3), n3 = this.draw.getSnapshotFeature(e3);
          n3 && (this.historyById[t4] || (this.historyById[t4] = []), this.historyById[t4].push(n3), this.pushUndoStackEntry({
            id: e3,
            toIndex: this.historyById[t4].length - 1,
            action: "single"
          }), r3 = true);
        }
        r3 && (this.redoStack.length = 0, this.emitStackChange(q));
        return;
      }
      if (t2 !== "delete" && t2 !== "create") return;
      if (t2 === "create") {
        if (n2 === void 0 || !("origin" in n2) || n2.origin !== "api") return;
        let t3 = false, r3 = Array.isArray(e2) ? e2 : [e2], i3 = [];
        for (let e3 of r3) {
          if (this.ignoreProgrammaticCreate[e3]) {
            delete this.ignoreProgrammaticCreate[e3], delete this.deletedFeatureIds[e3];
            continue;
          }
          let n3 = String(e3), r4 = this.draw.getSnapshotFeature(e3);
          r4 && (this.deletedFeatureIds[e3] && (this.historyById[n3] = [], delete this.deletedFeatureIds[e3]), this.historyById[n3] || (this.historyById[n3] = []), this.historyById[n3].push(r4), i3.push({
            id: e3,
            toIndex: this.historyById[n3].length - 1,
            snapshot: r4
          }), t3 = true);
        }
        if (i3.length > 1) this.pushUndoStackEntry({
          id: i3[0].id,
          toIndex: i3[0].toIndex,
          action: "batch-create",
          metadata: { entries: i3 }
        });
        else if (i3.length === 1) {
          let e3 = i3[0];
          this.pushUndoStackEntry({
            id: e3.id,
            toIndex: e3.toIndex,
            action: "single"
          });
        }
        t3 && (this.redoStack.length = 0, this.emitStackChange(q));
        return;
      }
      let r2 = false, i2 = Array.isArray(e2) ? e2 : [e2], a2 = [];
      for (let e3 of i2) {
        let t3 = String(e3);
        if (this.ignoreProgrammaticDelete[e3]) {
          delete this.ignoreProgrammaticDelete[e3];
          continue;
        }
        if (!this.historyById[t3]) continue;
        let n3 = this.historyById[t3].length - 1;
        if (n3 >= 0) {
          let i3 = this.historyById[t3][n3];
          if (!i3) continue;
          a2.push({
            id: e3,
            toIndex: n3,
            snapshot: i3
          }), this.deletedFeatureIds[e3] = true, r2 = true;
        }
      }
      if (a2.length > 1) this.pushUndoStackEntry({
        id: a2[0].id,
        toIndex: a2[0].toIndex,
        action: "batch-delete",
        metadata: { entries: a2 }
      });
      else if (a2.length === 1) {
        let e3 = a2[0];
        this.pushUndoStackEntry({
          id: e3.id,
          toIndex: e3.toIndex,
          action: "single"
        });
      }
      r2 && (this.redoStack.length = 0, this.emitStackChange(q));
    }, this.handleFinish = (e2) => {
      if (!this.draw || this.maxStackSize === 0 || this.isReplayingHistory) return;
      let t2 = Array.isArray(e2) ? e2 : [e2], n2 = false;
      for (let e3 of t2) {
        if (e3 == null) continue;
        let t3 = String(e3), r2 = this.draw.getSnapshotFeature(e3);
        r2 && (this.historyById[t3] || (this.historyById[t3] = []), this.historyById[t3].push(r2), n2 || (n2 = (this.redoStack.length = 0, true)), this.pushUndoStackEntry({
          id: e3,
          toIndex: this.historyById[t3].length - 1,
          action: "single"
        }), this.emitStackChange(q));
      }
    }, this.maxStackSize = wn(e?.maxStackSize);
  }
  register(e) {
    this.draw === e.draw ? this.onHistoryChange = e.onHistoryChange : (this.draw && (this.draw.off("change", this.handleChange), this.draw.off("finish", this.handleFinish)), this.draw = e.draw, this.draw.on("change", this.handleChange), this.draw.on("finish", this.handleFinish), this.onHistoryChange = e.onHistoryChange);
  }
  pushUndoStackEntry(e) {
    this.maxStackSize !== 0 && (this.undoStack.push(e), this.undoStack.length > this.maxStackSize && this.undoStack.shift());
  }
  pushRedoStackEntry(e) {
    this.maxStackSize !== 0 && (this.redoStack.push(e), this.redoStack.length > this.maxStackSize && this.redoStack.shift());
  }
  isDrawing() {
    return !!this.draw && this.draw.getModeState() === "drawing";
  }
  applySnapshotDuringReplay(e, t2) {
    if (this.draw) {
      this.isReplayingHistory = true;
      try {
        this.draw.hasFeature(e) && (this.ignoreProgrammaticDelete[e] = true, this.draw.removeFeatures([e])), this.ignoreProgrammaticCreate[e] = true, delete this.deletedFeatureIds[e], this.draw.addFeatures([t2]);
      } finally {
        this.isReplayingHistory = false;
      }
    }
  }
  canUndo() {
    return !(!this.draw || this.isDrawing()) && this.undoStack.length > 0;
  }
  canRedo() {
    return !(!this.draw || this.isDrawing()) && this.redoStack.length > 0;
  }
  undo() {
    if (!this.canUndo() || !this.draw) return false;
    let e = this.undoStack.pop();
    if (!e) return this.emitStackChange(G), false;
    if (e.action === "batch-create") {
      let t3 = e.metadata?.entries || [];
      if (t3.length === 0) return this.emitStackChange(G), false;
      let n3 = t3.map((e2) => e2.id);
      return n3.forEach((e2) => {
        this.ignoreProgrammaticDelete[e2] = true, this.deletedFeatureIds[e2] = true;
      }), this.draw.removeFeatures(n3), this.pushRedoStackEntry({
        id: t3[0].id,
        toIndex: t3[0].toIndex,
        action: "batch-create",
        metadata: { entries: t3 }
      }), this.emitStackChange(G), true;
    }
    if (e.action === "batch-delete") {
      let t3 = e.metadata?.entries || [];
      if (t3.length === 0) return this.emitStackChange(G), false;
      let n3 = t3.map((e2) => e2.snapshot).filter((e2) => e2 !== void 0);
      return n3.length > 0 && (t3.forEach((e2) => {
        this.ignoreProgrammaticCreate[e2.id] = true, delete this.deletedFeatureIds[e2.id];
      }), this.draw.addFeatures(n3)), this.pushRedoStackEntry({
        id: t3[0].id,
        toIndex: t3[0].toIndex,
        action: "batch-delete",
        metadata: { entries: t3 }
      }), this.emitStackChange(G), true;
    }
    let t2 = e.id, n2 = e.toIndex, r2 = String(t2), i2 = this.historyById[r2];
    if (!i2 || i2.length === 0) return this.emitStackChange(G), false;
    let a2 = Math.min(n2, i2.length - 1);
    if (!this.draw.hasFeature(t2)) {
      let e2 = i2[a2];
      return e2 ? (this.ignoreProgrammaticCreate[t2] = true, delete this.deletedFeatureIds[t2], this.draw.addFeatures([e2]), this.pushRedoStackEntry({
        id: t2,
        toIndex: a2,
        action: "delete",
        snapshot: e2
      }), this.emitStackChange(G), true) : (this.emitStackChange(G), false);
    }
    if (a2 <= 0) return this.pushRedoStackEntry({
      id: t2,
      toIndex: 0,
      action: "create"
    }), this.ignoreProgrammaticDelete[t2] = true, this.deletedFeatureIds[t2] = true, this.draw.removeFeatures([t2]), this.undoStack = this.undoStack.filter((e2) => e2.id !== t2), this.emitStackChange(G), true;
    let o2 = i2[a2], s2 = i2[a2 - 1];
    return o2 && this.pushRedoStackEntry({
      id: t2,
      toIndex: a2,
      snapshot: o2,
      action: "update"
    }), this.applySnapshotDuringReplay(t2, s2), i2.length = a2, this.emitStackChange(G), true;
  }
  redo() {
    if (!this.canRedo() || !this.draw) return false;
    let { id: e, toIndex: t2, snapshot: n2, action: r2, metadata: i2 } = this.redoStack.pop();
    if (r2 === "batch-create") {
      let e2 = i2?.entries || [];
      if (e2.length === 0) return this.emitStackChange(K), false;
      let t3 = e2.map((e3) => e3.snapshot).filter((e3) => e3 !== void 0);
      return t3.length > 0 && (e2.forEach((e3) => {
        this.ignoreProgrammaticCreate[e3.id] = true;
      }), this.draw.addFeatures(t3)), this.pushUndoStackEntry({
        id: e2[0].id,
        toIndex: e2[0].toIndex,
        action: "batch-create",
        metadata: { entries: e2 }
      }), this.emitStackChange(K), true;
    }
    if (r2 === "batch-delete") {
      let e2 = i2?.entries || [];
      if (e2.length === 0) return this.emitStackChange(K), false;
      let t3 = e2.map((e3) => e3.id);
      return t3.forEach((e3) => {
        this.ignoreProgrammaticDelete[e3] = true, this.deletedFeatureIds[e3] = true;
      }), this.draw.removeFeatures(t3), this.pushUndoStackEntry({
        id: e2[0].id,
        toIndex: e2[0].toIndex,
        action: "batch-delete",
        metadata: { entries: e2 }
      }), this.emitStackChange(K), true;
    }
    let a2 = String(e), o2 = this.historyById[a2] || (this.historyById[a2] = []);
    if (r2 === "delete") return this.ignoreProgrammaticDelete[e] = true, this.deletedFeatureIds[e] = true, this.draw.removeFeatures([e]), this.pushUndoStackEntry({
      id: e,
      toIndex: t2,
      action: "single"
    }), this.emitStackChange(K), true;
    if (t2 <= 0) {
      let t3 = o2[0];
      return !!t3 && (this.ignoreProgrammaticCreate[e] = true, this.draw.addFeatures([t3]), this.pushUndoStackEntry({
        id: e,
        toIndex: 0,
        action: "single"
      }), this.emitStackChange(K), true);
    }
    let s2 = n2 || o2[t2];
    return !!s2 && (o2.length === t2 ? o2.push(s2) : (o2[t2] = s2, o2.length = t2 + 1), this.applySnapshotDuringReplay(e, s2), this.pushUndoStackEntry({
      id: e,
      toIndex: t2,
      action: "single"
    }), this.emitStackChange(K), true);
  }
  clearHistory() {
    let e = {};
    if (this.draw && !this.isDrawing()) {
      let t2 = this.draw.getSnapshot();
      for (let n2 of t2) e[String(n2.id)] = [n2];
    }
    this.historyById = e, this.undoStack = [], this.ignoreProgrammaticCreate = {}, this.ignoreProgrammaticDelete = {}, this.deletedFeatureIds = {}, this.redoStack = [];
  }
  undoSize() {
    return this.undoStack.length;
  }
  redoSize() {
    return this.redoStack.length;
  }
};
var On = class {
  constructor(e) {
    this.modeLevel = void 0, this.sessionLevel = void 0, this.shouldPreferMode = void 0, this.onHistoryChange = void 0, this.shouldEmitHistoryChange = void 0, this.modeLevel = e.modeLevel, this.sessionLevel = e.sessionLevel, this.shouldPreferMode = e.shouldPreferMode, this.onHistoryChange = e.onHistoryChange, this.shouldEmitHistoryChange = e.shouldEmitHistoryChange ?? (() => true);
  }
  emitStackHistoryChange(e) {
    this.shouldEmitHistoryChange() && this.onHistoryChange && this.onHistoryChange({
      cause: e.cause,
      stack: e.stack,
      undoSize: e.undoStackSize,
      redoSize: e.redoStackSize
    });
  }
  hasSessionUndo() {
    return !!(this.sessionLevel && this.sessionLevel.canUndo());
  }
  hasSessionRedo() {
    return !!(this.sessionLevel && this.sessionLevel.canRedo());
  }
  activeStackForUndo() {
    var e, t2;
    return this.shouldPreferMode() && (e = this.modeLevel) != null && e.canUndo() ? J : this.hasSessionUndo() ? Tn : (t2 = this.modeLevel) != null && t2.canUndo() ? J : void 0;
  }
  activeStackForRedo() {
    var e, t2;
    return this.shouldPreferMode() && (e = this.modeLevel) != null && e.canRedo() ? J : this.hasSessionRedo() ? Tn : (t2 = this.modeLevel) != null && t2.canRedo() ? J : void 0;
  }
  canUndo() {
    return this.activeStackForUndo() !== void 0;
  }
  canRedo() {
    return this.activeStackForRedo() !== void 0;
  }
  undo() {
    let e = this.activeStackForUndo();
    return !!e && (e === J ? !!this.modeLevel && this.modeLevel.undo() : !(!this.sessionLevel || !this.sessionLevel.canUndo()) && this.sessionLevel.undo());
  }
  redo() {
    let e = this.activeStackForRedo();
    return !!e && (e === J ? !!this.modeLevel && this.modeLevel.redo() : !(!this.sessionLevel || !this.sessionLevel.canRedo()) && this.sessionLevel.redo());
  }
  clearHistory() {
    this.modeLevel && this.modeLevel.clearHistory(), this.sessionLevel && this.sessionLevel.clearHistory();
  }
  emitHistoryPushForCompletedAction() {
    this.sessionLevel ? this.emitStackHistoryChange({
      cause: q,
      undoStackSize: this.sessionLevel.undoSize(),
      redoStackSize: this.sessionLevel.redoSize(),
      stack: Tn
    }) : this.modeLevel && this.emitStackHistoryChange({
      cause: q,
      undoStackSize: this.modeLevel.undoSize(),
      redoStackSize: this.modeLevel.redoSize(),
      stack: J
    });
  }
};
var kn = class {
  constructor(e) {
    var n2, r2, i2, a2;
    this._modes = void 0, this._mode = void 0, this._adapter = void 0, this._enabled = false, this._store = void 0, this._eventListeners = void 0, this._instanceSelectModes = void 0, this.sessionUndoRedoEnabled = false, this.keyboardShortcutsMatcher = void 0, this.drawingUndoRedo = void 0, this.sessionUndoRedo = void 0, this.undoRedoCoordinator = void 0, this._adapter = e.adapter, this._instanceSelectModes = [];
    let o2 = e == null || (n2 = e.undoRedo) == null ? void 0 : n2.modeLevel;
    o2 && (this.drawingUndoRedo = o2);
    let s2 = e == null || (r2 = e.undoRedo) == null ? void 0 : r2.keyboardShortcuts;
    s2 && (this.keyboardShortcutsMatcher = s2), this.sessionUndoRedoEnabled = !!(!(e == null || (i2 = e.undoRedo) == null) && i2.sessionLevel);
    let c2 = e == null || (a2 = e.undoRedo) == null ? void 0 : a2.sessionLevel;
    this._mode = new Nt();
    let l2 = /* @__PURE__ */ new Set(), u2 = e.modes.reduce((e2, t2) => {
      if (l2.has(t2.mode)) throw Error(`There is already a ${t2.mode} mode provided`);
      return l2.add(t2.mode), e2[t2.mode] = t2, e2;
    }, {}), d2 = Object.keys(u2);
    if (d2.length === 0) throw Error("No modes provided");
    d2.forEach((e2) => {
      u2[e2].type === h.Select && this._instanceSelectModes.push(e2);
    }), this._modes = t({}, u2, { static: this._mode }), this._eventListeners = {
      change: [],
      select: [],
      deselect: [],
      finish: [],
      ready: [],
      history: []
    }, this._store = new Zt({
      tracked: !!e.tracked,
      idStrategy: e.idStrategy ? e.idStrategy : void 0
    });
    let f2 = (e2) => {
      let t2 = [];
      return {
        changed: t2,
        unchanged: this._store.copyAll().filter((n3) => !e2.includes(n3.id) || (t2.push(n3), false))
      };
    }, p2 = (e2, t2) => {
      var n3;
      this._enabled && (this._eventListeners.finish.forEach((n4) => {
        n4(e2, t2);
      }), (n3 = this.undoRedoCoordinator) == null || n3.emitHistoryPushForCompletedAction());
    }, m3 = (e2, t2, n3) => {
      if (!this._enabled) return;
      this._eventListeners.change.forEach((r4) => {
        r4(e2, t2, n3);
      }), this.emitDrawingPushIfHistoryChangedFromLastSnapshot();
      let { changed: r3, unchanged: i3 } = f2(e2);
      t2 === "create" ? this._adapter.render({
        created: r3,
        deletedIds: [],
        unchanged: i3,
        updated: []
      }, this.getModeStyles()) : t2 === "update" ? this._adapter.render({
        created: [],
        deletedIds: [],
        unchanged: i3,
        updated: r3
      }, this.getModeStyles()) : t2 === "delete" ? this._adapter.render({
        created: [],
        deletedIds: e2,
        unchanged: i3,
        updated: []
      }, this.getModeStyles()) : t2 === "styling" && this._adapter.render({
        created: [],
        deletedIds: [],
        unchanged: i3,
        updated: []
      }, this.getModeStyles());
    }, g2 = (e2) => {
      if (!this._enabled) return;
      this._eventListeners.select.forEach((t3) => {
        t3(e2);
      });
      let { changed: t2, unchanged: n3 } = f2([e2]);
      this._adapter.render({
        created: [],
        deletedIds: [],
        unchanged: n3,
        updated: t2
      }, this.getModeStyles());
    }, _2 = (e2) => {
      if (!this._enabled) return;
      this._eventListeners.deselect.forEach((t3) => {
        t3(e2);
      });
      let { changed: t2, unchanged: n3 } = f2([e2]);
      t2 && this._adapter.render({
        created: [],
        deletedIds: [],
        unchanged: n3,
        updated: t2
      }, this.getModeStyles());
    };
    Object.keys(this._modes).forEach((e2) => {
      var t2;
      this._modes[e2].register({
        mode: e2,
        store: this._store,
        setCursor: this._adapter.setCursor.bind(this._adapter),
        project: this._adapter.project.bind(this._adapter),
        unproject: this._adapter.unproject.bind(this._adapter),
        setDoubleClickToZoom: this._adapter.setDoubleClickToZoom.bind(this._adapter),
        onChange: m3,
        onSelect: g2,
        onDeselect: _2,
        onFinish: p2,
        coordinatePrecision: this._adapter.getCoordinatePrecision(),
        undoRedoMaxStackSize: (t2 = this.drawingUndoRedo) == null || t2.getMaxStackSize == null ? void 0 : t2.getMaxStackSize()
      });
    }), this.sessionUndoRedoEnabled && c2 && (this.sessionUndoRedo = c2, c2.register({
      draw: this,
      onHistoryChange: (e2) => {
        var t2;
        (t2 = this.undoRedoCoordinator) == null || t2.emitStackHistoryChange(e2);
      }
    })), this.drawingUndoRedo && this.drawingUndoRedo.register({
      getModeState: () => this.getModeState(),
      getModeHistorySizes: () => this.getDrawingHistorySizes(),
      undoMode: () => {
        this._mode.undo && this._mode.undo();
      },
      redoMode: () => {
        this._mode.redo && this._mode.redo();
      },
      clearModeHistory: () => {
        let e2 = this._mode;
        e2.clearHistory && e2.clearHistory();
      },
      onHistoryChange: (e2) => {
        var t2;
        (t2 = this.undoRedoCoordinator) == null || t2.emitStackHistoryChange(e2);
      }
    }), this.undoRedoCoordinator = new On({
      modeLevel: this.drawingUndoRedo,
      sessionLevel: this.sessionUndoRedo,
      shouldPreferMode: () => this.getModeState() === "drawing",
      onHistoryChange: (e2) => {
        this._eventListeners.history.forEach((t2) => {
          t2(e2);
        });
      },
      shouldEmitHistoryChange: () => this._enabled
    });
  }
  checkEnabled() {
    if (!this._enabled) throw Error("Terra Draw is not enabled");
  }
  handleUndoRedoKeyboardShortcut(e) {
    if (!this.drawingUndoRedo && !this.sessionUndoRedoEnabled || !this.keyboardShortcutsMatcher) return false;
    let t2 = this.keyboardShortcutsMatcher.isUndoKeyboardShortcut(e), n2 = this.keyboardShortcutsMatcher.isRedoKeyboardShortcut(e);
    if (t2) {
      if (!this.canUndo()) return false;
      let t3 = this.undo();
      return t3 && e.preventDefault(), t3;
    }
    if (n2) {
      if (!this.canRedo()) return false;
      let t3 = this.redo();
      return t3 && e.preventDefault(), t3;
    }
    return false;
  }
  getDrawingHistorySizes() {
    return {
      undoSize: this._mode.undoSize && typeof this._mode.undoSize == "function" ? this._mode.undoSize() : 0,
      redoSize: this._mode.redoSize && typeof this._mode.redoSize == "function" ? this._mode.redoSize() : 0
    };
  }
  emitDrawingPushIfHistoryChangedFromLastSnapshot() {
    this.drawingUndoRedo && this.drawingUndoRedo.emitPushIfHistoryChangedFromLastSnapshot();
  }
  emitDrawingPushIfHistoryChanged(e) {
    this.drawingUndoRedo && this.drawingUndoRedo.emitPushIfHistoryChanged(e);
  }
  getModeStyles() {
    let e = {}, t2 = this._instanceSelectModes.includes(this._mode.mode) ? this._mode.mode : void 0;
    return Object.keys(this._modes).forEach((n2) => {
      e[n2] = (e2) => t2 && e2.properties[c.SELECTED] ? this._modes[t2].styleFeature.bind(this._modes[t2])(e2) : this._modes[n2].styleFeature.bind(this._modes[n2])(e2);
    }), e;
  }
  featuresAtLocation({ lng: e, lat: t2 }, n2) {
    let r2 = n2 && n2.pointerDistance !== void 0 ? n2.pointerDistance : 30, i2 = !n2 || n2.ignoreSelectFeatures === void 0 || n2.ignoreSelectFeatures, a2 = !(!n2 || n2.ignoreCoordinatePoints === void 0) && n2.ignoreCoordinatePoints, o2 = !(!n2 || n2.ignoreCurrentlyDrawing === void 0) && n2.ignoreCurrentlyDrawing, s2 = !(!n2 || n2.ignoreClosingPoints === void 0) && n2.ignoreClosingPoints, u2 = !(!n2 || n2.ignoreSnappingPoints === void 0) && n2.ignoreSnappingPoints, d2 = this._adapter.unproject.bind(this._adapter), f2 = this._adapter.project.bind(this._adapter), p2 = f2(e, t2), m3 = Te({
      unproject: d2,
      point: p2,
      pointerDistance: r2
    });
    return this._store.search(m3).filter((d3) => {
      if (i2 && (d3.properties[c.MID_POINT] || d3.properties[c.SELECTION_POINT]) || a2 && d3.properties[l.COORDINATE_POINT] || s2 && d3.properties[l.CLOSING_POINT] || o2 && d3.properties[l.CURRENTLY_DRAWING] || u2 && d3.properties[l.SNAPPING_POINT]) return false;
      if (d3.geometry.type === "Point") {
        let e2 = d3.geometry.coordinates;
        return N(p2, f2(e2[0], e2[1])) < r2;
      }
      if (d3.geometry.type === "LineString") {
        let e2 = d3.geometry.coordinates;
        for (let t3 = 0; t3 < e2.length - 1; t3++) {
          let n3 = e2[t3], i3 = e2[t3 + 1];
          if (yt(p2, f2(n3[0], n3[1]), f2(i3[0], i3[1])) < r2) return true;
        }
        return false;
      }
      if (vt([e, t2], d3.geometry.coordinates)) return true;
      if (n2 != null && n2.includePolygonsWithinPointerDistance) {
        let e2 = d3.geometry.coordinates;
        for (let t3 of e2) for (let e3 = 0; e3 < t3.length - 1; e3++) {
          let n3 = t3[e3], i3 = t3[e3 + 1];
          if (yt(p2, f2(n3[0], n3[1]), f2(i3[0], i3[1])) < r2) return true;
        }
      }
      return false;
    }).map((r3) => {
      if (n2 == null || !n2.addClosestCoordinateInfoToProperties) return r3;
      let i3;
      if (r3.geometry.type === "Polygon") i3 = r3.geometry.coordinates[0].slice(0, -1);
      else {
        if (r3.geometry.type !== "LineString") return r3;
        i3 = r3.geometry.coordinates;
      }
      let a3, o3 = -1, s3 = Infinity;
      for (let e2 = 0; e2 < i3.length; e2++) {
        let t3 = i3[e2], n3 = N(f2(t3[0], t3[1]), p2);
        n3 < s3 && (o3 = e2, s3 = n3, a3 = t3);
      }
      return r3.properties.closestCoordinateIndexToEvent = o3, r3.properties.closestCoordinatePixelDistanceToEvent = s3, r3.properties.closestCoordinateDistanceKmToEvent = y(a3, [e, t2]), r3;
    });
  }
  getSelectModeOrThrow(e = void 0) {
    let t2 = this.getSelectMode({
      switchToSelectMode: true,
      selectMode: e
    });
    if (!t2) throw Error("No select mode defined in instance");
    return t2;
  }
  getSelectMode({ switchToSelectMode: e, selectMode: t2 }) {
    this.checkEnabled();
    let n2 = this.getMode();
    if (this._instanceSelectModes.length === 0) return null;
    if (t2 !== void 0 && !this._instanceSelectModes.includes(t2)) throw Error(`No select mode with this name present: ${t2}`);
    let r2;
    return r2 = t2 === void 0 ? this._instanceSelectModes.includes(n2) ? n2 : this._instanceSelectModes[0] : t2, e && n2 !== r2 && this.setMode(r2), this._modes[r2];
  }
  isGuidanceFeature(e) {
    return !!(e.properties[c.MID_POINT] || e.properties[c.SELECTION_POINT] || e.properties[l.COORDINATE_POINT] || e.properties[l.SNAPPING_POINT]);
  }
  setModeStyles(e, t2) {
    if (this.checkEnabled(), !this._modes[e]) throw Error("No mode with this name present");
    this._modes[e].styles = t2;
  }
  updateModeOptions(e, t2) {
    if (this.checkEnabled(), !this._modes[e]) throw Error("No mode with this name present");
    this._modes[e].updateOptions(t2);
  }
  getSnapshot() {
    return this._store.copyAll();
  }
  getSnapshotFeature(e) {
    if (this._store.has(e)) return this._store.copy(e);
  }
  clear() {
    this.checkEnabled(), this._adapter.clear();
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(e) {
    throw Error("Enabled is read only");
  }
  getMode() {
    return this._mode.mode;
  }
  getModeState() {
    return this._mode.state;
  }
  setMode(e) {
    if (this.checkEnabled(), !this._modes[e]) throw Error("No mode with this name present");
    this._mode.stop(), this._mode = this._modes[e], this._mode.start();
  }
  removeFeatures(e) {
    this.checkEnabled();
    let t2 = [], n2 = [], r2;
    e.forEach((e2) => {
      if (!this._store.has(e2)) throw Error(`No feature with id ${e2}, can not delete`);
      let i2 = this._store.getPropertiesCopy(e2);
      i2[c.SELECTED] && this.deselectFeature(e2), i2[l.CURRENTLY_DRAWING] && this._modes[i2.mode] ? r2 = i2.mode : (i2[l.COORDINATE_POINT_IDS] && t2.push(...i2[l.COORDINATE_POINT_IDS]), n2.push(e2));
    }), this._store.delete([...n2, ...t2], { origin: "api" }), r2 && this._modes[r2] && this._modes[r2].cleanUp() && this._modes[r2].cleanUp();
  }
  selectFeature(e, t2) {
    this.getSelectModeOrThrow(t2).selectFeature(e);
  }
  deselectFeature(e) {
    this.getSelectModeOrThrow().deselectFeature(e);
  }
  getFeatureId() {
    return this._store.getId();
  }
  hasFeature(e) {
    return this._store.has(e);
  }
  checkIsReservedProperty(e) {
    return ![...Object.values(c), ...Object.values(l)].includes(e);
  }
  updateFeatureProperties(e, t2) {
    var n2;
    if (!this._store.has(e)) throw Error(`No feature with id ${e} present in store`);
    let r2 = this._store.copy(e);
    if (this.isGuidanceFeature(r2)) throw Error("Guidance features are not allowed to be updated directly.");
    let i2 = r2.properties.mode;
    if (!this._modes[i2]) throw Error(`No mode with name ${i2} present in instance`);
    let a2 = Object.entries(t2);
    a2.forEach(([e2, t3]) => {
      if (!this.checkIsReservedProperty(e2)) throw Error(`You are trying to update a reserved property name: ${e2}. Please choose another name.`);
      if (t3 !== void 0 && !_n(t3)) throw Error(`Invalid JSON value provided for property ${e2}`);
    }), this._store.updateProperty(a2.map(([e2, t3]) => ({
      id: r2.id,
      property: e2,
      value: t3
    })), { origin: "api" }), (n2 = this.undoRedoCoordinator) == null || n2.emitHistoryPushForCompletedAction();
  }
  updateFeatureGeometry(e, n2) {
    var r2;
    if (!this._store.has(e)) throw Error(`No feature with id ${e} present in store`);
    let i2 = this._store.copy(e);
    if (this.isGuidanceFeature(i2)) throw Error("Guidance features are not allowed to be updated directly.");
    if (!(i2 && n2 && n2.type && n2.coordinates)) throw Error("Invalid geometry provided");
    if (n2.type !== i2.geometry.type) throw Error(`Geometry type mismatch: expected ${i2.geometry.type}, got ${n2.type}`);
    let a2 = i2.properties.mode, o2 = this._modes[a2];
    if (!o2) throw Error(`No mode with name ${a2} present in instance`);
    let s2 = t({}, i2, { geometry: n2 }), l2 = o2.validateFeature(s2);
    if (!l2.valid) throw Error(`Feature validation failed: ${l2.reason || "Unknown reason"}`);
    if (this._store.updateGeometry([{
      id: i2.id,
      geometry: n2
    }], { origin: "api" }), o2.afterFeatureUpdated) {
      o2.afterFeatureUpdated(s2);
      let e2 = s2.properties[c.SELECTED], t2 = this.getSelectMode({ switchToSelectMode: false });
      t2 && e2 && t2.afterFeatureUpdated(s2);
    }
    (r2 = this.undoRedoCoordinator) == null || r2.emitHistoryPushForCompletedAction();
  }
  transformFeatureGeometry(e, t2) {
    var n2;
    if (!this._store.has(e)) throw Error(`No feature with id ${e} present in store`);
    let r2 = this._store.copy(e);
    if (this.isGuidanceFeature(r2)) throw Error("Guidance features are not allowed to be updated directly.");
    let i2 = r2.properties.mode, a2 = this._modes[i2];
    if (!a2) throw Error(`No mode with name ${i2} present in instance`);
    let o2;
    if (r2.geometry.type === "Polygon") o2 = r2.geometry.coordinates[0];
    else {
      if (r2.geometry.type !== "LineString") throw Error(`Feature geometry type ${r2.geometry.type} is not supported for transformation`);
      o2 = r2.geometry.coordinates;
    }
    if (t2.projection != "web-mercator") throw Error(`Projection ${t2.projection} is not currently supported for transformation`);
    if (t2.type === "scale") {
      let { x: e2, y: n3 } = T(t2.origin[0], t2.origin[1]);
      Ot({
        coordinates: o2,
        originX: e2,
        originY: n3,
        xScale: t2.options.xScale || 1,
        yScale: t2.options.yScale || 1
      });
    } else t2.type === "rotate" && (r2 = wt(r2, t2.options.angle || 0), o2 = r2.geometry.type === "Polygon" ? r2.geometry.coordinates[0] : r2.geometry.coordinates);
    if (o2 = o2.map((e2) => [C(e2[0], this._adapter.getCoordinatePrecision()), C(e2[1], this._adapter.getCoordinatePrecision())]), r2.geometry.coordinates = r2.geometry.type === "Polygon" ? [o2] : o2, this._store.updateGeometry([{
      id: r2.id,
      geometry: r2.geometry
    }], { origin: "api" }), a2.afterFeatureUpdated) {
      a2.afterFeatureUpdated(r2);
      let e2 = r2.properties[c.SELECTED], t3 = this.getSelectMode({ switchToSelectMode: false });
      t3 && e2 && t3.afterFeatureUpdated(r2);
    }
    (n2 = this.undoRedoCoordinator) == null || n2.emitHistoryPushForCompletedAction();
  }
  undo() {
    return this.checkEnabled(), !!this.undoRedoCoordinator && this.undoRedoCoordinator.undo();
  }
  canUndo() {
    return this.checkEnabled(), !!this.undoRedoCoordinator && this.undoRedoCoordinator.canUndo();
  }
  canRedo() {
    return this.checkEnabled(), !!this.undoRedoCoordinator && this.undoRedoCoordinator.canRedo();
  }
  redo() {
    return this.checkEnabled(), !!this.undoRedoCoordinator && this.undoRedoCoordinator.redo();
  }
  clearUndoRedoHistory() {
    this.checkEnabled(), this.undoRedoCoordinator && this.undoRedoCoordinator.clearHistory();
  }
  addFeatures(e) {
    return this.checkEnabled(), e.length === 0 ? [] : this._store.load(e, (e2) => {
      if (f(e2)) {
        let t2 = e2.properties.mode, n2 = this._modes[t2];
        if (!n2) return {
          id: e2.id,
          valid: false,
          reason: `${t2} mode is not in the list of instantiated modes`
        };
        let r2 = n2.validateFeature.bind(n2)(e2);
        return {
          id: e2.id,
          valid: r2.valid,
          reason: r2.reason ? r2.reason : r2.valid ? void 0 : "Feature is invalid"
        };
      }
      return {
        id: e2.id,
        valid: false,
        reason: "Mode property does not exist"
      };
    }, (e2) => {
      if (f(e2)) {
        let t2 = this._modes[e2.properties.mode];
        t2 && t2.afterFeatureAdded && t2.afterFeatureAdded(e2);
      }
    }, { origin: "api" });
  }
  start() {
    this._enabled || (this._enabled = true, this._adapter.register({
      onReady: () => {
        this._eventListeners.ready.forEach((e) => {
          e();
        });
      },
      getState: () => this._mode.state,
      onClick: (e) => {
        let t2 = this.drawingUndoRedo ? this.drawingUndoRedo.getHistorySizes() : {
          undoSize: 0,
          redoSize: 0
        };
        this._mode.onClick(e), this.emitDrawingPushIfHistoryChanged(t2);
      },
      onMouseMove: (e) => {
        this._mode.onMouseMove(e);
      },
      onKeyDown: (e) => {
        this.handleUndoRedoKeyboardShortcut(e) || this._mode.onKeyDown(e);
      },
      onKeyUp: (e) => {
        let t2 = this.drawingUndoRedo ? this.drawingUndoRedo.getHistorySizes() : {
          undoSize: 0,
          redoSize: 0
        };
        this._mode.onKeyUp(e), this.emitDrawingPushIfHistoryChanged(t2);
      },
      onDragStart: (e, t2) => {
        this._mode.onDragStart(e, t2);
      },
      onDrag: (e, t2) => {
        this._mode.onDrag(e, t2);
      },
      onDragEnd: (e, t2) => {
        this._mode.onDragEnd(e, t2);
      },
      onClear: () => {
        this._mode.cleanUp(), this._store.clear({ origin: "api" });
      }
    }));
  }
  getFeaturesAtLngLat(e, t2) {
    let { lng: n2, lat: r2 } = e;
    return this.featuresAtLocation({
      lng: n2,
      lat: r2
    }, t2);
  }
  getFeaturesAtPointerEvent(e, t2) {
    let n2 = this._adapter.getLngLatFromEvent.bind(this._adapter)(e);
    return n2 === null ? [] : this.featuresAtLocation(n2, t2);
  }
  stop() {
    this._enabled && (this._enabled = false, this._adapter.unregister());
  }
  on(e, t2) {
    let n2 = this._eventListeners[e];
    n2.includes(t2) || n2.push(t2);
  }
  off(e, t2) {
    let n2 = this._eventListeners[e];
    n2.includes(t2) && n2.splice(n2.indexOf(t2), 1);
  }
};
function An() {
  return An = Object.assign ? Object.assign.bind() : function(e) {
    for (var t2 = 1; t2 < arguments.length; t2++) {
      var n2 = arguments[t2];
      for (var r2 in n2) ({}).hasOwnProperty.call(n2, r2) && (e[r2] = n2[r2]);
    }
    return e;
  }, An.apply(null, arguments);
}
var jn = class extends pn.TerraDrawBaseAdapter {
  constructor(e) {
    super(e), this._renderBeforeLayerId = void 0, this._prefixId = void 0, this._initialDragPan = void 0, this._initialDragRotate = void 0, this._nextRender = void 0, this._map = void 0, this._container = void 0, this.changedIds = {
      deletion: false,
      points: false,
      linestrings: false,
      polygons: false,
      styling: false
    }, this._map = e.map, this._container = this._map.getContainer(), this._initialDragRotate = this._map.dragRotate.isEnabled(), this._initialDragPan = this._map.dragPan.isEnabled(), this._renderBeforeLayerId = e.renderBelowLayerId, this._prefixId = e.prefixId || "td";
  }
  hashCode(e) {
    let t2 = 0;
    for (let n2 = 0; n2 < e.length; n2++) t2 = (t2 << 5) - t2 + e.charCodeAt(n2), t2 |= 0;
    return Math.abs(t2);
  }
  resizeImage(e, t2, n2, r2) {
    let i2 = new Image();
    i2.crossOrigin = "anonymous", i2.onload = () => {
      let e2 = document.createElement("canvas");
      e2.width = t2, e2.height = n2;
      let a2 = e2.getContext("2d");
      if (!a2) throw Error("Could not get canvas context");
      a2.drawImage(i2, 0, 0, t2, n2), r2(e2.toDataURL());
    }, i2.src = e;
  }
  toGlDashArrayFromPixels(e, t2) {
    if (!e) return null;
    let [n2, r2] = e;
    if (!Number.isFinite(n2) || !Number.isFinite(r2) || n2 < 0 || r2 < 0) return null;
    let i2 = Math.max(1e-4, t2);
    return [n2 / i2, r2 / i2];
  }
  isMapLibreAtLeast(e) {
    let t2 = this._map.version;
    if (!t2) return false;
    let n2 = (e2) => {
      let t3 = e2.match(/(\d+)\.(\d+)\.(\d+)/);
      return t3 ? [
        parseInt(t3[1], 10),
        parseInt(t3[2], 10),
        parseInt(t3[3], 10)
      ] : null;
    }, r2 = n2(t2), i2 = n2(e);
    if (!r2 || !i2) return true;
    let [a2, o2, s2] = r2, [c2, l2, u2] = i2;
    return a2 === c2 ? o2 === l2 ? s2 >= u2 : o2 > l2 : a2 > c2;
  }
  _addGeoJSONSource(e, t2) {
    this._map.addSource(e, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: t2
      },
      tolerance: 0
    });
  }
  _addFillLayer(e) {
    return this._map.addLayer({
      id: e,
      source: e,
      type: "fill",
      layout: { "fill-sort-key": ["get", "zIndex"] },
      paint: {
        "fill-color": ["get", "polygonFillColor"],
        "fill-opacity": ["get", "polygonFillOpacity"]
      }
    });
  }
  _addFillOutlineLayer(e) {
    return this._map.addLayer({
      id: e + "-outline",
      source: e,
      type: "line",
      layout: { "line-sort-key": ["get", "zIndex"] },
      paint: {
        "line-width": ["get", "polygonOutlineWidth"],
        "line-color": ["get", "polygonOutlineColor"],
        "line-opacity": ["get", "polygonOutlineOpacity"]
      }
    });
  }
  _addLineLayer(e) {
    let t2 = {};
    return this.isMapLibreAtLeast("5.8.0") && (t2["line-dasharray"] = [
      "coalesce",
      ["get", "lineStringDash"],
      ["literal", [1, 0]]
    ]), this._map.addLayer({
      id: e,
      source: e,
      type: "line",
      layout: { "line-sort-key": ["get", "zIndex"] },
      paint: An({}, t2, {
        "line-width": ["get", "lineStringWidth"],
        "line-color": ["get", "lineStringColor"],
        "line-opacity": ["get", "lineStringOpacity"]
      })
    });
  }
  _addPointLayer(e) {
    return this._map.addLayer({
      id: e,
      source: e,
      type: "circle",
      layout: { "circle-sort-key": ["get", "zIndex"] },
      paint: {
        "circle-stroke-color": ["get", "pointOutlineColor"],
        "circle-stroke-width": ["get", "pointOutlineWidth"],
        "circle-stroke-opacity": ["get", "pointOutlineOpacity"],
        "circle-radius": ["get", "pointWidth"],
        "circle-color": ["get", "pointColor"],
        "circle-opacity": ["get", "pointOpacity"]
      }
    });
  }
  _addMarkerLayer(e) {
    return this._map.addLayer({
      id: e + "-marker",
      source: e,
      type: "symbol",
      filter: ["has", "markerId"],
      layout: {
        "icon-image": ["image", ["get", "markerId"]],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true
      }
    });
  }
  _addLayer(e, t2) {
    t2 === "Point" && (this._addPointLayer(e), this._addMarkerLayer(e)), t2 === "LineString" && this._addLineLayer(e), t2 === "Polygon" && (this._addFillLayer(e), this._addFillOutlineLayer(e));
  }
  _addGeoJSONLayer(e, t2) {
    let n2 = `${this._prefixId}-${e.toLowerCase()}`;
    return this._addGeoJSONSource(n2, t2), this._addLayer(n2, e), n2;
  }
  _setGeoJSONLayerData(e, t2) {
    let n2 = `${this._prefixId}-${e.toLowerCase()}`;
    return this._map.getSource(n2).setData({
      type: "FeatureCollection",
      features: t2
    }), n2;
  }
  updateChangedIds(e) {
    [...e.updated, ...e.created].forEach((e2) => {
      e2.geometry.type === "Point" ? this.changedIds.points = true : e2.geometry.type === "LineString" ? this.changedIds.linestrings = true : e2.geometry.type === "Polygon" && (this.changedIds.polygons = true);
    }), e.deletedIds.length > 0 && (this.changedIds.deletion = true), e.created.length === 0 && e.updated.length === 0 && e.deletedIds.length === 0 && (this.changedIds.styling = true);
  }
  getLngLatFromEvent(e) {
    let { left: t2, top: n2 } = this._container.getBoundingClientRect();
    return this.unproject(e.clientX - t2, e.clientY - n2);
  }
  getMapEventElement() {
    return this._map.getCanvas();
  }
  setDraggability(e) {
    e ? (this._initialDragRotate && this._map.dragRotate.enable(), this._initialDragPan && this._map.dragPan.enable()) : (this._initialDragRotate && this._map.dragRotate.disable(), this._initialDragPan && this._map.dragPan.disable());
  }
  project(e, t2) {
    let { x: n2, y: r2 } = this._map.project({
      lng: e,
      lat: t2
    });
    return {
      x: n2,
      y: r2
    };
  }
  unproject(e, t2) {
    let { lng: n2, lat: r2 } = this._map.unproject({
      x: e,
      y: t2
    });
    return {
      lng: n2,
      lat: r2
    };
  }
  setCursor(e) {
    let t2 = this._map.getCanvas();
    e === "unset" ? t2.style.removeProperty("cursor") : t2.style.cursor = e;
  }
  setDoubleClickToZoom(e) {
    e ? this._map.doubleClickZoom.enable() : this._map.doubleClickZoom.disable();
  }
  render(e, t2) {
    this.updateChangedIds(e), this._nextRender && cancelAnimationFrame(this._nextRender), this._nextRender = requestAnimationFrame(() => {
      if (!this._currentModeCallbacks) return;
      let n2 = [
        ...e.created,
        ...e.updated,
        ...e.unchanged
      ], r2 = [], i2 = [], a2 = [];
      for (let e2 = 0; e2 < n2.length; e2++) {
        let o3 = n2[e2], { properties: s3 } = o3, c3 = t2[s3.mode](o3);
        if (s3.zIndex = c3.zIndex, s3.zIndex = c3.zIndex, o3.geometry.type === "Point") {
          s3.pointColor = c3.pointColor, s3.pointOutlineColor = c3.pointOutlineColor, s3.pointOutlineWidth = c3.pointOutlineWidth;
          let e3 = c3.pointOutlineOpacity;
          s3.pointOutlineOpacity = e3 === void 0 ? 1 : e3, s3.pointWidth = c3.pointWidth;
          let t3 = c3.pointOpacity;
          if (s3.pointOpacity = t3 === void 0 ? 1 : t3, c3.markerUrl && c3.markerWidth && c3.markerHeight) {
            let e4 = `marker-${this.hashCode(c3.markerUrl)}`;
            this._map.hasImage(e4) || this.resizeImage(c3.markerUrl, c3.markerWidth, c3.markerHeight, (t4) => {
              this._map.loadImage(t4).then((t5) => {
                this._map.hasImage(e4) || this._map.addImage(e4, t5.data);
              });
            }), s3.markerId = e4, s3.pointWidth = 0;
          }
          r2.push(o3);
        } else if (o3.geometry.type === "LineString") {
          s3.lineStringDash = this.toGlDashArrayFromPixels(c3.lineStringDash, c3.lineStringWidth), s3.lineStringColor = c3.lineStringColor, s3.lineStringWidth = c3.lineStringWidth;
          let e3 = c3.lineStringOpacity;
          s3.lineStringOpacity = e3 === void 0 ? 1 : e3, i2.push(o3);
        } else if (o3.geometry.type === "Polygon") {
          let e3 = c3.polygonOutlineOpacity;
          s3.polygonFillColor = c3.polygonFillColor, s3.polygonFillOpacity = c3.polygonFillOpacity, s3.polygonOutlineOpacity = e3 === void 0 ? 1 : e3, s3.polygonOutlineColor = c3.polygonOutlineColor, s3.polygonOutlineWidth = c3.polygonOutlineWidth, a2.push(o3);
        }
      }
      let o2 = this.changedIds.deletion || this.changedIds.styling, s2 = o2 || this.changedIds.linestrings, c2 = o2 || this.changedIds.polygons;
      (o2 || this.changedIds.points) && this._setGeoJSONLayerData("Point", r2), s2 && this._setGeoJSONLayerData("LineString", i2), c2 && this._setGeoJSONLayerData("Polygon", a2), this.changedIds = {
        points: false,
        linestrings: false,
        polygons: false,
        deletion: false,
        styling: false
      };
    });
  }
  clear() {
    this._currentModeCallbacks && (this._currentModeCallbacks.onClear(), this._nextRender && (this._nextRender = (cancelAnimationFrame(this._nextRender), void 0)), this._setGeoJSONLayerData("Point", []), this._setGeoJSONLayerData("LineString", []), this._setGeoJSONLayerData("Polygon", []));
  }
  getCoordinatePrecision() {
    return super.getCoordinatePrecision();
  }
  unregister() {
    super.unregister(), this.changedIds = {
      points: false,
      linestrings: false,
      polygons: false,
      deletion: false,
      styling: false
    }, this._map.removeLayer(`${this._prefixId}-point`), this._map.removeLayer(`${this._prefixId}-point-marker`), this._map.removeSource(`${this._prefixId}-point`), this._map.removeLayer(`${this._prefixId}-linestring`), this._map.removeSource(`${this._prefixId}-linestring`), this._map.removeLayer(`${this._prefixId}-polygon`), this._map.removeLayer(`${this._prefixId}-polygon-outline`), this._map.removeSource(`${this._prefixId}-polygon`);
  }
  register(e) {
    var t2;
    super.register(e);
    let n2 = this._addGeoJSONLayer("Polygon", []), r2 = this._addGeoJSONLayer("LineString", []), i2 = this._addGeoJSONLayer("Point", []);
    var a2;
    this._renderBeforeLayerId && (this._map.moveLayer(i2, this._renderBeforeLayerId), this._map.moveLayer(r2, i2), this._map.moveLayer(`${n2}-outline`, r2), this._map.moveLayer(n2, `${n2}-outline`)), (t2 = this._currentModeCallbacks) != null && t2.onReady && ((a2 = this._currentModeCallbacks) == null || a2.onReady());
  }
};
var Pn = {
  modes: [
    "render",
    "point",
    "marker",
    "linestring",
    "polygon",
    "rectangle",
    "angled-rectangle",
    "sensor",
    "sector",
    "circle",
    "freehand",
    "freehand-linestring",
    "text",
    "select",
    "delete-selection",
    "delete",
    "undo",
    "redo",
    "download"
  ],
  open: false
};
var Y = {
  kilometer: "km",
  meter: "m",
  centimeter: "cm",
  mile: "mi",
  foot: "ft",
  inch: "in",
  "square meters": "m\xB2",
  "square kilometers": "km\xB2",
  ares: "a",
  hectares: "ha",
  "square feet": "ft\xB2",
  "square yards": "yd\xB2",
  acres: "acres",
  "square miles": "mi\xB2"
};
var Fn = "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'%20standalone='no'?%3e%3csvg%20xmlns:dc='http://purl.org/dc/elements/1.1/'%20xmlns:cc='http://creativecommons.org/ns%23'%20xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns%23'%20xmlns:svg='http://www.w3.org/2000/svg'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd'%20xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape'%20inkscape:version='1.0%20(4035a4fb49,%202020-05-01)'%20sodipodi:docname='poi.svg'%20id='svg4460'%20height='100'%20width='100'%20version='1.1'%3e%3csodipodi:namedview%20inkscape:document-rotation='0'%20inkscape:current-layer='svg4460'%20inkscape:window-maximized='1'%20inkscape:window-y='-8'%20inkscape:window-x='-8'%20inkscape:cy='70.031285'%20inkscape:cx='-78.460726'%20inkscape:zoom='2.02'%20showgrid='false'%20id='namedview11'%20inkscape:window-height='1017'%20inkscape:window-width='1920'%20inkscape:pageshadow='2'%20inkscape:pageopacity='0'%20guidetolerance='10'%20gridtolerance='10'%20objecttolerance='10'%20borderopacity='1'%20bordercolor='%23666666'%20pagecolor='%23ffffff'%20/%3e%3cdefs%20id='defs4462'%20/%3e%3cmetadata%20id='metadata4465'%3e%3crdf:RDF%3e%3ccc:Work%20rdf:about=''%3e%3cdc:format%3eimage/svg+xml%3c/dc:format%3e%3cdc:type%20rdf:resource='http://purl.org/dc/dcmitype/StillImage'%20/%3e%3cdc:title%3e%3c/dc:title%3e%3c/cc:Work%3e%3c/rdf:RDF%3e%3c/metadata%3e%3cpath%20d='M%2050.001528,3.3861402e-7%20C%2030.763177,3.3861402e-7%2015,15.718144%2015,34.901534%20c%200,7.432782%202.373565,14.339962%206.391689,20.019029%20l%2024.338528,42.073163%20c%203.40849,4.452814%205.674917,3.607154%208.509014,-0.23458%20L%2081.083105,51.075788%20C%2081.625418,50.0948%2082.050328,49.050173%2082.421327,47.983517%2084.078241,43.936622%2085.000002,39.521943%2085,34.901534%2085,15.718144%2069.23988,3.3861402e-7%2050.001528,3.3861402e-7%20Z%20m%200,16.35400066138598%20c%2010.359296,0%2018.597616,8.21783%2018.597618,18.547533%200,10.329703%20-8.238322,18.544487%20-18.597618,18.544487%20-10.359299,0%20-18.600672,-8.214784%20-18.600672,-18.544487%200,-10.329703%208.241373,-18.547533%2018.600672,-18.547533%20z'%20style='fill:rgb(95,%2099,%20104);stroke-width:4.26019'%20id='path4135'%20/%3e%3c/svg%3e";
var Ln = {
  url: "https://tiles.mapterhorn.com/{z}/{x}/{y}.webp",
  encoding: "terrarium",
  tileSize: 512,
  minzoom: 0,
  maxzoom: 12,
  tms: false
};
var Rn = {
  modes: [
    "render",
    "point",
    "marker",
    "linestring",
    "polyline",
    "polygon",
    "rectangle",
    "angled-rectangle",
    "sensor",
    "sector",
    "circle",
    "freehand",
    "freehand-linestring",
    "text",
    "select",
    "delete-selection",
    "delete",
    "undo",
    "redo",
    "download"
  ],
  open: false,
  modeOptions: {
    point: new it({
      editable: true,
      styles: {
        pointColor: "#FFFFFF",
        pointWidth: 5,
        pointOutlineColor: "#666666",
        pointOutlineWidth: 1
      }
    }),
    marker: new yn({
      editable: true,
      styles: {
        markerUrl: Fn,
        markerWidth: 27,
        markerHeight: 27
      }
    }),
    linestring: new Je({
      editable: true,
      styles: {
        lineStringColor: "#666666",
        lineStringWidth: 2,
        closingPointColor: "#FFFFFF",
        closingPointWidth: 3,
        closingPointOutlineColor: "#666666",
        closingPointOutlineWidth: 1
      }
    }),
    polyline: new Ze({ styles: {
      lineStringColor: "#666666",
      lineStringWidth: 2,
      polygonFillColor: "#EDEFF0",
      polygonFillOpacity: 0.7,
      polygonOutlineColor: "#666666",
      polygonOutlineWidth: 2,
      closingPointColor: "#FFFFFF",
      closingPointWidth: 3,
      closingPointOutlineColor: "#666666",
      closingPointOutlineWidth: 1
    } }),
    polygon: new st({
      editable: true,
      styles: {
        fillColor: "#EDEFF0",
        fillOpacity: 0.7,
        outlineColor: "#666666",
        outlineWidth: 2,
        closingPointColor: "#FAFAFA",
        closingPointWidth: 3,
        closingPointOutlineColor: "#666666",
        closingPointOutlineWidth: 1
      }
    }),
    rectangle: new ut({ styles: {
      fillColor: "#EDEFF0",
      fillOpacity: 0.7,
      outlineColor: "#666666",
      outlineWidth: 2
    } }),
    "angled-rectangle": new an({ styles: {
      fillColor: "#EDEFF0",
      fillOpacity: 0.7,
      outlineColor: "#666666",
      outlineWidth: 2
    } }),
    circle: new be({ styles: {
      fillColor: "#EDEFF0",
      fillOpacity: 0.7,
      outlineColor: "#666666",
      outlineWidth: 2
    } }),
    freehand: new we({ styles: {
      fillColor: "#EDEFF0",
      fillOpacity: 0.7,
      outlineColor: "#666666",
      outlineWidth: 2,
      closingPointColor: "#FAFAFA",
      closingPointWidth: 3,
      closingPointOutlineColor: "#666666",
      closingPointOutlineWidth: 1
    } }),
    "freehand-linestring": new gn({ styles: {
      lineStringColor: "#666666",
      lineStringWidth: 2,
      closingPointColor: "#FFFFFF",
      closingPointWidth: 3,
      closingPointOutlineColor: "#666666",
      closingPointOutlineWidth: 1
    } }),
    sensor: new fn({ styles: {
      fillColor: "#EDEFF0",
      fillOpacity: 0.7,
      outlineColor: "#666666",
      outlineWidth: 2,
      centerPointColor: "#FAFAFA",
      centerPointWidth: 3,
      centerPointOutlineColor: "#666666",
      centerPointOutlineWidth: 1
    } }),
    sector: new ln({ styles: {
      fillColor: "#EDEFF0",
      fillOpacity: 0.7,
      outlineColor: "#666666",
      outlineWidth: 2
    } }),
    select: new Mt({ flags: {
      point: { feature: { draggable: false } },
      marker: { feature: { draggable: false } },
      polygon: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      linestring: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      polyline: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      freehand: { feature: {
        draggable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      "freehand-linestring": { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      circle: { feature: {
        draggable: true,
        coordinates: {
          resizable: "center",
          deletable: false,
          midpoints: false
        }
      } },
      rectangle: { feature: {
        draggable: true,
        rotateable: true,
        coordinates: {
          resizable: "opposite",
          deletable: false,
          midpoints: false
        }
      } },
      "angled-rectangle": { feature: {
        draggable: true,
        rotateable: true,
        coordinates: {
          resizable: "opposite",
          deletable: false,
          midpoints: false
        }
      } },
      sensor: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      sector: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      text: { feature: { draggable: true } }
    } })
  },
  pointLayerLabelSpec: {
    id: "{prefix}-point-label",
    type: "symbol",
    source: "{prefix}-point",
    filter: [
      "all",
      [
        "==",
        "$type",
        "Point"
      ],
      [
        "any",
        [
          "==",
          "mode",
          "point"
        ],
        [
          "==",
          "mode",
          "marker"
        ]
      ]
    ],
    layout: {
      "text-field": [
        "case",
        [
          "all",
          ["has", "elevation"],
          [
            ">",
            ["get", "elevation"],
            0
          ]
        ],
        [
          "concat",
          "Alt. ",
          ["to-string", ["floor", ["get", "elevation"]]],
          " ",
          ["get", "elevationUnit"]
        ],
        ""
      ],
      "symbol-placement": "point",
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        10,
        10,
        12,
        13,
        14,
        14,
        16,
        18,
        18
      ],
      "text-overlap": "always",
      "text-variable-anchor": [
        "left",
        "right",
        "top",
        "bottom"
      ],
      "text-radial-offset": 0.5,
      "text-justify": "center",
      "text-letter-spacing": 0.05
    },
    paint: {
      "text-halo-color": "#F7F7F7",
      "text-halo-width": 2,
      "text-color": "#232E3D"
    }
  },
  lineLayerLabelSpec: {
    id: "{prefix}-line-label",
    type: "symbol",
    source: "{prefix}-line-source",
    filter: [
      "==",
      "$type",
      "Point"
    ],
    layout: {
      "text-field": [
        "concat",
        ["to-string", ["get", "distance"]],
        " ",
        ["get", "unit"],
        [
          "case",
          [
            "==",
            ["get", "total"],
            0
          ],
          "",
          [
            "concat",
            "\n(",
            ["to-string", ["get", "total"]],
            " ",
            ["get", "totalUnit"],
            ")"
          ]
        ],
        [
          "case",
          [
            "all",
            ["has", "elevation"],
            [
              ">",
              ["get", "elevation"],
              0
            ]
          ],
          [
            "concat",
            "\nAlt. ",
            ["to-string", ["floor", ["get", "elevation"]]],
            " ",
            ["get", "elevationUnit"]
          ],
          ""
        ]
      ],
      "symbol-placement": "point",
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        10,
        10,
        12,
        13,
        14,
        14,
        16,
        18,
        18
      ],
      "text-overlap": "always",
      "text-variable-anchor": [
        "left",
        "right",
        "top",
        "bottom"
      ],
      "text-radial-offset": 0.5,
      "text-justify": "center",
      "text-letter-spacing": 0.05
    },
    paint: {
      "text-halo-color": "#F7F7F7",
      "text-halo-width": 2,
      "text-color": "#232E3D"
    }
  },
  routingLineLayerNodeSpec: {
    id: "{prefix}-line-node",
    type: "circle",
    source: "{prefix}-line-source",
    filter: [
      "==",
      "$type",
      "Point"
    ],
    layout: {},
    paint: {
      "circle-radius": 3,
      "circle-color": "#FFFFFF",
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1
    }
  },
  polygonLayerSpec: {
    id: "{prefix}-polygon-label",
    type: "symbol",
    source: "{prefix}-polygon-source",
    filter: [
      "==",
      "$type",
      "Point"
    ],
    layout: {
      "text-field": [
        "concat",
        ["to-string", ["get", "area"]],
        " ",
        ["get", "unit"]
      ],
      "symbol-placement": "point",
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        10,
        10,
        12,
        13,
        14,
        14,
        16,
        18,
        18
      ],
      "text-overlap": "always",
      "text-letter-spacing": 0.05
    },
    paint: {
      "text-halo-color": "#F7F7F7",
      "text-halo-width": 2,
      "text-color": "#232E3D"
    }
  },
  computeElevation: false,
  terrainSource: Ln,
  measureUnitType: "metric",
  distancePrecision: 2,
  distanceUnit: void 0,
  areaPrecision: 2,
  areaUnit: void 0,
  measureUnitSymbols: JSON.parse(JSON.stringify(Y)),
  elevationCacheConfig: {
    enabled: true,
    maxSize: 1e3,
    ttl: 3600 * 1e3,
    precision: 9
  },
  adapterOptions: { prefixId: "td-measure" }
};
var X = {
  modes: [
    "render",
    "routing",
    "time-isochrone",
    "distance-isochrone",
    "select",
    "delete-selection",
    "delete",
    "download",
    "settings"
  ],
  open: false,
  modeOptions: {
    "time-isochrone": new it({
      modeName: "time-isochrone",
      editable: false,
      styles: {
        pointColor: "#FFFFFF",
        pointWidth: 5,
        pointOutlineColor: "#666666",
        pointOutlineWidth: 1
      }
    }),
    "distance-isochrone": new it({
      modeName: "distance-isochrone",
      editable: false,
      styles: {
        pointColor: "#FFFFFF",
        pointWidth: 5,
        pointOutlineColor: "#666666",
        pointOutlineWidth: 1
      }
    }),
    routing: new Je({
      modeName: "routing",
      editable: false,
      styles: {
        lineStringColor: "#FF0000",
        lineStringWidth: 2,
        closingPointColor: "#FF0000",
        closingPointWidth: 3,
        closingPointOutlineColor: "#666666",
        closingPointOutlineWidth: 1
      }
    }),
    select: new Mt({ flags: {
      "time-isochrone": { feature: { draggable: false } },
      "distance-isochrone": { feature: { draggable: false } },
      routing: { feature: {
        draggable: false,
        rotateable: false,
        scaleable: false,
        coordinates: {
          midpoints: false,
          draggable: false,
          deletable: false
        }
      } }
    } }),
    settings: new V({
      modeName: "settings",
      styles: {}
    })
  },
  valhallaOptions: {
    url: "",
    routingOptions: {
      costingModel: "auto",
      distanceUnit: "kilometers"
    },
    isochroneOptions: {
      timeCostingModel: "auto",
      distanceCostingModel: "auto",
      contours: [
        {
          time: 3,
          distance: 1,
          color: "#ff0000"
        },
        {
          time: 5,
          distance: 2,
          color: "#ffff00"
        },
        {
          time: 10,
          distance: 3,
          color: "#0000ff"
        },
        {
          time: 15,
          distance: 4,
          color: "#ff00ff"
        }
      ]
    }
  },
  adapterOptions: { prefixId: "td-valhalla" },
  routingLineLayerNodeLabelSpec: {
    id: "{prefix}-routing-node-label",
    type: "symbol",
    source: "{prefix}-routing-source",
    filter: [
      "==",
      "$type",
      "Point"
    ],
    layout: {
      "text-field": [
        "case",
        [
          "all",
          ["has", "distance"],
          ["has", "distance_unit"],
          ["has", "time"]
        ],
        [
          "concat",
          ["to-string", ["get", "text"]],
          "\n",
          ["to-string", [
            "/",
            ["round", [
              "*",
              ["get", "distance"],
              10
            ]],
            10
          ]],
          ["to-string", ["get", "distance_unit"]],
          "\n",
          ["to-string", ["get", "time"]],
          "min"
        ],
        ["all", ["has", "costingModel"]],
        [
          "concat",
          ["to-string", ["get", "text"]],
          "\n(",
          ["to-string", ["get", "costingModel"]],
          ")"
        ],
        ["concat", ["to-string", ["get", "text"]]]
      ],
      "symbol-placement": "point",
      "text-size": [
        "interpolate",
        ["linear"],
        ["zoom"],
        5,
        10,
        10,
        12,
        13,
        14,
        14,
        16,
        18,
        18
      ],
      "text-overlap": "always",
      "text-variable-anchor": [
        "left",
        "right",
        "top",
        "bottom"
      ],
      "text-radial-offset": 0.5,
      "text-justify": "left",
      "text-letter-spacing": 0.05
    },
    paint: {
      "text-halo-color": "#F7F7F7",
      "text-halo-width": 2,
      "text-color": "#232E3D"
    }
  },
  routingLineLayerNodeSpec: {
    id: "{prefix}-routing-node",
    type: "circle",
    source: "{prefix}-routing-source",
    filter: [
      "==",
      "$type",
      "Point"
    ],
    layout: {},
    paint: {
      "circle-radius": 3,
      "circle-color": [
        "case",
        [
          "==",
          ["get", "text"],
          "Start"
        ],
        "#0000FF",
        [
          "==",
          ["get", "text"],
          "Goal"
        ],
        "#FFFF00",
        "#FFFFFF"
      ],
      "circle-stroke-color": "#000000",
      "circle-stroke-width": 1
    }
  },
  timeIsochronePolygonLayerSpec: {
    id: "{prefix}-time-isochrone-polygon",
    type: "fill",
    source: "{prefix}-time-isochrone-source",
    layout: {},
    paint: {
      "fill-color": ["get", "fillColor"],
      "fill-opacity": ["get", "fillOpacity"]
    }
  },
  timeIsochroneLineLayerSpec: {
    id: "{prefix}-time-isochrone-line",
    type: "line",
    source: "{prefix}-time-isochrone-source",
    layout: {
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": ["get", "fillColor"],
      "line-width": 3
    }
  },
  timeIsochroneLabelLayerSpec: {
    id: "{prefix}-time-isochrone-label",
    type: "symbol",
    source: "{prefix}-time-isochrone-source",
    layout: {
      "symbol-placement": "line",
      "text-pitch-alignment": "viewport",
      "text-field": [
        "concat",
        ["get", "contour"],
        " ",
        "min"
      ],
      "text-size": 12,
      "symbol-spacing": 100,
      "text-max-angle": 45
    },
    paint: {
      "text-color": "rgb(0, 0, 0)",
      "text-halo-width": 1,
      "text-halo-color": "rgb(255, 255, 255)"
    }
  },
  distanceIsochronePolygonLayerSpec: {
    id: "{prefix}-distance-isochrone-polygon",
    type: "fill",
    source: "{prefix}-distance-isochrone-source",
    layout: {},
    paint: {
      "fill-color": ["get", "fillColor"],
      "fill-opacity": ["get", "fillOpacity"]
    }
  },
  distanceIsochroneLineLayerSpec: {
    id: "{prefix}-distance-isochrone-line",
    type: "line",
    source: "{prefix}-distance-isochrone-source",
    layout: {
      "line-join": "round",
      "line-cap": "round"
    },
    paint: {
      "line-color": ["get", "fillColor"],
      "line-width": 3
    }
  },
  distanceIsochroneLabelLayerSpec: {
    id: "{prefix}-distance-isochrone-label",
    type: "symbol",
    source: "{prefix}-distance-isochrone-source",
    layout: {
      "symbol-placement": "line",
      "text-pitch-alignment": "viewport",
      "text-field": [
        "concat",
        ["get", "contour"],
        " ",
        "km"
      ],
      "text-size": 12,
      "symbol-spacing": 100,
      "text-max-angle": 45
    },
    paint: {
      "text-color": "rgb(0, 0, 0)",
      "text-halo-width": 1,
      "text-halo-color": "rgb(255, 255, 255)"
    }
  }
};
var zn = "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'%20standalone='no'?%3e%3csvg%20xmlns:dc='http://purl.org/dc/elements/1.1/'%20xmlns:cc='http://creativecommons.org/ns%23'%20xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns%23'%20xmlns:svg='http://www.w3.org/2000/svg'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd'%20xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape'%20inkscape:version='1.0%20(4035a4fb49,%202020-05-01)'%20sodipodi:docname='poi.svg'%20id='svg4460'%20height='100'%20width='100'%20version='1.1'%3e%3csodipodi:namedview%20inkscape:document-rotation='0'%20inkscape:current-layer='svg4460'%20inkscape:window-maximized='1'%20inkscape:window-y='-8'%20inkscape:window-x='-8'%20inkscape:cy='70.031285'%20inkscape:cx='-78.460726'%20inkscape:zoom='2.02'%20showgrid='false'%20id='namedview11'%20inkscape:window-height='1017'%20inkscape:window-width='1920'%20inkscape:pageshadow='2'%20inkscape:pageopacity='0'%20guidetolerance='10'%20gridtolerance='10'%20objecttolerance='10'%20borderopacity='1'%20bordercolor='%23666666'%20pagecolor='%23ffffff'%20/%3e%3cdefs%20id='defs4462'%20/%3e%3cmetadata%20id='metadata4465'%3e%3crdf:RDF%3e%3ccc:Work%20rdf:about=''%3e%3cdc:format%3eimage/svg+xml%3c/dc:format%3e%3cdc:type%20rdf:resource='http://purl.org/dc/dcmitype/StillImage'%20/%3e%3cdc:title%3e%3c/dc:title%3e%3c/cc:Work%3e%3c/rdf:RDF%3e%3c/metadata%3e%3cpath%20d='M%2050.001528,3.3861402e-7%20C%2030.763177,3.3861402e-7%2015,15.718144%2015,34.901534%20c%200,7.432782%202.373565,14.339962%206.391689,20.019029%20l%2024.338528,42.073163%20c%203.40849,4.452814%205.674917,3.607154%208.509014,-0.23458%20L%2081.083105,51.075788%20C%2081.625418,50.0948%2082.050328,49.050173%2082.421327,47.983517%2084.078241,43.936622%2085.000002,39.521943%2085,34.901534%2085,15.718144%2069.23988,3.3861402e-7%2050.001528,3.3861402e-7%20Z%20m%200,16.35400066138598%20c%2010.359296,0%2018.597616,8.21783%2018.597618,18.547533%200,10.329703%20-8.238322,18.544487%20-18.597618,18.544487%20-10.359299,0%20-18.600672,-8.214784%20-18.600672,-18.544487%200,-10.329703%208.241373,-18.547533%2018.600672,-18.547533%20z'%20style='fill:%233FB1CE;stroke-width:4.26019'%20id='path4135'%20/%3e%3c/svg%3e";
var { TerraDrawBaseDrawMode: Bn } = pn;
var Vn = class extends Bn {
  constructor(e) {
    super({ styles: e?.styles ?? {} });
    __publicField(this, "mode", "text");
    __publicField(this, "options");
    __publicField(this, "editable", false);
    __publicField(this, "activeWrapper", null);
    __publicField(this, "activeTextarea", null);
    __publicField(this, "activeFeatureId", null);
    __publicField(this, "_mapContainer", null);
    __publicField(this, "isContextMenuOpen", false);
    __publicField(this, "rafId", null);
    this.options = e, this.styles = e?.styles ?? {}, this.editable = e?.editable ?? false, this._mapContainer = this.getMap(), this.pointerEvents = {
      ...this.pointerEvents,
      contextMenu: true
    };
  }
  start() {
    this.setStarted(), this.setCursor("crosshair"), this._mapContainer?.addEventListener("contextmenu", this.onContextMenu.bind(this));
  }
  stop() {
    this.cleanUp(), this.setStopped(), this.setCursor("unset"), this.isContextMenuOpen = false, this._mapContainer?.removeEventListener("contextmenu", this.onContextMenu.bind(this));
  }
  cleanUp() {
    this.dismissTextarea(true), this.rafId && (this.rafId = (cancelAnimationFrame(this.rafId), null)), this.isContextMenuOpen = false;
  }
  getMap() {
    return window.document.getElementById("map") ?? window.document.querySelector(".maplibregl-map") ?? window.document.querySelector(".map");
  }
  createTextAreaWrapper(e, t2) {
    let n2 = document.createElement("div");
    n2.id = "text-area-wrapper";
    let r2 = this.createDomStyles("textAreaWrapper");
    return Object.assign(n2.style, {
      ...r2,
      left: `${e}px`,
      top: `${t2}px`,
      transform: "translateY(-100%)"
    }), n2;
  }
  createTextAreaElement(e) {
    let t2 = document.createElement("textarea");
    t2.placeholder = this.options?.placeholder ?? "Enter label...", t2.rows = 1, e && (t2.value = e, t2.setSelectionRange(e.length, e.length));
    let n2 = this.createDomStyles("textArea");
    return Object.assign(t2.style, n2), t2;
  }
  resizeTextarea(e) {
    let t2 = window.getComputedStyle(e), n2 = Number.parseFloat(t2.fontSize) || 12, r2 = Number.parseFloat(t2.lineHeight) || n2 * 1.2, i2 = Number.parseFloat(t2.paddingTop) || 0, a2 = Number.parseFloat(t2.paddingBottom) || 0, o2 = Number.parseFloat(t2.borderTopWidth) || 0, s2 = Number.parseFloat(t2.borderBottomWidth) || 0, c2 = i2 + a2 + o2 + s2, l2 = r2 + c2, u2 = r2 * 3 + c2;
    e.style.height = "auto";
    let d2 = Math.min(Math.max(e.scrollHeight, l2), u2);
    e.style.height = `${d2}px`, e.style.overflowY = e.scrollHeight > u2 ? "auto" : "hidden";
  }
  createTextAreaTooltip() {
    let e = document.createElement("span");
    return e.innerHTML = ["Shift + Enter to make new line.", "Right-click or long-tap to edit label."].join("<br>"), Object.assign(e.style, this.createDomStyles("span")), e;
  }
  createSubmitButton() {
    let e = document.createElement("button");
    e.type = "button", e.className = "maplibregl-terradraw-text-mode-submit-button";
    let t2 = this.createDomStyles("submitButton");
    return Object.assign(e.style, t2), e.addEventListener("mouseenter", () => {
      e.style.backgroundColor = "#2d7fc1";
    }), e.addEventListener("mouseleave", () => {
      e.style.backgroundColor = t2?.backgroundColor;
    }), e;
  }
  createDomStyles(e) {
    switch (e) {
      case "textArea":
        return this.options?.domStyles?.textArea ? {
          ...Wn,
          ...this.options?.domStyles?.textArea
        } : { ...Wn };
      case "submitButton":
        return this.options?.domStyles?.submitButton ? {
          ...Gn,
          ...this.options?.domStyles?.submitButton
        } : { ...Gn };
      case "textAreaWrapper":
        return { ...Kn };
      case "span":
        return { ...qn };
      default:
        break;
    }
  }
  mountTextAreaPopup(e, t2, n2, r2, i2) {
    let a2 = this.createTextAreaWrapper(e, t2), o2 = document.createElement("div");
    Object.assign(o2.style, {
      display: "flex",
      alignItems: "flex-start"
    });
    let s2 = this.createTextAreaElement(i2), c2 = this.createTextAreaTooltip(), l2 = this.createSubmitButton();
    return l2.disabled = !i2, l2.style.opacity = "1", l2.style.cursor = i2 ? "pointer" : "not-allowed", s2.addEventListener("input", () => {
      this.resizeTextarea(s2);
      let e2 = s2.value.trim().length > 0;
      l2.disabled = !e2, l2.style.opacity = "1", l2.style.cursor = e2 ? "pointer" : "not-allowed";
    }), s2.addEventListener("keydown", (e2) => {
      e2.key === "Escape" && r2();
    }), l2.addEventListener("click", () => {
      let e2 = s2.value.trim();
      e2 ? n2(e2) : r2();
    }), o2.appendChild(s2), o2.appendChild(l2), a2.appendChild(o2), a2.appendChild(c2), this._mapContainer?.appendChild(a2), this.resizeTextarea(s2), s2.focus(), {
      wrapper: a2,
      textarea: s2
    };
  }
  showTextarea(e, t2, n2) {
    this.dismissTextarea(false);
    let { wrapper: r2, textarea: i2 } = this.mountTextAreaPopup(t2, n2, (t3) => this.commitText(e, t3), () => this.dismissTextarea(true));
    i2.addEventListener("keydown", (t3) => {
      t3.key === "Enter" && !t3.shiftKey && (t3.preventDefault(), this.commitText(e, i2.value.trim()));
    }), this.activeWrapper = r2, this.activeTextarea = i2, this.activeFeatureId = e;
  }
  editText(e, t2, n2) {
    this.dismissTextarea(false);
    let r2 = this.store.copyAll().find((t3) => t3.id === e)?.properties?.text ?? "", { wrapper: i2, textarea: a2 } = this.mountTextAreaPopup(t2, n2, (t3) => this.commitText(e, t3), () => this.dismissTextarea(false), r2);
    a2.addEventListener("keydown", (t3) => {
      t3.key === "Enter" && !t3.shiftKey && (t3.preventDefault(), this.commitText(e, a2.value.trim()));
    }), this.activeWrapper = i2, this.activeTextarea = a2, this.activeFeatureId = e;
  }
  commitText(e, t2) {
    if (!t2) {
      this.dismissTextarea(true);
      return;
    }
    this.store.updateProperty([{
      id: e,
      property: "text",
      value: t2
    }]), this.options?.onTextCommit?.(e, t2), this.dismissTextarea(false), this.onFinish(e, {
      mode: this.mode,
      action: "draw"
    }), this.isContextMenuOpen = false;
  }
  dismissTextarea(e) {
    this.activeWrapper && (this.activeWrapper = (this.activeWrapper.remove(), null)), this.activeTextarea = null, e && this.activeFeatureId && this.store.delete([this.activeFeatureId]), this.activeFeatureId = null;
  }
  onClick(e) {
    if (this.isContextMenuOpen && this.options?.editable) {
      this.isContextMenuOpen = false;
      return;
    }
    if (this.activeTextarea && this.activeFeatureId) {
      let e2 = this.store.copyAll().find((e3) => e3.id === this.activeFeatureId), t3 = typeof e2?.properties?.text == "string" && e2.properties.text.trim().length > 0;
      this.dismissTextarea(!t3), this.isContextMenuOpen = false;
      return;
    }
    let { x: t2, y: n2 } = this.project(e.lng, e.lat);
    this.setCursor("crosshair");
    let [r2] = this.store.create([{
      geometry: {
        type: "Point",
        coordinates: [e.lng, e.lat]
      },
      properties: {
        mode: this.mode,
        text: ""
      }
    }]);
    this.showTextarea(r2, t2, n2);
  }
  onContextMenu(e) {
    if (!this.editable) return;
    this.isContextMenuOpen = true, e.preventDefault();
    let t2 = this._mapContainer.getBoundingClientRect(), n2 = e.clientX - t2.left, r2 = e.clientY - t2.top, i2 = this.getNearestPointFeature(n2, r2);
    if (!i2) {
      this.isContextMenuOpen = false;
      return;
    }
    this.editText(i2.id, n2, r2);
  }
  onKeyUp(e) {
    e.key === "Escape" && !this.isContextMenuOpen && this.dismissTextarea(true);
  }
  onMouseMove(e) {
    this.rafId || (this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      let t2 = this.getNearestPointFeature(e.containerX, e.containerY);
      this.setCursor(t2 ? "pointer" : "crosshair");
    }));
  }
  styleFeature(e) {
    return {
      pointColor: e.properties?.text ? this.styles.pointColor ?? "#5CFF2E" : "#72FF35",
      pointWidth: 0,
      pointOutlineColor: "#FFFFFF",
      pointOutlineWidth: 0,
      polygonFillColor: "#000",
      polygonFillOpacity: 0,
      polygonOutlineColor: "#000000",
      polygonOutlineWidth: 0,
      lineStringColor: "#000",
      lineStringWidth: 0,
      zIndex: 30
    };
  }
  validateFeature(e) {
    return { valid: e.geometry.type === "Point" && e.properties?.mode === this.mode };
  }
  getNearestPointFeature(e, t2) {
    let n2 = this.store.copyAll(), r2 = null, i2 = Infinity;
    for (let a2 of n2) {
      if (a2.geometry.type !== "Point" || a2.properties?.mode !== this.mode || !a2.properties?.text) continue;
      let [n3, o2] = a2.geometry.coordinates, { x: s2, y: c2 } = this.project(n3, o2), l2 = Math.sqrt((e - s2) ** 2 + (t2 - c2) ** 2);
      l2 < i2 && l2 <= this.pointerDistance && (i2 = l2, r2 = { id: a2.id });
    }
    return r2;
  }
};
var Hn = (e, t2) => {
  let n2 = t2.updateType;
  return n2 === "finish" || n2 === "commit" ? en(e) : { valid: true };
};
var Un = () => ({
  render: new V({
    modeName: "render",
    styles: {}
  }),
  point: new it({ editable: true }),
  marker: new yn({
    editable: true,
    styles: {
      markerUrl: zn,
      markerWidth: 27,
      markerHeight: 27
    }
  }),
  linestring: new Je({ editable: true }),
  polyline: new Ze(),
  polygon: new st({
    editable: true,
    validation: Hn
  }),
  rectangle: new ut(),
  "angled-rectangle": new an(),
  circle: new be(),
  freehand: new we(),
  "freehand-linestring": new gn(),
  sensor: new fn(),
  sector: new ln(),
  select: new Mt({
    flags: {
      point: { feature: { draggable: true } },
      marker: { feature: { draggable: true } },
      polygon: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      linestring: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      polyline: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      freehand: { feature: {
        draggable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      "freehand-linestring": { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      circle: { feature: {
        draggable: true,
        coordinates: {
          resizable: "center",
          deletable: false,
          midpoints: false
        }
      } },
      rectangle: { feature: {
        draggable: true,
        rotateable: true,
        coordinates: {
          resizable: "opposite",
          deletable: false,
          midpoints: false
        }
      } },
      "angled-rectangle": { feature: {
        draggable: true,
        rotateable: true,
        coordinates: {
          resizable: "opposite",
          deletable: false,
          midpoints: false
        }
      } },
      sensor: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      sector: { feature: {
        draggable: true,
        rotateable: true,
        scaleable: true,
        coordinates: {
          midpoints: true,
          draggable: true,
          deletable: true
        }
      } },
      text: { feature: { draggable: true } }
    },
    styles: {
      selectedPointColor: (e) => {
        if (e.properties.mode === "text") return "#FFFFFF";
      },
      selectedPointWidth: (e) => {
        if (e.properties.mode === "text") return 0;
      }
    }
  }),
  delete: new V({
    modeName: "delete",
    styles: {}
  }),
  "delete-selection": new V({
    modeName: "delete-selection",
    styles: {}
  }),
  download: new V({
    modeName: "download",
    styles: {}
  }),
  undo: new V({
    modeName: "undo",
    styles: {}
  }),
  redo: new V({
    modeName: "redo",
    styles: {}
  }),
  text: new Vn({
    editable: true,
    placeholder: "Enter Label here...",
    styles: {
      textColor: "#000000",
      textSize: 12,
      textSelectedSize: 14,
      textHaloWidth: 1,
      textHaloColor: "#FFFFFF",
      textSelectedHaloColor: "#E0B03F"
    }
  })
});
var Wn = {
  padding: "4px 8px",
  fontSize: "12px",
  lineHeight: "1.4",
  fontFamily: "sans-serif",
  border: "none",
  borderRadius: "0",
  background: "rgba(255,255,255,0.95)",
  color: "#111",
  margin: "0",
  display: "block",
  resize: "none",
  outline: "none",
  overflowY: "hidden",
  width: "auto",
  flex: "1",
  boxSizing: "border-box",
  position: "relative"
};
var Gn = {
  padding: "6px 10px",
  fontSize: "11px",
  fontFamily: "sans-serif",
  backgroundColor: "#3F97E0",
  border: "1px solid #d9d9d9",
  borderTop: "none",
  borderRight: "none",
  borderBottom: "none",
  borderRadius: "0",
  cursor: "pointer",
  minWidth: "48px",
  minHeight: "25px",
  boxSizing: "border-box",
  position: "relative"
};
var Kn = {
  position: "absolute",
  zIndex: "1000",
  display: "flex",
  flexDirection: "column",
  minWidth: "210px",
  maxWidth: "250px",
  border: "1px solid #d9d9d9",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  borderRadius: "0",
  overflow: "hidden",
  background: "rgba(255,255,255,1.0)"
};
var qn = {
  display: "block",
  padding: "8px",
  fontSize: "10px",
  fontFamily: "sans-serif",
  color: "#888",
  background: "rgba(255,255,255,0.95)",
  borderTop: "1px solid #d9d9d9"
};
var Z = 63710088e-1;
var Jn = {
  centimeters: Z * 100,
  centimetres: Z * 100,
  degrees: 360 / (2 * Math.PI),
  feet: Z * 3.28084,
  inches: Z * 39.37,
  kilometers: Z / 1e3,
  kilometres: Z / 1e3,
  meters: Z,
  metres: Z,
  miles: Z / 1609.344,
  millimeters: Z * 1e3,
  millimetres: Z * 1e3,
  nauticalmiles: Z / 1852,
  radians: 1,
  yards: Z * 1.0936
};
function Yn(e, t2, n2 = {}) {
  let r2 = { type: "Feature" };
  return (n2.id === 0 || n2.id) && (r2.id = n2.id), n2.bbox && (r2.bbox = n2.bbox), r2.properties = t2 || {}, r2.geometry = e, r2;
}
function Xn(e, t2, n2 = {}) {
  if (!e) throw Error("coordinates is required");
  if (!Array.isArray(e)) throw Error("coordinates must be an Array");
  if (e.length < 2) throw Error("coordinates must be at least 2 numbers long");
  if (!$n(e[0]) || !$n(e[1])) throw Error("coordinates must contain numbers");
  return Yn({
    type: "Point",
    coordinates: e
  }, t2, n2);
}
function Zn(e, t2 = "kilometers") {
  let n2 = Jn[t2];
  if (!n2) throw Error(t2 + " units is invalid");
  return e * n2;
}
function Qn(e) {
  return e % 360 * Math.PI / 180;
}
function $n(e) {
  return !isNaN(e) && e !== null && !Array.isArray(e);
}
function er(e, t2, n2) {
  if (e !== null) for (var r2, i2, a2, o2, s2, c2, l2, u2 = 0, d2 = 0, f2, p2 = e.type, m3 = p2 === "FeatureCollection", h2 = p2 === "Feature", g2 = m3 ? e.features.length : 1, _2 = 0; _2 < g2; _2++) {
    l2 = m3 ? e.features[_2].geometry : h2 ? e.geometry : e, f2 = l2 ? l2.type === "GeometryCollection" : false, s2 = f2 ? l2.geometries.length : 1;
    for (var v2 = 0; v2 < s2; v2++) {
      var y2 = 0, b2 = 0;
      if (o2 = f2 ? l2.geometries[v2] : l2, o2 !== null) {
        c2 = o2.coordinates;
        var x2 = o2.type;
        switch (u2 = n2 && (x2 === "Polygon" || x2 === "MultiPolygon") ? 1 : 0, x2) {
          case null:
            break;
          case "Point":
            if (t2(c2, d2, _2, y2, b2) === false) return false;
            d2++, y2++;
            break;
          case "LineString":
          case "MultiPoint":
            for (r2 = 0; r2 < c2.length; r2++) {
              if (t2(c2[r2], d2, _2, y2, b2) === false) return false;
              d2++, x2 === "MultiPoint" && y2++;
            }
            x2 === "LineString" && y2++;
            break;
          case "Polygon":
          case "MultiLineString":
            for (r2 = 0; r2 < c2.length; r2++) {
              for (i2 = 0; i2 < c2[r2].length - u2; i2++) {
                if (t2(c2[r2][i2], d2, _2, y2, b2) === false) return false;
                d2++;
              }
              x2 === "MultiLineString" && y2++, x2 === "Polygon" && b2++;
            }
            x2 === "Polygon" && y2++;
            break;
          case "MultiPolygon":
            for (r2 = 0; r2 < c2.length; r2++) {
              for (b2 = 0, i2 = 0; i2 < c2[r2].length; i2++) {
                for (a2 = 0; a2 < c2[r2][i2].length - u2; a2++) {
                  if (t2(c2[r2][i2][a2], d2, _2, y2, b2) === false) return false;
                  d2++;
                }
                b2++;
              }
              y2++;
            }
            break;
          case "GeometryCollection":
            for (r2 = 0; r2 < o2.geometries.length; r2++) if (er(o2.geometries[r2], t2, n2) === false) return false;
            break;
          default:
            throw Error("Unknown Geometry Type");
        }
      }
    }
  }
}
function tr(e, t2) {
  var n2, r2, i2, a2, o2, s2, c2, l2, u2, d2, f2 = 0, p2 = e.type === "FeatureCollection", m3 = e.type === "Feature", h2 = p2 ? e.features.length : 1;
  for (n2 = 0; n2 < h2; n2++) {
    for (s2 = p2 ? e.features[n2].geometry : m3 ? e.geometry : e, l2 = p2 ? e.features[n2].properties : m3 ? e.properties : {}, u2 = p2 ? e.features[n2].bbox : m3 ? e.bbox : void 0, d2 = p2 ? e.features[n2].id : m3 ? e.id : void 0, c2 = s2 ? s2.type === "GeometryCollection" : false, o2 = c2 ? s2.geometries.length : 1, i2 = 0; i2 < o2; i2++) {
      if (a2 = c2 ? s2.geometries[i2] : s2, a2 === null) {
        if (t2(null, f2, l2, u2, d2) === false) return false;
        continue;
      }
      switch (a2.type) {
        case "Point":
        case "LineString":
        case "MultiPoint":
        case "Polygon":
        case "MultiLineString":
        case "MultiPolygon":
          if (t2(a2, f2, l2, u2, d2) === false) return false;
          break;
        case "GeometryCollection":
          for (r2 = 0; r2 < a2.geometries.length; r2++) if (t2(a2.geometries[r2], f2, l2, u2, d2) === false) return false;
          break;
        default:
          throw Error("Unknown Geometry Type");
      }
    }
    f2++;
  }
}
function nr(e, t2, n2) {
  var r2 = n2;
  return tr(e, function(e2, i2, a2, o2, s2) {
    r2 = i2 === 0 && n2 === void 0 ? e2 : t2(r2, e2, i2, a2, o2, s2);
  }), r2;
}
function rr(e) {
  return nr(e, (e2, t2) => e2 + ir(t2), 0);
}
function ir(e) {
  let t2 = 0, n2;
  switch (e.type) {
    case "Polygon":
      return ar(e.coordinates);
    case "MultiPolygon":
      for (n2 = 0; n2 < e.coordinates.length; n2++) t2 += ar(e.coordinates[n2]);
      return t2;
    case "Point":
    case "MultiPoint":
    case "LineString":
    case "MultiLineString":
      return 0;
  }
  return 0;
}
function ar(e) {
  let t2 = 0;
  if (e && e.length > 0) {
    t2 += Math.abs(cr(e[0]));
    for (let n2 = 1; n2 < e.length; n2++) t2 -= Math.abs(cr(e[n2]));
  }
  return t2;
}
var or = Z * Z / 2;
var sr = Math.PI / 180;
function cr(e) {
  let t2 = e.length - 1;
  if (t2 <= 2) return 0;
  let n2 = 0, r2 = 0;
  for (; r2 < t2; ) {
    let i2 = e[r2], a2 = e[r2 + 1 === t2 ? 0 : r2 + 1], o2 = e[r2 + 2 >= t2 ? (r2 + 2) % t2 : r2 + 2], s2 = i2[0] * sr, c2 = a2[1] * sr, l2 = o2[0] * sr;
    n2 += (l2 - s2) * Math.sin(c2), r2++;
  }
  return n2 * or;
}
var lr = rr;
var ur = (e, t2, n2 = void 0, r2 = Y) => {
  let i2 = [
    "square meters",
    "square kilometers",
    "ares",
    "hectares"
  ], a2 = [
    "square feet",
    "square yards",
    "acres",
    "square miles"
  ];
  if (n2 && typeof n2 != "function") {
    let t3 = i2.includes(n2), o2 = a2.includes(n2);
    if (t3) return fr(e, n2, r2);
    if (o2) return pr(e, n2, r2);
  }
  return n2 && typeof n2 == "function" ? n2(e) : dr(e, t2, r2);
};
var dr = (e, t2, n2) => t2 === "metric" ? e >= 1e6 ? fr(e, "square kilometers", n2) : e >= 1e4 ? fr(e, "hectares", n2) : e >= 100 ? fr(e, "ares", n2) : fr(e, "square meters", n2) : e >= 258998811e-2 ? pr(e, "square miles", n2) : e >= 4046.856 ? pr(e, "acres", n2) : e >= 0.83612736 ? pr(e, "square yards", n2) : pr(e, "square feet", n2);
var fr = (e, t2, n2) => {
  let r2 = e, i2 = n2["square meters"];
  switch (t2) {
    case "square meters":
      r2 = e, i2 = n2["square meters"];
      break;
    case "ares":
      r2 = e / 100, i2 = n2.ares;
      break;
    case "hectares":
      r2 = e / 1e4, i2 = n2.hectares;
      break;
    case "square kilometers":
      r2 = e / 1e6, i2 = n2["square kilometers"];
      break;
  }
  return {
    area: r2,
    unit: i2
  };
};
var pr = (e, t2, n2) => {
  let r2 = e / 258998811e-2, i2 = n2["square meters"];
  switch (t2) {
    case "square feet":
      r2 = e / 0.09290304, i2 = n2["square feet"];
      break;
    case "square yards":
      r2 = e / 0.83612736, i2 = n2["square yards"];
      break;
    case "acres":
      r2 = e / 4046.856, i2 = n2.acres;
      break;
    case "square miles":
      r2 = e / 258998811e-2, i2 = n2["square miles"];
      break;
  }
  return {
    area: r2,
    unit: i2
  };
};
var mr = (e, t2, n2, r2, i2) => {
  if (e.geometry.type !== "Polygon") return e;
  let a2 = ur(lr(e.geometry), t2, r2, i2);
  return a2.area = parseFloat(a2.area.toFixed(n2)), e.properties.area = a2.area, e.properties.unit = a2.unit, e;
};
function hr(e) {
  if (!e) throw Error("coord is required");
  if (!Array.isArray(e)) {
    if (e.type === "Feature" && e.geometry !== null && e.geometry.type === "Point") return [...e.geometry.coordinates];
    if (e.type === "Point") return [...e.coordinates];
  }
  if (Array.isArray(e) && e.length >= 2 && !Array.isArray(e[0]) && !Array.isArray(e[1])) return [...e];
  throw Error("coord must be GeoJSON Point or an Array of numbers");
}
function gr(e, t2, n2 = {}) {
  var r2 = hr(e), i2 = hr(t2), a2 = Qn(i2[1] - r2[1]), o2 = Qn(i2[0] - r2[0]), s2 = Qn(r2[1]), c2 = Qn(i2[1]), l2 = Math.sin(a2 / 2) ** 2 + Math.sin(o2 / 2) ** 2 * Math.cos(s2) * Math.cos(c2);
  return Zn(2 * Math.atan2(Math.sqrt(l2), Math.sqrt(1 - l2)), n2.units);
}
var _r = gr;
var vr = (e, t2 = "metric", n2 = void 0, r2 = Y) => {
  let i2 = [
    "centimeter",
    "meter",
    "kilometer"
  ], a2 = [
    "inch",
    "foot",
    "mile"
  ], o2 = {
    distance: e,
    unit: r2.meter
  };
  if (n2 && typeof n2 != "function") {
    let t3 = i2.includes(n2), s2 = a2.includes(n2);
    t3 ? o2 = br(e, n2, r2) : s2 && (o2 = xr(e, n2, r2));
  } else o2 = n2 && typeof n2 == "function" ? n2(e) : yr(e, t2, r2);
  return o2;
};
var yr = (e, t2, n2) => {
  let r2 = {
    distance: e,
    unit: n2.meter
  };
  if (t2 === "metric") r2 = e >= 1e3 ? br(e, "kilometer", n2) : e >= 1 ? br(e, "meter", n2) : br(e, "centimeter", n2);
  else if (t2 === "imperial") {
    let t3 = Math.round(e * 3.28084 * 10) / 10;
    r2 = t3 >= 5280 ? xr(e, "mile", n2) : t3 >= 1 ? xr(e, "foot", n2) : xr(e, "inch", n2);
  }
  return r2;
};
var br = (e, t2, n2) => {
  let r2 = {
    distance: e,
    unit: n2.meter
  };
  switch (t2) {
    case "meter":
      r2.distance = e, r2.unit = n2[t2];
      break;
    case "centimeter":
      r2.distance = e * 100, r2.unit = n2[t2];
      break;
    case "kilometer":
      r2.distance = e / 1e3, r2.unit = n2[t2];
      break;
    default:
      r2.distance = e, r2.unit = n2.meter;
      break;
  }
  return r2;
};
var xr = (e, t2, n2) => {
  let r2 = Math.round(e * 3.28084 * 10) / 10, i2 = {
    distance: r2 / 5280,
    unit: n2.mile
  };
  switch (t2) {
    case "foot":
      i2.distance = r2, i2.unit = n2[t2];
      break;
    case "inch":
      i2.distance = r2 * 12, i2.unit = n2[t2];
      break;
    default:
      i2.distance = r2 / 5280, i2.unit = n2.mile;
      break;
  }
  return i2;
};
var Sr = (e, t2, n2, r2, i2, a2, o2, s2) => {
  if (e.geometry.type !== "LineString") return e;
  let c2 = e.geometry.coordinates, l2 = 0, u2 = [];
  for (let t3 = 0; t3 < c2.length - 1; t3++) {
    let n3 = c2[t3], r3 = c2[t3 + 1], i3 = _r(n3, r3, { units: "meters" });
    l2 += i3;
    let d3 = JSON.parse(JSON.stringify(e));
    if (d3.id = `${d3.id}-${t3}`, d3.geometry.coordinates = [n3, r3], d3.properties.originalId = e.id, d3.properties.distance = i3, d3.properties.total = l2, o2 === true && s2 === void 0) {
      let e2 = a2?.queryTerrainElevation(n3);
      e2 && (d3.properties.elevation_start = e2);
      let t4 = a2?.queryTerrainElevation(r3);
      t4 && (d3.properties.elevation_end = t4);
    }
    u2.push(d3);
  }
  e.properties.distance = u2[u2.length - 1].properties.total, e.properties.segments = u2;
  let d2 = vr(e.properties.distance, t2, r2, i2);
  return e.properties.distance = d2.distance, e.properties.unit = d2.unit, e.properties.segments.forEach((e2) => {
    let n3 = vr(e2.properties.distance, t2, r2, i2);
    e2.properties.distance = n3.distance, e2.properties.unit = n3.unit;
    let a3 = vr(e2.properties.total, t2, r2, i2);
    e2.properties.total = a3.distance, e2.properties.totalUnit = a3.unit;
  }), e.properties.distance = parseFloat(e.properties.distance.toFixed(n2)), e.properties.segments.forEach((e2) => {
    e2.properties.distance = parseFloat(e2.properties.distance.toFixed(n2)), e2.properties.total = parseFloat(e2.properties.total.toFixed(n2));
  }), e;
};
var Q = (e, t2 = "metric", n2 = Y) => t2 === "imperial" ? {
  elevation: e * 3.28084,
  unit: n2.foot
} : {
  elevation: e,
  unit: n2.meter
};
var Cr = (e) => e.charAt(0).toUpperCase() + e.slice(1);
var $ = [
  "{prefix}-point",
  "{prefix}-point-lower",
  "{prefix}-linestring",
  "{prefix}-polygon",
  "{prefix}-polygon-outline"
];
var wr = [
  ...$,
  Rn.polygonLayerSpec?.source,
  Rn.lineLayerLabelSpec?.source
];
var Tr = [
  ...$,
  X.routingLineLayerNodeLabelSpec?.source,
  X.routingLineLayerNodeSpec?.source,
  X.timeIsochronePolygonLayerSpec?.source,
  X.timeIsochroneLineLayerSpec?.source,
  X.timeIsochroneLabelLayerSpec?.source,
  X.distanceIsochronePolygonLayerSpec?.source,
  X.distanceIsochroneLineLayerSpec?.source,
  X.distanceIsochroneLabelLayerSpec?.source
];
var Er = (e, t2, n2 = $, r2 = "td") => {
  n2 = n2.map((e2) => e2.replace("{prefix}", r2));
  let i2 = JSON.parse(JSON.stringify(e));
  return t2 && (t2.onlyTerraDrawLayers === true ? (i2.layers = i2.layers.filter((e2) => "source" in e2 && n2.includes(e2.source)), Object.keys(i2.sources).forEach((e2) => {
    n2.includes(e2) || delete i2.sources[e2];
  })) : t2.excludeTerraDrawLayers === true && (i2.layers = i2.layers.filter((e2) => "source" in e2 && !n2.includes(e2.source) || e2.type === "background"), Object.keys(i2.sources).forEach((e2) => {
    n2.includes(e2) && delete i2.sources[e2];
  }))), i2;
};
var Dr = (e, t2 = 250) => {
  let n2;
  return (...r2) => {
    clearTimeout(n2), n2 = setTimeout(() => e(...r2), t2);
  };
};
var Or = class {
  constructor(e = 1e3, t2) {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "maxSize");
    __publicField(this, "ttl");
    this.maxSize = e, this.ttl = t2;
  }
  get(e) {
    let t2 = this.cache.get(e);
    if (t2) {
      if (t2.expiry && Date.now() > t2.expiry) {
        this.cache.delete(e);
        return;
      }
      return t2.value;
    }
  }
  set(e, t2) {
    if (this.maxSize === 0) return;
    if (this.cache.size >= this.maxSize) {
      let e2 = this.cache.keys().next().value;
      e2 && this.cache.delete(e2);
    }
    let n2 = this.ttl ? Date.now() + this.ttl : void 0;
    this.cache.set(e, {
      value: t2,
      expiry: n2
    });
  }
  has(e) {
    return this.get(e) !== void 0;
  }
  delete(e) {
    return this.cache.delete(e);
  }
  clear() {
    this.cache.clear();
  }
  get size() {
    return this.cache.size;
  }
  cleanupExpired() {
    if (!this.ttl) return;
    let e = Date.now();
    for (let [t2, n2] of this.cache.entries()) n2.expiry && e > n2.expiry && this.cache.delete(t2);
  }
  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
};
var kr = class {
  constructor(e, t2) {
    __publicField(this, "className");
    __publicField(this, "dialog");
    __publicField(this, "title");
    this.className = e, this.title = t2;
  }
  create(e, t2) {
    let n2 = document.getElementsByClassName(this.className);
    n2.length > 0 && Array.from(n2).forEach((e2) => {
      e2.remove();
    }), this.dialog = document.createElement("dialog"), this.dialog.classList.add(this.className);
    let r2 = document.createElement("div");
    r2.classList.add("dialog-header");
    let i2 = document.createElement("h3");
    i2.textContent = this.title, i2.classList.add("dialog-title"), r2.appendChild(i2);
    let a2 = document.createElement("button");
    a2.type = "button", a2.classList.add("close-button"), a2.innerHTML = "\xD7", a2.setAttribute("aria-label", "Close dialog"), a2.addEventListener("click", () => {
      this.close();
    }), r2.appendChild(a2), this.dialog.appendChild(r2);
    let o2 = document.createElement("div");
    o2.classList.add("content"), this.dialog.appendChild(t2(o2)), this.dialog.addEventListener("click", (e2) => {
      let t3 = e2.target?.getBoundingClientRect();
      t3 && (t3.left > e2.clientX || t3.right < e2.clientX || t3.top > e2.clientY || t3.bottom < e2.clientY) && this.close();
    }), e.appendChild(this.dialog);
  }
  open() {
    this.dialog?.showModal();
  }
  close() {
    this.dialog?.close();
  }
  createSegmentButtons(e, t2, n2 = () => {
  }) {
    let r2 = document.createElement("div");
    return r2.classList.add("segment-buttons"), e.forEach((e2) => {
      let i2 = document.createElement("button");
      i2.type = "button", i2.classList.add("segment-button"), i2.value = e2.value, i2.textContent = e2.label, e2.value === t2 && i2.classList.add("active"), i2.addEventListener("click", () => {
        r2.querySelectorAll(".segment-button").forEach((e3) => e3.classList.remove("active")), i2.classList.add("active"), n2(i2.value);
      }), r2.appendChild(i2);
    }), r2;
  }
};
var Ar = (e, t2, n2, r2, i2 = "metric", a2 = Y) => {
  if (e.geometry.type !== "Point") return e;
  let o2 = e.geometry.coordinates;
  if (n2 === true) {
    if (r2 === void 0) {
      let n3 = t2?.queryTerrainElevation(o2);
      if (n3) {
        let { elevation: t3, unit: r3 } = Q(n3, i2, a2);
        e.properties.elevation = t3, e.properties.elevationUnit = r3;
      }
    } else if (e.properties.elevation !== void 0 && typeof e.properties.elevation == "number") {
      let t3 = e.properties.elevation, n3 = e.properties.elevationUnit;
      (n3 === "ft" || n3 === "foot") && (t3 /= 3.28084);
      let { elevation: r3, unit: o3 } = Q(t3, i2, a2);
      e.properties.elevation = r3, e.properties.elevationUnit = o3;
    }
  }
  return e;
};
var jr = Object.defineProperty;
var Mr = (e, t2, n2) => t2 in e ? jr(e, t2, {
  enumerable: true,
  configurable: true,
  writable: true,
  value: n2
}) : e[t2] = n2;
var Nr = (e, t2, n2) => Mr(e, typeof t2 == "symbol" ? t2 : t2 + "", n2);
var Pr = 2 * Math.PI * 6378137 / 2;
function Fr(e) {
  return e || (e = 256), 2 * Math.PI * 6378137 / e;
}
function Ir(e, t2, n2 = {
  enable: true,
  decimal: 1
}) {
  e = Gr(e);
  var r2 = e[0], i2 = e[1], a2 = r2 * Pr / 180, o2 = Math.log(Math.tan((90 + i2) * Math.PI / 360)) / (Math.PI / 180);
  return o2 = o2 * Pr / 180, n2.enable && (a2 = Number(a2.toFixed(n2.decimal)), o2 = Number(o2.toFixed(n2.decimal))), [a2, o2];
}
function Lr(e, t2, n2) {
  var r2 = e[0], i2 = e[1], a2 = Kr(t2, n2);
  return [
    (r2 + Pr) / a2,
    (i2 + Pr) / a2,
    t2
  ];
}
function Rr(e, t2, n2) {
  return e = Gr(e), Br(Lr(Ir(e), t2));
}
function zr(e, t2, n2) {
  return e = Gr(e), t2 === 0 ? [
    0,
    0,
    0
  ] : Vr(Rr(e, t2));
}
function Br(e, t2, n2) {
  t2 || (t2 = 256);
  var r2 = e[0], i2 = e[1], a2 = e[2];
  if (a2 === 0) return [
    0,
    0,
    0
  ];
  Wr(a2);
  var o2 = Math.ceil(r2 / t2) - 1, s2 = Math.ceil(i2 / t2) - 1;
  return o2 < 0 && (o2 = 0), s2 < 0 && (s2 = 0), [
    o2,
    s2,
    a2
  ];
}
function Vr(e, t2) {
  Hr(e);
  var n2 = e[0], r2 = e[1], i2 = e[2];
  return i2 === 0 ? [
    0,
    0,
    0
  ] : [
    n2,
    2 ** i2 - 1 - r2,
    i2
  ];
}
function Hr(e, t2) {
  var n2 = e[0], r2 = e[1], i2 = e[2];
  if (i2 == null) throw Error("<zoom> is required");
  if (n2 == null) throw Error("<x> is required");
  if (r2 == null) throw Error("<y> is required");
  return i2 = Wr(i2), e = Ur(e), e;
}
function Ur(e) {
  var t2 = e[0], n2 = e[1], r2 = e[2], i2 = 2 ** r2;
  return t2 %= i2, t2 < 0 && (t2 += i2), [
    t2,
    n2,
    r2
  ];
}
function Wr(e) {
  if (e === false) return e;
  if (e == null) throw Error("<zoom> is required");
  if (e < 0) throw Error("<zoom> cannot be less than 0");
  if (e > 32) throw Error("<zoom> cannot be greater than 32");
  return e;
}
function Gr(e, t2) {
  var n2 = Jr(e[0]), r2 = qr(e[1]);
  return r2 > 85 && (r2 = 85), r2 < -85 && (r2 = -85), [n2, r2];
}
function Kr(e, t2) {
  return Fr(t2) / 2 ** e;
}
function qr(e) {
  if (e == null) throw Error("lat is required");
  return (e > 90 || e < -90) && (e %= 180, e > 90 && (e = -180 + e), e < -90 && (e = 180 + e), e === 0 && (e = 0)), e;
}
function Jr(e) {
  if (e == null) throw Error("lng is required");
  return (e > 180 || e < -180) && (e %= 360, e > 180 && (e = -360 + e), e < -180 && (e = 360 + e), e === 0 && (e = 0)), e;
}
var Yr = class {
  constructor(e, t2, n2, r2, i2) {
    Nr(this, "url"), Nr(this, "tileSize"), Nr(this, "tms"), Nr(this, "minzoom"), Nr(this, "maxzoom"), this.url = e, this.tileSize = t2, this.tms = i2, this.minzoom = n2, this.maxzoom = r2, this.tms = i2;
  }
  getValue(e, t2) {
    return new Promise((n2, r2) => {
      let i2 = e[0], a2 = e[1], o2 = t2;
      t2 > this.maxzoom ? o2 = this.maxzoom : t2 < this.minzoom && (o2 = this.minzoom);
      let s2 = this.tms ? Rr([i2, a2], o2) : zr([i2, a2], o2), c2 = this.url.replace(/{x}/g, s2[0].toString()).replace(/{y}/g, s2[1].toString()).replace(/{z}/g, s2[2].toString()), l2 = this.getUrlExtension(c2);
      switch (l2 || (l2 = "png"), l2) {
        case "png":
        case "webp":
          this.getValueFromRaster(c2, s2, i2, a2).then((e2) => {
            n2(e2);
          });
          break;
        default:
          r2(/* @__PURE__ */ Error(`Invalid file extension: ${l2}`));
          break;
      }
    });
  }
  async getValueFromRaster(e, t2, n2, r2) {
    let i2 = await fetch(e);
    if (!i2.ok) {
      if (i2.status === 404) return;
      throw Error(`Failed to fetch tile: ${i2.statusText}`);
    }
    let a2 = await i2.blob();
    return new Promise((e2, i3) => {
      let o2 = new Image();
      o2.onload = () => {
        let a3 = document.createElement("canvas");
        a3.width = o2.width, a3.height = o2.height;
        let s2 = a3.getContext("2d");
        if (!s2) return i3(/* @__PURE__ */ Error("Failed to create canvas context"));
        s2.drawImage(o2, 0, 0);
        let c2 = s2.getImageData(0, 0, o2.width, o2.height).data, l2 = this.pixels2rgba(new Uint8Array(c2), t2, n2, r2);
        e2(this.calc(l2[0], l2[1], l2[2], l2[3]));
      }, o2.onerror = () => e2(void 0), o2.src = URL.createObjectURL(a2);
    });
  }
  pixels2rgba(e, t2, n2, r2) {
    let i2 = [];
    for (let t3 = 0; t3 < e.length; t3 += 4) {
      let n3 = [
        e[t3],
        e[t3 + 1],
        e[t3 + 2],
        e[t3 + 3]
      ];
      i2.push(n3);
    }
    let a2 = this.tileToBBOX(t2), o2 = this.getPixelPosition(n2, r2, a2);
    return i2[o2[0] + o2[1] * this.tileSize];
  }
  getPixelPosition(e, t2, n2) {
    let r2 = this.tileSize, i2 = this.tileSize, a2 = n2[2] - n2[0], o2 = n2[3] - n2[1], s2 = (e - n2[0]) / a2, c2 = (t2 - n2[1]) / o2;
    return [Math.floor(r2 * s2), Math.floor(i2 * (1 - c2))];
  }
  getUrlExtension(e) {
    let t2 = e.split(/[#?]/)[0].split(".").pop();
    return t2 && (t2 = t2.trim()), t2;
  }
  tileToBBOX(e) {
    let t2 = this.tile2lon(e[0] + 1, e[2]);
    return [
      this.tile2lon(e[0], e[2]),
      this.tile2lat(e[1] + 1, e[2]),
      t2,
      this.tile2lat(e[1], e[2])
    ];
  }
  tile2lon(e, t2) {
    return e / 2 ** t2 * 360 - 180;
  }
  tile2lat(e, t2) {
    let n2 = 180 / Math.PI, r2 = Math.PI - 2 * Math.PI * e / 2 ** t2;
    return n2 * Math.atan(0.5 * (Math.exp(r2) - Math.exp(-r2)));
  }
};
var Xr = class extends Yr {
  constructor(e, t2, n2 = 5, r2 = 15, i2 = false) {
    super(e, t2, n2, r2, i2);
  }
  async getElevation(e, t2) {
    return await this.getValue(e, t2);
  }
  calc(e, t2, n2) {
    return -1e4 + (e * 256 * 256 + t2 * 256 + n2) * 0.1;
  }
};
var Zr = class extends Yr {
  constructor(e, t2, n2 = 5, r2 = 15, i2 = false) {
    super(e, t2, n2, r2, i2);
  }
  async getElevation(e, t2) {
    return await this.getValue(e, t2);
  }
  calc(e, t2, n2) {
    let r2 = e * 256 + t2 + n2 / 256 - 32768;
    return parseInt(r2.toFixed(0));
  }
};
var Qr = (e, t2 = 8) => {
  let [n2, r2] = e, i2 = 10 ** t2;
  return `${Math.round(n2 * i2) / i2},${Math.round(r2 * i2) / i2}`;
};
var $r = async (e, t2, n2, r2, i2 = "metric", a2 = Y) => {
  let o2 = [], s2 = {
    enabled: true,
    maxSize: 1e3,
    ttl: 3600 * 1e3,
    precision: 6,
    ...n2
  }, c2;
  s2.enabled && (c2 = r2 || new Or(s2.maxSize, s2.ttl));
  let l2, u2 = 15;
  if (t2) {
    let e2 = t2.url, n3 = t2.encoding ?? "mapbox", r3 = t2.tileSize ?? 512, i3 = t2.minzoom ?? 5;
    u2 = t2.maxzoom ?? 15;
    let a3 = t2.tms ?? false;
    l2 = n3 === "mapbox" ? new Xr(e2, r3, i3, u2, a3) : new Zr(e2, r3, i3, u2, a3);
  }
  for (let t3 of e) o2.push(new Promise((e2) => {
    t3.geometry.type !== "Point" && e2(t3);
    let n3 = t3.geometry.coordinates, r3 = Qr(n3, s2.precision);
    if (c2) {
      let n4 = c2.get(r3);
      if (n4 !== void 0) {
        if (!isNaN(n4)) {
          let { elevation: e3, unit: r4 } = Q(n4, i2, a2);
          t3.properties.elevation = e3, t3.properties.elevationUnit = r4;
        }
        e2(t3);
        return;
      }
    }
    l2 ? l2.getElevation(t3.geometry.coordinates, u2).then((n4) => {
      if (n4 != null && typeof n4 == "number") {
        c2 && c2.set(r3, n4);
        let { elevation: e3, unit: o3 } = Q(n4, i2, a2);
        t3.properties.elevation = e3, t3.properties.elevationUnit = o3;
      }
      e2(t3);
    }).catch(() => {
      c2 && c2.has(r3) && c2.delete(r3), e2(t3);
    }) : e2(t3);
  }));
  return await Promise.all(o2);
};
var oi = class {
  constructor(e) {
    __publicField(this, "controlContainer");
    __publicField(this, "map");
    __publicField(this, "modeButtons", {});
    __publicField(this, "_isExpanded", false);
    __publicField(this, "_cssPrefix", "");
    __publicField(this, "terradraw");
    __publicField(this, "options");
    __publicField(this, "events", {});
    __publicField(this, "defaultMode", "render");
    this.modeButtons = {}, this.options = {
      ...Pn,
      modes: [...Pn.modes ?? []],
      ...e
    };
    let t2 = this.options.adapterOptions?.prefixId ?? "td";
    this.options.adapterOptions || (this.options.adapterOptions = {}), this.options.adapterOptions?.prefixId || (this.options.adapterOptions.prefixId = t2), this.options.undoRedo || (this.options.undoRedo = {
      modeLevel: new En({ maxStackSize: 100 }),
      sessionLevel: new Dn({ maxStackSize: 100 }),
      keyboardShortcuts: new Cn()
    });
  }
  get isExpanded() {
    return this._isExpanded;
  }
  get cssPrefix() {
    return this._cssPrefix;
  }
  set isExpanded(e) {
    this._isExpanded = e;
    let t2 = document.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}add-control`);
    for (let e2 = 0; e2 < t2.length; e2++) {
      let n3 = t2.item(e2);
      n3 && (this.isExpanded ? n3.classList.remove("hidden") : n3.classList.add("hidden"));
    }
    let n2 = document.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}render-button`);
    n2 && n2.length > 0 && (this.isExpanded ? n2.item(0)?.classList.add("enabled") : (n2.item(0)?.classList.remove("enabled"), this.resetActiveMode())), this.toggleDeleteSelectionButton(), this.toggleButtonsWhenNoFeature(), this.isExpanded ? this.dispatchEvent("expanded") : this.dispatchEvent("collapsed");
  }
  get showDeleteConfirmation() {
    return this.options.showDeleteConfirmation === true;
  }
  set showDeleteConfirmation(e) {
    this.options.showDeleteConfirmation = e;
  }
  getDefaultPosition() {
    return "top-right";
  }
  onAdd(e) {
    if (this.options && this.options.modes && this.options.modes.length === 0) throw Error("At least a mode must be enabled.");
    this.map = e;
    let t2 = Un(), n2 = [];
    return this.options?.modes?.forEach((e2) => {
      if (this.options.modeOptions && this.options.modeOptions[e2]) {
        let r2 = this.options.modeOptions[e2];
        if (e2 === "select") {
          let n3 = t2[e2];
          if (n3) {
            let e3 = n3.flags;
            Object.keys(e3).forEach((t3) => {
              r2.flags[t3] || (r2.flags[t3] = e3[t3]);
            });
          }
        }
        n2.push(r2);
      } else t2[e2] && n2.push(t2[e2]);
    }), n2.forEach((e2) => {
      e2.state !== "unregistered" && (e2._state = "unregistered");
    }), this.options?.modes?.includes("render") || (n2.push(new V({
      modeName: "default",
      styles: {}
    })), this.defaultMode = "default"), this.isExpanded = this.options.open === true, this.terradraw = new kn({
      adapter: new jn({
        map: e,
        ...this.options.adapterOptions
      }),
      modes: n2,
      undoRedo: this.options.undoRedo
    }), this.map?.loaded() ? this.terradraw.start() : this.map?.once("load", () => {
      this.terradraw?.start();
    }), this.controlContainer = document.createElement("div"), this.controlContainer.classList.add("maplibregl-ctrl"), this.controlContainer.classList.add("maplibregl-ctrl-group"), n2.forEach((e2) => {
      e2.mode !== "default" && this.addTerradrawButton(e2.mode);
    }), Object.values(this.modeButtons).forEach((e2) => {
      this.controlContainer?.appendChild(e2);
    }), this.toggleButtonsWhenNoFeature(), this.terradraw?.on("finish", this.toggleButtonsWhenNoFeature.bind(this)), this.terradraw?.on("history", this.handleHistoryChange.bind(this)), this.map.once("idle", () => {
      this.toggleButtonsWhenNoFeature();
    }), this.controlContainer;
  }
  onRemove() {
    !this.controlContainer || !this.controlContainer.parentNode || !this.map || (this.deactivate(), this.modeButtons = {}, this.terradraw = void 0, this.map = void 0, this.controlContainer.parentNode.removeChild(this.controlContainer));
  }
  on(e, t2) {
    this.events[e] ? this.events[e].push(t2) : this.events[e] = [t2];
  }
  off(e, t2) {
    if (!this.events[e]) return;
    let n2 = this.events[e].findIndex((e2) => e2 === t2);
    n2 !== -1 && this.events[e].splice(n2, 1);
  }
  dispatchEvent(e, t2) {
    this.events[e] && this.events[e].forEach((e2) => {
      let n2 = this.terradraw?.getSnapshot()?.filter((e3) => e3.properties.selected === true);
      e2({
        feature: n2,
        mode: this.terradraw?.getMode(),
        ...t2
      });
    });
  }
  activate() {
    this.terradraw && (this.terradraw.enabled || this.terradraw.start());
  }
  deactivate() {
    this.terradraw && this.terradraw.enabled && (this.resetActiveMode(), this.dispatchEvent("mode-changed"), this.terradraw.stop());
  }
  handleModeChange(e, t2) {
    let n2 = t2.setMode(e);
    return this.syncButtonStates(e), e !== this.defaultMode && this.activate(), this.dispatchEvent("mode-changed"), n2;
  }
  syncButtonStates(e) {
    if (!this.controlContainer) return;
    let t2 = this.controlContainer.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}add-control`);
    for (let e2 = 0; e2 < t2.length; e2++) {
      let n2 = t2.item(e2);
      n2 && n2.classList.remove("active");
    }
    if (e !== this.defaultMode && e !== "render") {
      let t3 = this.controlContainer.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}add-${e}-button`);
      t3 && t3.length > 0 && t3[0].classList.add("active");
    }
    this.toggleDeleteSelectionButton(), this.toggleButtonsWhenNoFeature();
  }
  getTerraDrawInstance() {
    return this.terradraw ? new Proxy(this.terradraw, { get: (e, t2, n2) => t2 === "setMode" ? (t3) => this.handleModeChange(t3, e) : t2 === "clearUndoRedoHistory" ? () => {
      e.clearUndoRedoHistory(), this.handleHistoryChange({
        undoSize: 0,
        redoSize: 0
      });
    } : Reflect.get(e, t2, n2) }) : this.terradraw;
  }
  handleHistoryChange(e) {
    if (!this.controlContainer) return;
    let t2 = this.controlContainer.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}undo-button`);
    for (let n3 = 0; n3 < t2.length; n3++) {
      let r2 = t2.item(n3);
      r2 && (r2.disabled = e.undoSize === 0);
    }
    let n2 = this.controlContainer.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}redo-button`);
    for (let t3 = 0; t3 < n2.length; t3++) {
      let r2 = n2.item(t3);
      r2 && (r2.disabled = e.redoSize === 0);
    }
  }
  toggleEditor() {
    this.terradraw && (this.isExpanded = !this.isExpanded);
  }
  resetActiveMode() {
    this.terradraw && (this.terradraw.enabled || this.terradraw.start(), this.terradraw?.setMode(this.defaultMode), this.syncButtonStates(this.defaultMode));
  }
  addTerradrawButton(e) {
    let t2 = document.createElement("button");
    if (t2.type = "button", this.modeButtons[e] = t2, e === "render") t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}${e}-button`), this.isExpanded && t2.classList.add("enabled"), t2.type = "button", t2.title = Cr("expand or collapse drawing tool"), t2.addEventListener("click", this.toggleEditor.bind(this));
    else if (t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}add-control`), this.isExpanded || t2.classList.add("hidden"), t2.title = Cr(e.replace(/-/g, " ")), e === "delete") t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}${e}-button`), t2.addEventListener("click", this.handleDeleteAllFeatures.bind(this));
    else if (e === "delete-selection") t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}${e}-button`), t2.classList.add("hidden-delete-selection"), t2.addEventListener("click", this.handleDeleteSelectedFeatures.bind(this));
    else if (e === "download") t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}${e}-button`), t2.addEventListener("click", this.handleDownload.bind(this));
    else if (["undo", "redo"].includes(e)) t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}${e}-button`), t2.disabled = true, t2.addEventListener("click", () => {
      this.terradraw && (e === "undo" ? this.terradraw.undo() : this.terradraw.redo());
    });
    else if (t2.classList.add(`maplibregl-terradraw-${this.cssPrefix}add-${e}-button`), t2.addEventListener("click", () => {
      if (!this.terradraw) return;
      let n2 = t2.classList.contains("active");
      this.activate(), this.resetActiveMode(), n2 || (this.terradraw.setMode(e), this.syncButtonStates(e)), this.dispatchEvent("mode-changed");
    }), e === "text") {
      let e2 = this.getTextModeStyling(), t3 = this.map;
      this.createTerradrawTextLayer(t3, e2), this.terradraw?.on("change", () => {
        this.createTerradrawTextLayer(t3, e2);
      }), this.terradraw?.on("select", (e3) => {
        this.selectTextLabelLayer(e3), this.terradraw?.on("change", () => {
          let e4 = (this.terradraw?.getSnapshot() ?? []).filter((e5) => e5.properties?.mode === "text" && e5.properties?.text), n2 = this.options.adapterOptions?.prefixId ?? "td";
          t3.getSource(`${n2}-text`)?.setData({
            type: "FeatureCollection",
            features: e4
          });
        });
      }), this.terradraw?.on("deselect", () => {
        this.resetTextLabelLayer();
      });
    }
  }
  getFeatures(e = false) {
    if (!this.terradraw) return;
    let t2 = {
      type: "FeatureCollection",
      features: (this.terradraw?.getSnapshot()).filter((e2) => e2.properties.mode !== "select")
    };
    return e === true && (t2.features = t2.features.filter((e2) => e2.properties.selected === true)), t2;
  }
  cleanStyle(e, t2) {
    return Er(e, t2, $, this.options.adapterOptions?.prefixId);
  }
  showDeleteConfirmationDialog(e) {
    let t2 = new kr("maplibre-terradraw-delete-confirmation-dialog", "Delete All Features");
    t2.create(document.body, (n2) => {
      let r2 = document.createElement("p");
      r2.textContent = "Are you sure you want to delete all features?", n2.appendChild(r2);
      let i2 = document.createElement("div");
      i2.classList.add("dialog-buttons");
      let a2 = document.createElement("button");
      a2.type = "button", a2.textContent = "Cancel", a2.classList.add("dialog-button-cancel"), a2.addEventListener("click", () => {
        t2.close();
      });
      let o2 = document.createElement("button");
      return o2.type = "button", o2.textContent = "Delete", o2.classList.add("dialog-button-delete"), o2.addEventListener("click", () => {
        e(), t2.close();
      }), i2.appendChild(a2), i2.appendChild(o2), n2.appendChild(i2), n2;
    }), t2.open();
  }
  handleDeleteAllFeatures() {
    if (!this.terradraw || !this.terradraw.enabled) return;
    let e = () => {
      this.terradraw?.clear(), this.clearTextLayers(), this.resetActiveMode(), this.toggleDeleteSelectionButton(), this.toggleButtonsWhenNoFeature(), this.dispatchEvent("feature-deleted");
    };
    this.options.showDeleteConfirmation === true ? this.showDeleteConfirmationDialog(e) : e();
  }
  handleDeleteSelectedFeatures() {
    if (!this.terradraw || !this.terradraw.enabled) return;
    let e = (this.terradraw?.getSnapshot()).filter((e2) => e2.properties.selected === true);
    if (e.length > 0) {
      let t2 = e.map((e2) => e2.id);
      this.terradraw.removeFeatures(t2);
      for (let e2 of t2) this.terradraw.deselectFeature(e2);
      this.dispatchEvent("feature-deleted", { deletedIds: t2 }), this.deleteSelectedTextSymbolLayer(e);
    }
    this.toggleDeleteSelectionButton(), this.toggleButtonsWhenNoFeature();
  }
  deleteSelectedTextSymbolLayer(e) {
    let t2 = e.some((e2) => e2.properties.mode === "text"), n2 = this.options.adapterOptions?.prefixId ?? "td";
    if (t2) {
      let e2 = this.terradraw?.getSnapshot().filter((e3) => e3.properties?.mode === "text" && e3.properties?.text);
      this.map?.getSource(`${n2}-text`)?.setData({
        type: "FeatureCollection",
        features: e2
      });
    }
  }
  handleDownload() {
    let e = this.getFeatures(false), t2 = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(e)), n2 = document.createElement("a");
    n2.setAttribute("href", t2), n2.setAttribute("download", "data.geojson"), document.body.appendChild(n2), n2.click(), n2.remove();
  }
  toggleButtonsWhenNoFeature() {
    if (!this.controlContainer) return;
    let e = this.terradraw?.getSnapshot()?.filter((e2) => e2.properties.mode !== "select"), t2 = !!(e && e.length > 0), n2 = [
      `maplibregl-terradraw-${this.cssPrefix}add-select-button`,
      `maplibregl-terradraw-${this.cssPrefix}download-button`,
      `maplibregl-terradraw-${this.cssPrefix}delete-button`
    ];
    for (let e2 of n2) {
      let n3 = this.controlContainer.getElementsByClassName(e2);
      for (let e3 = 0; e3 < n3.length; e3++) {
        let r2 = n3.item(e3);
        r2 && (r2.disabled = !t2);
      }
    }
  }
  toggleDeleteSelectionButton() {
    let e = this.terradraw?.enabled || false, t2 = this.terradraw?.getMode(), n2 = this.getFeatures(false), r2 = n2 && n2.features.length > 0, i2 = r2 && e && t2 === "select", a2 = document.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}delete-selection-button`);
    for (let e2 = 0; e2 < a2.length; e2++) {
      let t3 = a2.item(e2);
      t3 && (i2 ? t3.classList.remove("hidden-delete-selection") : t3.classList.add("hidden-delete-selection"));
    }
    if (!r2) {
      let e2 = document.getElementsByClassName(`maplibregl-terradraw-${this.cssPrefix}add-select-button`);
      for (let t3 = 0; t3 < e2.length; t3++) {
        let n3 = e2.item(t3);
        n3 && n3.classList.remove("active");
      }
    }
  }
  clearExtendedFeatures(e, t2 = void 0) {
    if (this.map) for (let n2 of e) {
      let e2 = this.map.getStyle().sources[n2];
      e2 && typeof e2.data != "string" && e2.data.type === "FeatureCollection" && (t2 === void 0 ? e2.data.features = [] : e2.data.features = e2.data.features.filter((e3) => e3.properties?.originalId ? !t2.includes(e3.properties.originalId) : !t2.includes(e3.id)), this.map.getSource(n2)?.setData(e2.data));
    }
  }
  createTerradrawTextLayer(e, t2) {
    let n2 = t2 ?? this.getTextModeStyling(), r2 = this.terradraw?.getSnapshot()?.filter((e2) => e2.properties?.mode === "text" && e2.properties?.text) ?? [];
    this.addTextFeaturesToSource(r2, e, n2);
    let i2 = this.options.adapterOptions?.prefixId ?? "td";
    e.moveLayer(`${i2}-text-labels`);
  }
  addTextFeaturesToSource(e, t2, n2) {
    let r2 = this.options.adapterOptions?.prefixId ?? "td", i2 = t2.getSource(`${r2}-text`);
    i2 ? i2.setData({
      type: "FeatureCollection",
      features: e
    }) : (t2.addSource(`${r2}-text`, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: e
      }
    }), t2.addLayer({
      id: `${r2}-text-labels`,
      type: "symbol",
      source: `${r2}-text`,
      layout: {
        "text-field": ["get", "text"],
        "text-size": n2?.textSize ?? 12,
        "text-anchor": "top",
        "text-offset": [0, 0.8],
        "text-font": ["Noto Sans Regular"],
        "text-allow-overlap": true
      },
      paint: {
        "text-color": n2?.textColor ?? "#000000",
        "text-halo-color": n2?.textHaloColor ?? "#ffffff",
        "text-halo-width": n2?.textHaloWidth ?? 1
      }
    }));
  }
  getTextModeStyling() {
    let e = Un().text, t2 = this.options.modeOptions?.text, n2 = e?.options?.styles ?? {}, r2 = t2?.options?.styles ?? {};
    return {
      ...n2,
      ...r2
    };
  }
  selectTextLabelLayer(e) {
    let t2 = this.getTextModeStyling(), n2 = this.options.adapterOptions?.prefixId ?? "td", r2 = `${n2}-text-labels`;
    if (!this.map?.style?.getLayer(r2)) return;
    let i2 = (this.terradraw?.getSnapshot() ?? []).filter((e2) => e2.properties?.mode === "text" && e2.properties?.text);
    this.map?.getSource(`${n2}-text`)?.setData({
      type: "FeatureCollection",
      features: i2
    }), i2.some((t3) => t3.id === e) ? (this.map?.setLayoutProperty(r2, "text-size", [
      "case",
      [
        "==",
        ["get", "selected"],
        true
      ],
      t2.textSelectedSize ?? 14,
      t2.textSize ?? 12
    ]), this.map?.setPaintProperty(r2, "text-halo-color", [
      "case",
      [
        "==",
        ["get", "selected"],
        true
      ],
      t2.textSelectedHaloColor ?? "#ffffff",
      t2.textHaloColor ?? "#ffffff"
    ])) : this.resetTextLabelLayer();
  }
  resetTextLabelLayer() {
    let e = this.getTextModeStyling(), t2 = this.options.adapterOptions?.prefixId ?? "td", n2 = `${t2}-text-labels`;
    if (!this.map?.style?.getLayer(n2)) return;
    let r2 = (this.terradraw?.getSnapshot() ?? []).filter((e2) => e2.properties?.mode === "text" && e2.properties?.text);
    this.map?.getSource(`${t2}-text`)?.setData({
      type: "FeatureCollection",
      features: r2
    }), this.map?.setPaintProperty(n2, "text-color", e.textColor ?? "#000000"), this.map?.setPaintProperty(n2, "text-halo-color", e.textHaloColor ?? "#ffffff"), this.map?.setPaintProperty(n2, "text-halo-width", e.textHaloWidth ?? 1);
  }
  clearTextLayers() {
    let e = this.options.adapterOptions?.prefixId ?? "td", t2 = this.map?.getSource(`${e}-text`), n2 = this.map?.style?.getLayer(`${e}-text-labels`);
    this.map?.removeLayer(n2?.id), this.map?.removeSource(t2?.id);
  }
};
function si(e, t2 = {}) {
  let n2 = 0, r2 = 0, i2 = 0;
  return er(e, function(e2) {
    n2 += e2[0], r2 += e2[1], i2++;
  }, true), Xn([n2 / i2, r2 / i2], t2.properties);
}
var ci = class extends oi {
  constructor(e) {
    let { modeOptions: t2, ...n2 } = Rn, r2 = {
      ...JSON.parse(JSON.stringify(n2)),
      modeOptions: { ...t2 }
    };
    e && (r2 = Object.assign(r2, e));
    let i2 = r2.adapterOptions?.prefixId ?? "td-measure";
    r2.adapterOptions && !r2.adapterOptions?.prefixId && (r2.adapterOptions.prefixId = i2), r2.pointLayerLabelSpec.id = r2.pointLayerLabelSpec?.id.replace("{prefix}", i2), r2.pointLayerLabelSpec.source = r2.pointLayerLabelSpec?.source.replace("{prefix}", i2), r2.routingLineLayerNodeSpec.id = r2.routingLineLayerNodeSpec?.id.replace("{prefix}", i2), r2.routingLineLayerNodeSpec.source = r2.routingLineLayerNodeSpec?.source.replace("{prefix}", i2), r2.lineLayerLabelSpec.id = r2.lineLayerLabelSpec?.id.replace("{prefix}", i2), r2.lineLayerLabelSpec.source = r2.lineLayerLabelSpec?.source.replace("{prefix}", i2), r2.polygonLayerSpec.id = r2.polygonLayerSpec?.id.replace("{prefix}", i2), r2.polygonLayerSpec.source = r2.polygonLayerSpec?.source.replace("{prefix}", i2);
    super({
      modes: r2.modes,
      open: r2.open,
      modeOptions: r2.modeOptions,
      adapterOptions: r2.adapterOptions,
      undoRedo: r2.undoRedo
    });
    __publicField(this, "measureOptions");
    __publicField(this, "elevationCache");
    __publicField(this, "handleTerradrawDeselect", () => {
      if (this.map && this.computeElevation === true && this.measureOptions.terrainSource !== void 0) {
        let e = this.getTerraDrawInstance();
        if (!e) return;
        let t2 = e.getSnapshot(), n2 = t2.filter((e2) => e2.properties.mode && [
          "linestring",
          "freehand-linestring",
          "polyline"
        ].includes(e2.properties.mode) && e2.geometry.type === "LineString");
        if (n2.length > 0) for (let e2 of n2) this.computeElevationByLineFeatureID(e2.id);
        let r2 = t2.filter((e2) => ["point", "marker"].includes(e2.properties.mode) && e2.geometry.type === "Point");
        if (r2.length > 0) for (let e2 of r2) this.measurePoint(e2.id);
      }
    });
    __publicField(this, "handleTerradrawFeatureReady", Dr((e) => {
      if (!this.map || !this.terradraw) return;
      let t2 = this.terradraw.getSnapshotFeature(e);
      if (!t2) return;
      let n2 = t2.geometry.type, r2 = t2.properties.mode;
      [
        "linestring",
        "freehand-linestring",
        "polyline"
      ].includes(r2) && n2 === "LineString" ? this.measureLine(e, false) : ["point", "marker"].includes(r2) && n2 === "Point" ? this.measurePoint(e, false) : ![
        "point",
        "marker",
        "linestring",
        "freehand-linestring",
        "select",
        "render"
      ].includes(r2) && n2 === "Polygon" && this.measurePolygon(e, false);
    }, 300));
    __publicField(this, "computeElevationByLineFeatureID", async (e) => {
      if (this.map && this.computeElevation === true) {
        let t2 = this.map.getStyle().sources[this.measureOptions.lineLayerLabelSpec.source];
        if (t2 && typeof t2.data != "string" && t2.data.type === "FeatureCollection") {
          let n2 = t2.data.features.filter((t3) => t3.properties?.originalId === e && t3.geometry.type === "Point");
          if (n2 && n2.length > 0) {
            let e2 = await $r(n2, this.measureOptions.terrainSource, this.measureOptions.elevationCacheConfig, this.elevationCache, this.measureUnitType, this.measureUnitSymbols);
            this.replaceGeoJSONSource(e2, this.measureOptions.lineLayerLabelSpec.source, "linestring");
          }
        }
      }
    });
    this._cssPrefix = "measure-", this.measureOptions = r2, this.measureOptions.elevationCacheConfig && this.measureOptions.elevationCacheConfig?.enabled && (this.elevationCache = new Or(this.measureOptions.elevationCacheConfig.maxSize, this.measureOptions.elevationCacheConfig.ttl));
  }
  get measureUnitType() {
    return this.measureOptions.measureUnitType ?? "metric";
  }
  set measureUnitType(e) {
    let t2 = this.measureOptions.measureUnitType === e;
    this.measureOptions.measureUnitType = e, t2 || (this.computeElevation && this.recalculateElevationUnits(), this.recalc());
  }
  get distancePrecision() {
    return this.measureOptions.distancePrecision ?? 2;
  }
  set distancePrecision(e) {
    let t2 = this.measureOptions.distancePrecision === e;
    this.measureOptions.distancePrecision = e, t2 || this.recalc();
  }
  get distanceUnit() {
    return this.measureOptions.distanceUnit;
  }
  set distanceUnit(e) {
    let t2 = this.measureOptions.distanceUnit === e;
    this.measureOptions.distanceUnit = e, t2 || this.recalc();
  }
  get areaPrecision() {
    return this.measureOptions.areaPrecision ?? 2;
  }
  set areaPrecision(e) {
    let t2 = this.measureOptions.areaPrecision === e;
    this.measureOptions.areaPrecision = e, t2 || this.recalc();
  }
  get areaUnit() {
    return this.measureOptions.areaUnit;
  }
  set areaUnit(e) {
    let t2 = this.measureOptions.areaUnit === e;
    this.measureOptions.areaUnit = e, t2 || this.recalc();
  }
  get measureUnitSymbols() {
    return this.measureOptions.measureUnitSymbols ?? JSON.parse(JSON.stringify(Y));
  }
  set measureUnitSymbols(e) {
    let t2 = JSON.stringify(this.measureOptions.measureUnitSymbols) === JSON.stringify(e);
    this.measureOptions.measureUnitSymbols = e, t2 || this.recalc();
  }
  get computeElevation() {
    return this.measureOptions.computeElevation ?? false;
  }
  set computeElevation(e) {
    let t2 = this.measureOptions.computeElevation === e;
    this.measureOptions.computeElevation = e, t2 || this.recalc();
  }
  get fontGlyphs() {
    let e = [
      this.measureOptions.pointLayerLabelSpec,
      this.measureOptions.lineLayerLabelSpec,
      this.measureOptions.polygonLayerSpec
    ][0];
    return e && e.layout && e.layout["text-font"];
  }
  set fontGlyphs(e) {
    let t2 = [
      this.measureOptions.pointLayerLabelSpec,
      this.measureOptions.lineLayerLabelSpec,
      this.measureOptions.polygonLayerSpec
    ];
    for (let n2 of t2) n2 && n2.layout && (n2.layout["text-font"] = e), this.map && n2 && this.map.getLayer(n2.id) && this.map.setLayoutProperty(n2.id, "text-font", e);
  }
  onAdd(e) {
    return this.controlContainer = super.onAdd(e), this.controlContainer;
  }
  onRemove() {
    this.unregisterMesureControl(), super.onRemove();
  }
  activate() {
    super.activate(), this.registerMesureControl();
  }
  recalc() {
    let e = this.getTerraDrawInstance();
    if (e) {
      this.registerMesureControl();
      let t2 = e.getSnapshot();
      for (let e2 of t2) {
        let t3 = e2.id, n2 = e2.geometry.type, r2 = e2.properties.mode;
        [
          "linestring",
          "freehand-linestring",
          "polyline"
        ].includes(r2) && n2 === "LineString" ? this.measureLine(t3, false) : ["point", "marker"].includes(r2) && n2 === "Point" ? this.measurePoint(t3, false) : ![
          "point",
          "marker",
          "linestring",
          "freehand-linestring",
          "select",
          "render"
        ].includes(r2) && n2 === "Polygon" && this.measurePolygon(t3, false);
      }
    }
  }
  cleanStyle(e, t2) {
    let n2 = $, r2 = this.measureOptions.polygonLayerSpec?.source;
    r2 && n2.push(r2);
    let i2 = this.measureOptions.lineLayerLabelSpec?.source;
    return i2 && n2.push(i2), Er(e, t2, n2, this.measureOptions.adapterOptions?.prefixId);
  }
  registerMesureControl() {
    if (!this.map) return;
    let e = this.options.modes?.filter((e2) => [
      "linestring",
      "freehand-linestring",
      "polyline"
    ].includes(e2));
    this.options.modes?.find((e2) => ["point", "marker"].includes(e2)) && (this.map.getLayer(this.measureOptions.pointLayerLabelSpec.id) || this.map.addLayer(this.measureOptions.pointLayerLabelSpec)), e && e.length > 0 && (this.map.getSource(this.measureOptions.lineLayerLabelSpec.source) || this.map.addSource(this.measureOptions.lineLayerLabelSpec.source, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      }
    }), this.map.getLayer(this.measureOptions.routingLineLayerNodeSpec.id) || this.map.addLayer(this.measureOptions.routingLineLayerNodeSpec), this.map.getLayer(this.measureOptions.lineLayerLabelSpec.id) || this.map.addLayer(this.measureOptions.lineLayerLabelSpec));
    let t2 = this.options.modes?.filter((e2) => [
      "polygon",
      "rectangle",
      "angled-rectangle",
      "circle",
      "sector",
      "sensor",
      "freehand"
    ].includes(e2));
    if (t2 && t2.length > 0 && (this.map.getSource(this.measureOptions.polygonLayerSpec.source) || this.map.addSource(this.measureOptions.polygonLayerSpec.source, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      }
    }), this.map.getLayer(this.measureOptions.polygonLayerSpec.id) || this.map.addLayer(this.measureOptions.polygonLayerSpec)), e && e.length > 0 || t2 && t2.length > 0) {
      let e2 = this.getTerraDrawInstance();
      e2 && (e2.on("change", this.handleTerradrawFeatureChanged.bind(this)), e2.on("finish", this.handleTerradrawFeatureReady.bind(this)), e2.on("deselect", this.handleTerradrawDeselect.bind(this)), this.on("feature-deleted", this.onFeatureDeleted.bind(this)));
    }
  }
  handleTerradrawFeatureChanged(e, t2) {
    if (!this.map || t2 === "styling") return;
    let n2 = [
      this.measureOptions.lineLayerLabelSpec,
      this.measureOptions.routingLineLayerNodeSpec,
      this.measureOptions.polygonLayerSpec
    ].map((e2) => e2.source);
    if (t2 === "delete") {
      this.clearExtendedFeatures(n2, e);
      return;
    }
    let r2 = this.getTerraDrawInstance();
    if (r2) for (let t3 of e) {
      let e2 = r2.getSnapshotFeature(t3);
      if (e2) {
        let n3 = e2.geometry.type, r3 = e2.properties.mode;
        [
          "linestring",
          "freehand-linestring",
          "polyline"
        ].includes(r3) && n3 === "LineString" ? this.measureLine(t3, true) : ["point", "marker"].includes(r3) && n3 === "Point" ? this.measurePoint(t3, true) : ![
          "point",
          "marker",
          "linestring",
          "freehand-linestring",
          "select",
          "render"
        ].includes(r3) && n3 === "Polygon" && this.measurePolygon(t3, true);
      } else this.clearExtendedFeatures(n2, [t3]);
    }
  }
  unregisterMesureControl() {
    this.off("feature-deleted", this.onFeatureDeleted.bind(this)), this.map && (this.map.getLayer(this.measureOptions.pointLayerLabelSpec.id) && this.map.removeLayer(this.measureOptions.pointLayerLabelSpec.id), this.map.getLayer(this.measureOptions.lineLayerLabelSpec.id) && this.map.removeLayer(this.measureOptions.lineLayerLabelSpec.id), this.map.getLayer(this.measureOptions.routingLineLayerNodeSpec.id) && this.map.removeLayer(this.measureOptions.routingLineLayerNodeSpec.id), this.map.getLayer(this.measureOptions.polygonLayerSpec.id) && this.map.removeLayer(this.measureOptions.polygonLayerSpec.id), this.map.getSource(this.measureOptions.lineLayerLabelSpec.source) && this.map.removeSource(this.measureOptions.lineLayerLabelSpec.source), this.map.getSource(this.measureOptions.polygonLayerSpec.source) && this.map.removeSource(this.measureOptions.polygonLayerSpec.source));
  }
  replaceGeoJSONSource(e, t2, n2) {
    if (!this.map) return;
    let r2 = this.map.getStyle().sources[t2];
    if (r2 && typeof r2.data != "string" && r2.data.type === "FeatureCollection") {
      let i2 = [];
      for (let t3 of e) (this.terradraw?.getSnapshotFeature(t3.id) || this.terradraw?.getSnapshotFeature(t3.properties.originalId)) && i2.push(t3);
      let a2 = i2.map((e2) => e2.id);
      if (typeof r2.data != "string" && r2.data.type === "FeatureCollection") {
        n2 === "linestring" ? r2.data.features = [...r2.data.features = r2.data.features.filter((e3) => !(a2.includes(e3.properties?.originalId) && e3.geometry.type === "Point")), ...i2] : n2 === "point" && (r2.data.features = [...r2.data.features = r2.data.features.filter((e3) => !(a2.includes(e3.id) && e3.geometry.type === "Point")), ...i2]);
        let e2 = {};
        r2.data.features.forEach((t3) => {
          let n3 = t3.id;
          e2[n3] ? !e2[n3].properties.elevation && t3.properties?.elevation && (e2[n3] = t3) : e2[n3] = t3;
        }), r2.data.features = Array.from(Object.values(e2)), this.map.getSource(t2)?.setData(r2.data);
      }
    }
  }
  recalculateElevationUnits() {
    if (!this.map) return;
    let e = this.measureOptions.pointLayerLabelSpec.source;
    this.updateElevationUnitsInSource(e);
    let t2 = this.measureOptions.lineLayerLabelSpec.source;
    this.updateElevationUnitsInSource(t2);
  }
  updateElevationUnitsInSource(e) {
    if (!this.map) return;
    let t2 = this.map.getStyle().sources[e];
    if (t2 && typeof t2.data != "string" && t2.data.type === "FeatureCollection") {
      let n2 = false;
      for (let e2 of t2.data.features) if (e2.properties?.elevation !== void 0) {
        let t3 = e2.properties.elevationUnit, r2 = e2.properties.elevation;
        (t3 === "ft" || t3 === "foot") && (r2 /= 3.28084);
        let { elevation: i2, unit: a2 } = Q(r2, this.measureUnitType, this.measureUnitSymbols);
        e2.properties.elevation = i2, e2.properties.elevationUnit = a2, n2 = true;
      }
      n2 && this.map.getSource(e).setData(t2.data);
    }
  }
  async measurePolygon(e, t2 = false) {
    if (!this.map) return;
    let n2 = this.getTerraDrawInstance();
    if (!n2) return;
    let r2 = n2.getSnapshot()?.find((t3) => t3.id === e && t3.geometry.type === "Polygon");
    if (r2) {
      let n3 = this.map.getStyle().sources[this.measureOptions.polygonLayerSpec.source];
      if (n3) {
        typeof n3.data != "string" && n3.data.type === "FeatureCollection" && (n3.data.features = n3.data.features.filter((t3) => t3.properties?.originalId !== e));
        let i2 = JSON.parse(JSON.stringify(r2));
        i2.id += "-area-label", i2.geometry = si(r2.geometry).geometry, i2.properties.originalId = r2.id, r2 = mr(r2, this.measureUnitType, this.areaPrecision, this.areaUnit, this.measureUnitSymbols), i2.properties.area = r2.properties.area, i2.properties.unit = r2.properties.unit, t2 || this.terradraw?.updateFeatureProperties(e, {
          area: i2.properties.area,
          unit: i2.properties.unit
        }), typeof n3.data != "string" && n3.data.type === "FeatureCollection" && n3.data.features.push(i2), this.map.getSource(this.measureOptions.polygonLayerSpec.source)?.setData(n3.data), this.map.moveLayer(this.measureOptions.polygonLayerSpec.id, this.options.adapterOptions?.renderBelowLayerId), this.map.getLayer(this.measureOptions.lineLayerLabelSpec.id) && this.map.moveLayer(this.measureOptions.lineLayerLabelSpec.id), this.map.getLayer(this.measureOptions.routingLineLayerNodeSpec.id) && this.map.moveLayer(this.measureOptions.routingLineLayerNodeSpec.id, this.options.adapterOptions?.renderBelowLayerId), this.map.getLayer(this.measureOptions.pointLayerLabelSpec.id) && this.map.moveLayer(this.measureOptions.pointLayerLabelSpec.id, this.options.adapterOptions?.renderBelowLayerId);
      }
    }
  }
  measureLine(e, t2 = false) {
    if (!this.map) return;
    let n2 = this.getTerraDrawInstance();
    if (!n2) return;
    let r2 = n2.getSnapshotFeature(e);
    if (r2) {
      let n3 = this.map.getStyle().sources[this.measureOptions.lineLayerLabelSpec.source];
      if (n3) {
        typeof n3.data != "string" && n3.data.type === "FeatureCollection" && (n3.data.features = n3.data.features.filter((t3) => t3.properties?.originalId !== e)), r2 = Sr(r2, this.measureUnitType, this.distancePrecision, this.distanceUnit, this.measureUnitSymbols, this.map, this.computeElevation, this.measureOptions.terrainSource);
        let i2 = r2.properties.segments;
        for (let e2 = 0; e2 < i2.length; e2++) {
          let t3 = i2[e2], r3 = t3.geometry.coordinates, a2 = r3[0], o2 = r3[1];
          if (e2 === 0) {
            let r4 = JSON.parse(JSON.stringify(t3));
            r4.id = `${t3.id}-node-${e2}`, r4.geometry = {
              type: "Point",
              coordinates: a2
            }, r4.properties.distance = 0, r4.properties.total = 0, t3.properties.elevation_start && (r4.properties.elevation = t3.properties.elevation_start), typeof n3.data != "string" && n3.data.type === "FeatureCollection" && n3.data.features.push(r4);
          }
          let s2 = JSON.parse(JSON.stringify(t3));
          s2.id = `${t3.id}-node-${e2 + 1}`, s2.geometry = {
            type: "Point",
            coordinates: o2
          }, t3.properties.elevation_end && (s2.properties.elevation = t3.properties.elevation_end), typeof n3.data != "string" && n3.data.type === "FeatureCollection" && n3.data.features.push(s2);
        }
        if (!t2) {
          this.computeElevation === true && this.measureOptions.terrainSource !== void 0 && this.computeElevationByLineFeatureID(e);
          let t3 = i2[i2.length - 1].properties.totalUnit;
          this.terradraw?.updateFeatureProperties(e, {
            distance: r2.properties.distance,
            distanceUnit: t3,
            segments: r2.properties.segments
          });
        }
        this.map.getSource(this.measureOptions.lineLayerLabelSpec.source)?.setData(n3.data), this.map.getLayer(this.measureOptions.polygonLayerSpec.id) && this.map.moveLayer(this.measureOptions.polygonLayerSpec.id, this.options.adapterOptions?.renderBelowLayerId), this.map.moveLayer(this.measureOptions.lineLayerLabelSpec.id, this.options.adapterOptions?.renderBelowLayerId), this.map.moveLayer(this.measureOptions.routingLineLayerNodeSpec.id, this.options.adapterOptions?.renderBelowLayerId), this.map.getLayer(this.measureOptions.pointLayerLabelSpec.id) && this.map.moveLayer(this.measureOptions.pointLayerLabelSpec.id, this.options.adapterOptions?.renderBelowLayerId);
      }
    }
  }
  async measurePoint(e, t2 = false) {
    if (!this.map) return;
    let n2 = this.getTerraDrawInstance();
    if (!n2) return;
    let r2 = n2.getSnapshotFeature(e);
    if (r2) {
      let n3 = {
        elevation: void 0,
        elevationUnit: void 0
      };
      this.computeElevation && (r2 = this.measureOptions.terrainSource === void 0 ? Ar(r2, this.map, this.computeElevation, this.measureOptions.terrainSource, this.measureUnitType, this.measureUnitSymbols) : (await $r([r2], this.measureOptions.terrainSource, this.measureOptions.elevationCacheConfig, this.elevationCache, this.measureUnitType, this.measureUnitSymbols))[0], n3 = {
        elevation: r2.properties.elevation,
        elevationUnit: r2.properties.elevationUnit
      }), t2 || this.terradraw?.updateFeatureProperties(e, n3);
    }
  }
  onFeatureDeleted(e) {
    if (this.map && this.getTerraDrawInstance()) {
      let t2 = [];
      typeof e == "object" && e && "deletedIds" in e && (t2 = e.deletedIds);
      let n2 = [
        this.measureOptions.lineLayerLabelSpec,
        this.measureOptions.routingLineLayerNodeSpec,
        this.measureOptions.polygonLayerSpec
      ].map((e2) => e2.source);
      t2 && t2.length > 0 ? this.clearExtendedFeatures(n2, t2) : this.clearExtendedFeatures(n2, void 0);
    }
  }
};
export {
  ci as MaplibreMeasureControl,
  oi as MaplibreTerradrawControl
};
