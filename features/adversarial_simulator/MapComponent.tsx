import React, { useEffect, useRef } from 'react';
import { geoJsonFeatures, POINTS_OF_INTEREST, MAP_CENTER, MAP_ZOOM } from './mapData';
import { Actor, SensorEvent, Sensor } from './types';

// Leaflet is loaded from a script tag, so we need to declare it for TypeScript
declare const L: any;

interface MapComponentProps {
    actors: Actor[];
    events: SensorEvent[];
    sensors: Sensor[];
}

const MapComponent: React.FC<MapComponentProps> = ({ actors, events, sensors }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const actorMarkersRef = useRef<Map<string, any>>(new Map());
    const sensorLayerRef = useRef<any>(null); // To manage sensor visuals
    const traversedPathRef = useRef<any>(null);
    const plannedPathRef = useRef<any>(null);
    const eventVisualsRef = useRef<any[]>([]);

    // Initialize map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(MAP_CENTER, MAP_ZOOM);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            const geoJsonStyle = (feature: any) => {
                switch (feature.properties.type) {
                    case 'meadow': return { color: "#22c55e", weight: 1, opacity: 0.6, fillOpacity: 0.2 };
                    case 'forest': return { color: "#166534", weight: 1, opacity: 0.6, fillOpacity: 0.4 };
                    case 'trail': return { color: "#a16207", weight: 2, dashArray: '4, 4' };
                    default: return { color: "#ffffff" };
                }
            };
            
            L.geoJSON(geoJsonFeatures, { style: geoJsonStyle }).addTo(map);

            Object.entries(POINTS_OF_INTEREST).forEach(([name, poi]) => {
                const icon = L.divIcon({ className: 'poi-icon', html: '📍' });
                L.marker(poi.pos, { icon }).addTo(map).bindTooltip(name);
            });

            mapRef.current = map;
            sensorLayerRef.current = L.layerGroup().addTo(map);
        }

        // Cleanup function to run when the component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update sensors when scenario changes
    useEffect(() => {
        if (sensorLayerRef.current) {
            sensorLayerRef.current.clearLayers();
            sensors.forEach(sensor => {
                L.circle(sensor.pos, { radius: sensor.range, color: '#ef4444', weight: 1, fillOpacity: 0.1 }).addTo(sensorLayerRef.current);
                L.marker(sensor.pos, { 
                    icon: L.divIcon({ className: 'sensor-icon', html: '📡' }) 
                }).addTo(sensorLayerRef.current).bindTooltip(`Sensor ${sensor.id} (${sensor.type})`);
            });
        }
    }, [sensors]);


    // Update actor markers and paths
    useEffect(() => {
        if (!mapRef.current) return;
        
        const map = mapRef.current;
        const currentActorIds = new Set(actors.map(a => a.id));

        // Update or create actor markers
        actors.forEach(actor => {
            const position = actor.pos;
            if (!position) return;

            const existingMarker = actorMarkersRef.current.get(actor.id);
            if (existingMarker) {
                existingMarker.setLatLng(position);
            } else {
                const iconHtml = actor.type === 'adversary' ? '🏃' : '🚶';
                const icon = L.divIcon({ className: 'actor-icon', html: iconHtml });
                const newMarker = L.marker(position, { icon }).addTo(map);
                actorMarkersRef.current.set(actor.id, newMarker);
            }
        });

        // Remove markers for actors that no longer exist
        actorMarkersRef.current.forEach((marker, id) => {
            if (!currentActorIds.has(id)) {
                map.removeLayer(marker);
                actorMarkersRef.current.delete(id);
            }
        });

        // Handle adversary path visualization
        const adversary = actors.find(a => a.type === 'adversary');
        if (adversary && adversary.path.length > 1) {
            const traversedPoints = adversary.path.slice(0, adversary.pathIndex + 1);
            const plannedPoints = adversary.path.slice(adversary.pathIndex);

            if (traversedPathRef.current) {
                traversedPathRef.current.setLatLngs(traversedPoints);
            } else {
                traversedPathRef.current = L.polyline(traversedPoints, { color: '#38bdf8', weight: 4, opacity: 1 }).addTo(map);
            }

            if (plannedPathRef.current) {
                plannedPathRef.current.setLatLngs(plannedPoints);
            } else {
                plannedPathRef.current = L.polyline(plannedPoints, { color: '#38bdf8', weight: 3, opacity: 0.7, dashArray: '5, 5' }).addTo(map);
            }
        } else {
             // Clean up paths if no adversary
            if (traversedPathRef.current) {
                map.removeLayer(traversedPathRef.current);
                traversedPathRef.current = null;
            }
            if (plannedPathRef.current) {
                map.removeLayer(plannedPathRef.current);
                plannedPathRef.current = null;
            }
        }

    }, [actors]);

    // Effect for visualizing events
    useEffect(() => {
        if (!mapRef.current || events.length === 0) return;
        const map = mapRef.current;
        const lastEvent = events[events.length - 1];
        
        const sensor = sensors.find(s => s.id === lastEvent.sensorId);
        if (sensor) {
            const line = L.polyline([sensor.pos, lastEvent.actorPos], { color: '#f87171', weight: 2, dashArray: '5, 5' }).addTo(map);
            const pulse = L.circle(sensor.pos, { radius: 20, color: '#f87171', weight: 2, fillOpacity: 0.5 }).addTo(map);

            const visual = { line, pulse };
            eventVisualsRef.current.push(visual);

            setTimeout(() => {
                if (mapRef.current) {
                    map.removeLayer(line);
                    map.removeLayer(pulse);
                    eventVisualsRef.current = eventVisualsRef.current.filter(v => v !== visual);
                }
            }, 1500);
        }
    }, [events, sensors]);

    // Cleanup visuals on reset
    useEffect(() => {
        if (actors.length === 0 && mapRef.current) {
            eventVisualsRef.current.forEach(v => {
                mapRef.current.removeLayer(v.line);
                mapRef.current.removeLayer(v.pulse);
            });
            eventVisualsRef.current = [];
        }
    }, [actors]);

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 h-full w-full relative overflow-hidden">
            <style>{`
                .leaflet-container { background: #0f172a; border-radius: 0.75rem; }
                .sensor-icon, .actor-icon { font-size: 24px; text-shadow: 0 0 5px #000; }
                .actor-icon { transition: all 1s linear; }
                .poi-icon { font-size: 16px; opacity: 0.7; }
                .leaflet-tooltip { background-color: #1e293b !important; color: #cbd5e1 !important; border: 1px solid #334155 !important; }
            `}</style>
            <div ref={mapContainerRef} className="h-full w-full" />
        </div>
    );
};

export default MapComponent;