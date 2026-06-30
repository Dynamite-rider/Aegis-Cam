import React, { useState } from "react";
import { HistoricalEvent } from "../types";
import { 
  Compass, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Hammer, 
  RefreshCw, 
  Navigation, 
  MapPin, 
  Share2, 
  Star 
} from "lucide-react";

interface SpatialMapProps {
  gpsCoordinates: { lat: number; lng: number };
  incidents: HistoricalEvent[];
  onUpdateStatus: (id: string, newStatus: HistoricalEvent["status"]) => void;
  onUpdateGpsCoordinates: (coords: { lat: number; lng: number }) => void;
  onLogsUpdate: (message: string) => void;
}

export default function SpatialMap({
  gpsCoordinates,
  incidents,
  onUpdateStatus,
  onUpdateGpsCoordinates,
  onLogsUpdate
}: SpatialMapProps) {
  const [selectedIncident, setSelectedIncident] = useState<HistoricalEvent | null>(null);
  const [isPatching, setIsPatching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapAlertMsg, setMapAlertMsg] = useState<string | null>(null);

  const triggerMapAlert = (msg: string) => {
    setMapAlertMsg(msg);
    setTimeout(() => {
      setMapAlertMsg((current) => current === msg ? null : current);
    }, 4000);
  };

  // Center coordinates around current active location dynamically
  const centerLat = gpsCoordinates.lat;
  const centerLng = gpsCoordinates.lng;

  // Zoom/scale boundary delta
  const latDelta = 0.005;
  const lngDelta = 0.006;

  const minLat = centerLat - latDelta;
  const maxLat = centerLat + latDelta;
  const minLng = centerLng - lngDelta;
  const maxLng = centerLng + lngDelta;

  // Translate lat/lng to Map pixels (400 x 300 viewBox)
  const getXY = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 400;
    // SVG y=0 is top, so we subtract from 300
    const y = 300 - ((lat - minLat) / (maxLat - minLat)) * 300;
    return { x, y };
  };

  const vehiclePos = getXY(gpsCoordinates.lat, gpsCoordinates.lng);

  const handleStatusAdvance = async (incident: HistoricalEvent) => {
    let nextStatus: HistoricalEvent["status"];
    if (incident.status === "ESCALATED") nextStatus = "REVIEW";
    else if (incident.status === "REVIEW") nextStatus = "INVESTIGATING";
    else if (incident.status === "INVESTIGATING") nextStatus = "RESOLVED";
    else return;

    setIsPatching(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (response.ok) {
        onUpdateStatus(incident.id, nextStatus);
        setSelectedIncident((prev) => prev ? { ...prev, status: nextStatus } : null);
        onLogsUpdate(`Incident #${incident.id} status successfully advanced to ${nextStatus}.`);
      }
    } catch (err) {
      console.error("Failed to patch status:", err);
      onLogsUpdate(`Error updating status for Incident #${incident.id}.`);
    } finally {
      setIsPatching(false);
    }
  };

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      onLogsUpdate("Error: Browser does not support geolocation.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    onLogsUpdate("Polling web navigator for live satellite/Wi-Fi geolocation fix...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        onUpdateGpsCoordinates({ lat, lng });
        onLogsUpdate(`Browser live location lock successful: ${lat}°N, ${lng}°E`);
        setIsLocating(false);
      },
      (error) => {
        console.warn("[Aegis Map] Geolocation request failed:", error);
        setLocationError("Permission denied or timeout.");
        onLogsUpdate("GPS lookup failed. Defaulting to Byadrahalli sector lock.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const getStatusStepIndex = (status: HistoricalEvent["status"]) => {
    switch (status) {
      case "ESCALATED": return 1;
      case "REVIEW": return 2;
      case "INVESTIGATING": return 3;
      case "RESOLVED": return 4;
      default: return 1;
    }
  };

  return (
    <div className="flex flex-col h-full bg-aegis-container-low border border-aegis-container rounded-2xl p-4 overflow-hidden shadow-inner font-sans" id="spatial-map-viewport">
      
      {/* HUD Header */}
      <div className="flex items-center justify-between text-[10px] font-mono border-b border-aegis-container pb-2 mb-3">
        <span className="text-aegis-primary font-bold flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-aegis-secondary animate-spin [animation-duration:12s]" />
          ACTIVE DEPLOYMENT MAP
        </span>
        <span className="text-aegis-secondary font-bold">SEC: {gpsCoordinates.lat.toFixed(4)}°N</span>
      </div>

      {/* Map SVG Canvas (Google Maps Styling) */}
      <div className="relative flex-1 bg-[#f4f3f0] border border-slate-200 rounded-xl overflow-hidden shadow-md group">
        
        {/* Absolute Coordinate readout on background */}
        <div className="absolute top-2 left-3 font-mono text-[8px] text-slate-500 pointer-events-none select-none z-10">
          GRID WINDOW: {minLat.toFixed(4)} - {maxLat.toFixed(4)} | {minLng.toFixed(4)} - {maxLng.toFixed(4)}
        </div>

        <svg viewBox="0 0 400 300" className="w-full h-full select-none" id="vector-roadmap-canvas">
          {/* Base Map Land Color (Google Maps Cream) */}
          <rect width="400" height="300" fill="#f4f3f0" />

          {/* Park 1 (Top Left Greenery) */}
          <polygon points="-10,-10 160,-10 110,80 -10,60" fill="#d2ebd4" stroke="#c3e6cb" strokeWidth="0.5" />
          
          {/* Park 2 (Bottom Right Greenery) */}
          <polygon points="310,210 420,180 420,310 280,310" fill="#d2ebd4" stroke="#c3e6cb" strokeWidth="0.5" />

          {/* Lake/Water Body (Bottom Left) */}
          <path d="M -10,240 C 30,242 70,260 80,285 C 60,315 15,315 -10,305 Z" fill="#aad3df" stroke="#9bc2ce" strokeWidth="0.5" />

          {/* Lake/Water Body (Top Right) */}
          <path d="M 320,-10 C 340,12 380,30 395,55 C 375,75 340,55 330,35 Z" fill="#aad3df" stroke="#9bc2ce" strokeWidth="0.5" />

          {/* Subtle Residential Blocks (Grayish Rectangles) */}
          <rect x="40" y="95" width="28" height="18" rx="2" fill="#eae8e2" stroke="#dfdbd3" strokeWidth="0.5" />
          <rect x="80" y="105" width="22" height="15" rx="2" fill="#eae8e2" stroke="#dfdbd3" strokeWidth="0.5" />
          <rect x="315" y="80" width="35" height="25" rx="2" fill="#eae8e2" stroke="#dfdbd3" strokeWidth="0.5" />
          <rect x="25" y="195" width="30" height="22" rx="2" fill="#eae8e2" stroke="#dfdbd3" strokeWidth="0.5" />
          <rect x="110" y="225" width="32" height="24" rx="2" fill="#eae8e2" stroke="#dfdbd3" strokeWidth="0.5" />

          {/* Standard Minor Streets (Subtle white roads with gray borders) */}
          <g strokeLinecap="round">
            {/* Street 1 Horizontal */}
            <line x1="-10" y1="75" x2="410" y2="75" stroke="#e2e8f0" strokeWidth="4" />
            <line x1="-10" y1="75" x2="410" y2="75" stroke="#ffffff" strokeWidth="2.5" />
            
            {/* Street 2 Horizontal */}
            <line x1="-10" y1="225" x2="410" y2="225" stroke="#e2e8f0" strokeWidth="4" />
            <line x1="-10" y1="225" x2="410" y2="225" stroke="#ffffff" strokeWidth="2.5" />

            {/* Street 3 Vertical Left */}
            <line x1="75" y1="-10" x2="75" y2="310" stroke="#e2e8f0" strokeWidth="4" />
            <line x1="75" y1="-10" x2="75" y2="310" stroke="#ffffff" strokeWidth="2.5" />

            {/* Street 4 Vertical Right */}
            <line x1="325" y1="-10" x2="325" y2="310" stroke="#e2e8f0" strokeWidth="4" />
            <line x1="325" y1="-10" x2="325" y2="310" stroke="#ffffff" strokeWidth="2.5" />
          </g>

          {/* Major Road: Magadi Main Road (Runs horizontally, y=150) */}
          <g>
            {/* Road Casing (orange/tan border) */}
            <line x1="-10" y1="150" x2="410" y2="150" stroke="#fbd38d" strokeWidth="11" strokeLinecap="round" />
            {/* Main Yellow Highway Surface */}
            <line x1="-10" y1="150" x2="410" y2="150" stroke="#fef08a" strokeWidth="8" strokeLinecap="round" />
            {/* Center Dash Divider */}
            <line x1="-10" y1="150" x2="410" y2="150" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,6" />
          </g>

          {/* Diag Secondary Road: NICE Ring Link Road */}
          <g>
            <line x1="120" y1="-10" x2="260" y2="310" stroke="#cbd5e1" strokeWidth="9" strokeLinecap="round" />
            <line x1="120" y1="-10" x2="260" y2="310" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          </g>

          {/* Google Road Shields / Markers */}
          <g transform="translate(45, 143)">
            <rect x="0" y="0" width="70" height="13" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))" }} />
            <text x="35" y="8.5" fill="#475569" fontSize="6" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">MAGADI MAIN RD</text>
          </g>

          <g transform="translate(195, 175) rotate(65)">
            <rect x="0" y="0" width="55" height="11" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))" }} />
            <text x="27.5" y="7.5" fill="#475569" fontSize="5.5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">NICE LINK RD</text>
          </g>

          {/* Byadrahalli Underpass Portal Icon */}
          <g transform="translate(155, 132)">
            <rect x="0" y="0" width="50" height="36" fill="#ffffff" stroke="#1a73e8" strokeWidth="1.5" rx="4" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }} />
            <rect x="3" y="3" width="44" height="13" fill="#e8f0fe" rx="2" />
            <text x="25" y="11" fill="#1a73e8" fontSize="5.5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
              TUNNEL NODE
            </text>
            <text x="25" y="23" fill="#475569" fontSize="5" fontFamily="sans-serif" textAnchor="middle">
              Byadrahalli Underpass
            </text>
            <text x="25" y="31" fill="#ef4444" fontSize="5" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle" className="animate-pulse">
              [HIGH GLARE AREA]
            </text>
          </g>

          {/* Saved Glare Incident Hotspots */}
          {incidents.map((inc) => {
            if (!inc.lat || !inc.lng) return null;
            const pos = getXY(inc.lat, inc.lng);
            
            // Marker color scheme mapping
            let markerColor = "#ea4335"; // Google Red
            if (inc.status === "RESOLVED") markerColor = "#34a853"; // Google Green
            else if (inc.status === "REVIEW") markerColor = "#fbbc05"; // Google Yellow
            else if (inc.status === "INVESTIGATING") markerColor = "#4285f4"; // Google Blue
            
            const isSelected = selectedIncident?.id === inc.id;

            return (
              <g 
                key={inc.id} 
                onClick={() => setSelectedIncident(inc)}
                className="cursor-pointer group"
              >
                {/* Ping warning ripple */}
                <circle 
                  cx={pos.x} 
                  cy={pos.y} 
                  r={isSelected ? 14 : 10} 
                  fill={markerColor} 
                  fillOpacity="0.18" 
                  className="animate-ping [animation-duration:2.2s]"
                />
                
                {/* Marker Drop Shadow */}
                <ellipse cx={pos.x} cy={pos.y} rx="3.5" ry="1.2" fill="#000000" fillOpacity="0.25" />

                {/* Google Maps Pin Path */}
                <path 
                  d="M 0,-14 C -4,-14 -7,-11 -7,-7 C -7,-1.5 0,0 0,0 C 0,0 7,-1.5 7,-7 C 7,-11 4,-14 0,-14 Z" 
                  fill={markerColor} 
                  stroke="#ffffff" 
                  strokeWidth="1"
                  transform={`translate(${pos.x}, ${pos.y}) scale(${isSelected ? 1.25 : 1})`}
                  className="transition-all duration-200"
                />

                {/* Pin Center Dot */}
                <circle cx={pos.x} cy={pos.y - 7 * (isSelected ? 1.25 : 1)} r="2" fill="#ffffff" />

                {/* Micro hovering ID tooltip */}
                <text 
                  x={pos.x} 
                  y={pos.y - 18} 
                  fill="#ffffff" 
                  fontSize="5.5" 
                  fontFamily="monospace" 
                  fontWeight="bold" 
                  textAnchor="middle"
                  className="bg-slate-900 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                >
                  #{inc.id.substring(6)}
                </text>
              </g>
            );
          })}

          {/* Active Vehicle navigation tracker (Google Map Live blue dot) */}
          <g>
            {/* Concentric Pulsing Radar Ring */}
            <circle cx={vehiclePos.x} cy={vehiclePos.y} r="16" fill="#1a73e8" fillOpacity="0.15" className="animate-ping" />
            {/* Soft Shadow */}
            <circle cx={vehiclePos.x} cy={vehiclePos.y + 1} r="5" fill="#000000" fillOpacity="0.15" />
            {/* Clean White Boundary Circle */}
            <circle cx={vehiclePos.x} cy={vehiclePos.y} r="6.5" fill="#ffffff" />
            {/* Core Google Blue Location Pointer */}
            <circle cx={vehiclePos.x} cy={vehiclePos.y} r="4.5" fill="#1a73e8" />
            {/* Direction Cone */}
            <polygon 
              points={`${vehiclePos.x},${vehiclePos.y - 8} ${vehiclePos.x - 3.5},${vehiclePos.y - 2} ${vehiclePos.x + 3.5},${vehiclePos.y - 2}`} 
              fill="#1a73e8" 
            />
          </g>

        </svg>

        {/* Legend Overlay (Google-style Minimalist Card) */}
        <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg px-2 py-1 text-[8px] font-sans font-semibold text-slate-600 shadow-xs pointer-events-none flex flex-col gap-0.5 z-10">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ea4335]" /> Filed/Escalated
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbc05]" /> Reviewing
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34a853]" /> Remediated
          </div>
        </div>

        {/* Live Geolocation Trigger (Google Maps Style Crosshairs) */}
        <button
          onClick={handleGetLiveLocation}
          disabled={isLocating}
          className="absolute bottom-3 right-3 bg-white hover:bg-slate-50 disabled:bg-slate-100 text-slate-700 p-2.5 rounded-full shadow-lg border border-slate-200 transition-all cursor-pointer active:scale-95 flex items-center justify-center z-20"
          id="ask-live-location-btn"
          title="Acquire live GPS coordinates"
        >
          {isLocating ? (
            <RefreshCw className="w-4.5 h-4.5 text-[#1a73e8] animate-spin" />
          ) : (
            <Navigation className="w-4.5 h-4.5 text-[#1a73e8]" />
          )}
        </button>
        
        {/* Sleek Floating Toast Overlay */}
        {mapAlertMsg && (
          <div className="absolute bottom-3 left-3 right-14 bg-slate-900/95 backdrop-blur-xs text-white text-[10px] font-sans font-medium px-3.5 py-2.5 rounded-xl shadow-md border border-slate-800 z-30 animate-fade-in flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="leading-tight">{mapAlertMsg}</span>
          </div>
        )}

      </div>

      {/* Incident Mini-inspector or Google style Location detail card */}
      <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3 min-h-[125px] flex flex-col justify-between shadow-xs">
        {selectedIncident ? (
          <div className="space-y-2 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-black text-aegis-primary flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#ea4335]" />
                Incident #{selectedIncident.id}
              </span>
              <span className={`text-[9px] font-display font-bold px-2.5 py-0.5 rounded-full ${
                selectedIncident.status === "RESOLVED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : selectedIncident.status === "REVIEW"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : selectedIncident.status === "INVESTIGATING"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {selectedIncident.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
              <div>
                <span className="text-slate-400">LUX VALUE: </span>
                <span className="font-bold text-red-600">{selectedIncident.luxValue} Lux</span>
              </div>
              <div>
                <span className="text-slate-400">TIMESTAMP: </span>
                <span className="font-bold text-slate-800">{selectedIncident.timestamp.split(" ")[1] || "Active"}</span>
              </div>
              <div className="col-span-2 truncate">
                <span className="text-slate-400">IRC SECTION: </span>
                <span className="font-bold text-slate-800">{selectedIncident.ircCitation}</span>
              </div>
            </div>

            {/* Stepper tracker widget representing the municipal redressal pipeline */}
            <div className="pt-1.5 pb-1">
              <div className="flex items-center justify-between text-[8px] font-display font-bold text-slate-400 uppercase tracking-wider">
                <span>Filed</span>
                <span>Review</span>
                <span>Audit</span>
                <span>Fixed</span>
              </div>
              <div className="relative mt-1">
                <div className="h-1 bg-slate-100 rounded-full w-full" />
                <div 
                  className="absolute top-0 h-1 bg-[#1a73e8] rounded-full transition-all duration-500" 
                  style={{ width: `${((getStatusStepIndex(selectedIncident.status) - 1) / 3) * 100}%` }}
                />
                <div className="absolute -top-1 w-full flex justify-between">
                  {[1, 2, 3, 4].map((step) => {
                    const active = getStatusStepIndex(selectedIncident.status) >= step;
                    return (
                      <div 
                        key={step} 
                        className={`w-3 h-3 rounded-full border-2 transition-colors duration-300 ${
                          active 
                            ? "bg-[#1a73e8] border-white" 
                            : "bg-white border-slate-200"
                        }`} 
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Status action trigger */}
            {selectedIncident.status !== "RESOLVED" && (
              <button
                disabled={isPatching}
                onClick={() => handleStatusAdvance(selectedIncident)}
                className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white py-1.5 rounded-lg text-[10px] font-display font-bold tracking-wider uppercase transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                {isPatching ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Updating Pipeline...
                  </>
                ) : selectedIncident.status === "ESCALATED" ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    Advance to Municipal Review
                  </>
                ) : selectedIncident.status === "REVIEW" ? (
                  <>
                    <Shield className="w-3.5 h-3.5" />
                    Dispatch Audit Team
                  </>
                ) : (
                  <>
                    <Hammer className="w-3.5 h-3.5" />
                    Mark Core Glare Resolved
                  </>
                )}
              </button>
            )}

            {/* Back button */}
            <button 
              onClick={() => setSelectedIncident(null)}
              className="text-center w-full text-[9px] text-[#1a73e8] font-bold hover:underline"
            >
              Back to general location information
            </button>
          </div>
        ) : (
          /* Live Location Card styled exactly like Google Maps */
          <div className="space-y-3 animate-fade-in text-xs font-sans">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h4 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-red-500 fill-red-500/20" />
                  Byadrahalli Sector Transit
                </h4>
                <p className="text-[10px] text-slate-500">
                  Bengaluru, Karnataka 560091 • Active Coverage
                </p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE GPS
              </span>
            </div>

            {/* Google-Style Pill Capsule Action Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button 
                onClick={handleGetLiveLocation}
                disabled={isLocating}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3 h-3 text-[#1a73e8] ${isLocating ? 'animate-spin' : ''}`} />
                Ask Live Location
              </button>
              <button 
                onClick={() => {
                  onLogsUpdate("Initiating direct route navigation query...");
                  triggerMapAlert("Standard Google Route: Magadi Main Rd to Outer Ring Rd (12 mins - light traffic). Underpass glare alert active.");
                }}
                className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1a73e8] text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Navigation className="w-3 h-3 rotate-45" />
                Directions
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${gpsCoordinates.lat}, ${gpsCoordinates.lng}`);
                  onLogsUpdate(`Copied coordinates to user clipboard: ${gpsCoordinates.lat}, ${gpsCoordinates.lng}`);
                  triggerMapAlert(`Coordinates copied to clipboard: ${gpsCoordinates.lat}, ${gpsCoordinates.lng}`);
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Share2 className="w-3 h-3 text-slate-500" />
                Share
              </button>
            </div>

            {/* Precise Coordinate telemetry grid */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
              <div>
                <span className="text-slate-400">LAT:</span>{" "}
                <span className="font-bold text-slate-800">{gpsCoordinates.lat.toFixed(4)}° N</span>
              </div>
              <div>
                <span className="text-slate-400">LNG:</span>{" "}
                <span className="font-bold text-slate-800">{gpsCoordinates.lng.toFixed(4)}° E</span>
              </div>
              <div className="col-span-2 text-slate-500 flex items-center justify-between border-t border-slate-200/60 pt-1.5 mt-0.5">
                <span>Signal Quality: <b className="text-emerald-600">Excellent (3D Fix)</b></span>
                <span>Active Pins: <b className="text-slate-800">{incidents.length} Hotspots</b></span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
