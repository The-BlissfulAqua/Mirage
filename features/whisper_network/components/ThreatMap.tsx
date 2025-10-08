import React, { useEffect, useRef } from 'react';
import { SocialMediaPost, ThreatAlert, FilterOptions } from '../types';
import { formatTimestamp, getSentimentIcon } from '../utils/formatting';

declare const L: any;

interface ThreatMapProps {
  posts: SocialMediaPost[];
  alerts: ThreatAlert[];
  activeFilters: FilterOptions;
  selectedPostId: string | null;
  onMarkerClick: (postId: string | null) => void;
}

const MAP_CENTER: [number, number] = [34.0, 75.3];
const MAP_ZOOM = 9;

const ThreatMap: React.FC<ThreatMapProps> = ({ posts, alerts, activeFilters, selectedPostId, onMarkerClick }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerLayerRef = useRef<any>(null);
    const heatmapLayerRef = useRef<any>(null);
    const legendRef = useRef<any>(null);
    const layerControlRef = useRef<any>(null);

    // Use a ref to hold the latest onMarkerClick callback without needing to re-run the map init effect.
    const onMarkerClickRef = useRef(onMarkerClick);
    useEffect(() => {
        onMarkerClickRef.current = onMarkerClick;
    }, [onMarkerClick]);

    const getThreatConfig = (score: number) => {
        if (score > 75) return { color: '#ef4444', level: 'critical' };
        if (score > 50) return { color: '#f97316', level: 'high' };
        if (score > 25) return { color: '#eab308', level: 'medium' };
        return { color: '#22c55e', level: 'low' };
    };

    // Initialize map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            // FIX: Set default icon paths for Leaflet plugins like markercluster
            // This prevents errors when the plugin tries to load default icon images.
            const DefaultIcon = L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            L.Marker.prototype.options.icon = DefaultIcon;
            
            const map = L.map(mapContainerRef.current, { zoomControl: false }).setView(MAP_CENTER, MAP_ZOOM);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            mapRef.current = map;
            heatmapLayerRef.current = (L.heatLayer as any)([], { radius: 25, blur: 15, maxZoom: 12, gradient: {0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1: 'red'} });
            markerLayerRef.current = (L.markerClusterGroup as any)({
                chunkedLoading: true,
                maxClusterRadius: 50,
            }).addTo(map);
            
            // Custom Layer Control
            const LayerControl = L.Control.extend({
                onAdd: function() {
                    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control bg-slate-800/80 p-1 rounded-md');
                    container.style.boxShadow = 'none';
                    container.innerHTML = `
                        <button id="show-markers" title="Show Markers" class="p-1 bg-sky-600 rounded-sm">📍</button>
                        <button id="show-heatmap" title="Show Heatmap" class="p-1">🔥</button>
                    `;
                    L.DomEvent.disableClickPropagation(container);
                    L.DomEvent.on(container.querySelector('#show-markers'), 'click', () => {
                        map.addLayer(markerLayerRef.current);
                        map.removeLayer(heatmapLayerRef.current);
                        container.querySelector('#show-markers')?.classList.add('bg-sky-600');
                        container.querySelector('#show-heatmap')?.classList.remove('bg-sky-600');
                    });
                    L.DomEvent.on(container.querySelector('#show-heatmap'), 'click', () => {
                        map.removeLayer(markerLayerRef.current);
                        map.addLayer(heatmapLayerRef.current);
                        container.querySelector('#show-heatmap')?.classList.add('bg-sky-600');
                        container.querySelector('#show-markers')?.classList.remove('bg-sky-600');
                    });
                    return container;
                }
            });
            layerControlRef.current = new LayerControl({ position: 'topright' }).addTo(map);

            // Legend Control
            const LegendControl = L.Control.extend({
                onAdd: function() {
                    const div = L.DomUtil.create('div', 'info legend bg-slate-800/80 p-2 rounded-md text-xs text-gray-300');
                    const levels = ['Low (0-25)', 'Medium (26-50)', 'High (51-75)', 'Critical (76+)'];
                    const colors = ['#22c55e', '#eab308', '#f97316', '#ef4444'];
                    div.innerHTML += '<h4 class="font-bold mb-1">Threat Level</h4>';
                    for (let i = 0; i < levels.length; i++) {
                        div.innerHTML += `<i class="inline-block w-3 h-3 mr-1" style="background:${colors[i]}"></i> ${levels[i]}<br>`;
                    }
                    return div;
                }
            });
            legendRef.current = new LegendControl({ position: 'bottomleft' }).addTo(map);

            // Add click listener to popups only ONCE
            markerLayerRef.current.on('popupopen', (e: any) => {
                const button = e.popup.getElement().querySelector('button[data-postid]');
                if (button) {
                    // Use L.DomEvent to handle the click, preventing propagation issues within the map
                    L.DomEvent.on(button, 'click', () => {
                        const postId = button.getAttribute('data-postid');
                        onMarkerClickRef.current(postId);
                    });
                }
            });
        }

        // Return cleanup function to run when component unmounts
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only once

    // Update map data when posts change
    useEffect(() => {
        if (!mapRef.current || !markerLayerRef.current || !heatmapLayerRef.current) return;
        
        markerLayerRef.current.clearLayers();
        
        const locatedPosts = posts.filter(p => p.location);
        const heatmapData: [number, number, number][] = [];

        locatedPosts.forEach(post => {
            const { lat, lng } = post.location!;
            const { color, level } = getThreatConfig(post.threatScore);
            const size = 12 + (post.threatScore / 100) * 16;
            const isSelected = post.id === selectedPostId;

            const icon = L.divIcon({
                html: `<div class="marker-pin ${level} ${isSelected ? 'selected' : ''}" style="background-color: ${color}; width: ${size}px; height: ${size}px;"></div>`,
                className: '',
                iconSize: [size, size],
                iconAnchor: [size / 2, size]
            });

            const marker = L.marker([lat, lng], { icon });
            
            const popupContent = `
                <div class="p-1">
                    <strong class="text-sky-400">${post.platform} Post by ${post.author}</strong>
                    <p class="text-xs text-gray-400">${formatTimestamp(post.timestamp)}</p>
                    <p class="my-2 text-gray-200">${post.content.slice(0, 100)}...</p>
                    <div class="flex justify-between items-center text-xs border-t border-slate-600 pt-1 mt-1">
                        <span>${getSentimentIcon(post.sentiment)} ${post.sentiment}</span>
                        <strong>Threat: <span style="color: ${color}">${post.threatScore}</span></strong>
                    </div>
                    <button class="w-full text-center mt-2 px-2 py-1 bg-sky-600 text-white rounded-md text-xs hover:bg-sky-700" data-postid="${post.id}">
                        Focus on this Post
                    </button>
                </div>
            `;
            marker.bindPopup(popupContent);
            
            markerLayerRef.current.addLayer(marker);

            heatmapData.push([lat, lng, post.threatScore / 100]);
        });
        
        heatmapLayerRef.current.setLatLngs(heatmapData);

    }, [posts, selectedPostId]);
    
     // Handle location filter changes
    useEffect(() => {
        if(mapRef.current && activeFilters.location && activeFilters.location !== 'All Locations') {
            const alertWithLocation = alerts.find(a => a.location.name === activeFilters.location);
            if (alertWithLocation) {
                mapRef.current.flyTo([alertWithLocation.location.lat, alertWithLocation.location.lng], 12);
            }
        } else if (mapRef.current) {
            mapRef.current.flyTo(MAP_CENTER, MAP_ZOOM);
        }
    }, [activeFilters.location, alerts]);


    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 h-full w-full relative overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-700 flex-shrink-0">
                <h3 className="text-xl font-bold text-white">Geospatial Threat Intel</h3>
            </div>
             <style>{`
                .leaflet-container { background: #0f172a; }
                .leaflet-popup-content-wrapper { background-color: #1e293b; color: #cbd5e1; border-radius: 8px; border: 1px solid #334155; }
                .leaflet-popup-tip { background-color: #1e293b; }
                .marker-pin { border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px 2px rgba(0,0,0,0.5); cursor: pointer; }
                .marker-pin.critical { animation: pulse 1.5s infinite; }
                .marker-pin.selected { border: 3px solid #38bdf8; transform: scale(1.2); z-index: 1000; }
                .MarkerCluster.Default.css { color: white; }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>
            <div ref={mapContainerRef} className="flex-grow" />
        </div>
    );
};

export default ThreatMap;