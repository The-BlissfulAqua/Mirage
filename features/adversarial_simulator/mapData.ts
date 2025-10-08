// Fix: Define minimal GeoJSON types since @types/geojson is not available.
// This resolves the "Cannot find namespace 'GeoJSON'" error.
import { Sensor, DetectionRule, PointOfInterest, Scenario } from './types';

type GeoJSONPoint = [number, number];
type GeoJSONLineStringCoordinates = GeoJSONPoint[];
type GeoJSONPolygonCoordinates = GeoJSONLineStringCoordinates[];

interface GeoJSONPolygon {
    type: 'Polygon';
    coordinates: GeoJSONPolygonCoordinates;
}

interface GeoJSONLineString {
    type: 'LineString';
    coordinates: GeoJSONLineStringCoordinates;
}

type GeoJSONGeometry = GeoJSONPolygon | GeoJSONLineString;

interface GeoJSONFeature {
    type: 'Feature';
    properties: { [key: string]: any };
    geometry: GeoJSONGeometry;
}

interface GeoJSONFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
}

export const MAP_CENTER: [number, number] = [34.025, 75.315];
export const MAP_ZOOM = 15;

// --- Scenario 1 Data ---
const SCENARIO_1_SENSORS: Sensor[] = [
  { id: 'S01', type: 'camera', pos: [34.026, 75.318], range: 150, base_p: 0.8, weather_penalty: { fog: 0.4 } },
  { id: 'S02', type: 'camera', pos: [34.023, 75.310], range: 120, base_p: 0.75, weather_penalty: { fog: 0.3 } },
  { id: 'S03', type: 'acoustic', pos: [34.028, 75.312], range: 180, base_p: 0.6, weather_penalty: { fog: 0.9 } }, // Acoustic less affected by fog
];

const SCENARIO_1_RULES: DetectionRule[] = [
    {
        id: 'high_confidence_sighting_v1',
        type: 'high_confidence_sighting',
        params: { min_confidence: 0.85 }
    },
    {
        id: 'persistent_sighting_v1',
        type: 'persistent_sighting',
        params: { time_window_s: 10, min_detections: 3 }
    }
];

// --- Scenario 2 Data ---
const SCENARIO_2_SENSORS: Sensor[] = [
  { id: 'S11', type: 'camera', pos: [34.0225, 75.3135], range: 160, base_p: 0.85, weather_penalty: { fog: 0.4 } }, // Guards bridge
  { id: 'S12', type: 'camera', pos: [34.026, 75.321], range: 130, base_p: 0.8, weather_penalty: { fog: 0.3 } },   // Guards forest east exit
  { id: 'S13', type: 'camera', pos: [34.030, 75.311], range: 160, base_p: 0.85, weather_penalty: { fog: 0.4 } }, // Guards meadow north
];

const SCENARIO_2_RULES: DetectionRule[] = [
    {
        id: 'high_confidence_sighting_v2',
        type: 'high_confidence_sighting',
        params: { min_confidence: 0.80 } // More sensitive but less sophisticated initial rule
    },
];


// --- Shared Data ---
export const POINTS_OF_INTEREST: { [key: string]: PointOfInterest } = {
    Parking: { pos: [34.021, 75.320] },
    Meadow: { pos: [34.029, 75.310] },
    PatrolPost: { pos: [34.024, 75.316] },
    Viewpoint: { pos: [34.0285, 75.319] },
    Bridge: { pos: [34.022, 75.313] },
    Cafe: { pos: [34.027, 75.309] },
};

export const geoJsonFeatures: GeoJSONFeatureCollection = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Baisaran Meadow", "type": "meadow" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.308, 34.028], [75.312, 34.031], [75.314, 34.029], [75.310, 34.027], [75.308, 34.028]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Dense Forest", "type": "forest" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [75.315, 34.022], [75.322, 34.024], [75.320, 34.029], [75.313, 34.026], [75.315, 34.022]
            ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Main Trail", "type": "trail" },
      "geometry": {
        "type": "LineString",
        "coordinates": [
            [75.320, 34.021], [75.317, 34.023], [75.316, 34.025], [75.312, 34.027], [75.310, 34.028]
        ]
      }
    }
  ]
};

// --- Export Scenarios ---
export const SCENARIOS: Scenario[] = [
    {
        name: "Foothills Overwatch",
        sensors: SCENARIO_1_SENSORS,
        rules: SCENARIO_1_RULES,
    },
    {
        name: "Valley Choke Point",
        sensors: SCENARIO_2_SENSORS,
        rules: SCENARIO_2_RULES,
    }
];