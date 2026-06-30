import React, { useState, useEffect } from "react";
import { Shield, Radio, Activity, CheckCircle, AlertOctagon, RefreshCw, Compass, Clock, Heart, ArrowRight, BarChart2 } from "lucide-react";
import CameraView from "./components/CameraView";
import TelemetryTerminal from "./components/TelemetryTerminal";
import EscalationCard from "./components/EscalationCard";
import ComplianceAnalytics from "./components/ComplianceAnalytics";
import { TelemetryEvent, CivicReport, HistoricalEvent } from "./types";

export default function App() {
  const [shieldInitialized, setShieldInitialized] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<"monitor" | "analytics">("monitor");
  const [gpsCoordinates, setGpsCoordinates] = useState({ lat: 12.9814, lng: 77.4912 }); // Default Byadrahalli coordinates
  const [logs, setLogs] = useState<string[]>([
    "Aegis Spatial telemetry daemon online.",
    "System calibrated with Bangalore ward boundaries.",
    "Click 'INITIALIZE SHIELD' to start passive monitoring."
  ]);
  
  const [activeEvent, setActiveEvent] = useState<TelemetryEvent | null>(null);
  const [report, setReport] = useState<CivicReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEvent[]>([]);

  // Load incidents from durable server database on mount and poll periodically
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch("/api/incidents");
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            if (Array.isArray(data)) {
              setHistoricalEvents(data);
            }
          } else {
            console.warn("[Aegis-Cam: DB] Received non-JSON response from server during poll, probably booting up.");
          }
        }
      } catch (err) {
        console.error("[Aegis-Cam: DB] Error fetching incidents:", err);
      }
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000); // Poll every 5 seconds for status updates
    return () => clearInterval(interval);
  }, []);

  const handleUpdateIncidentStatus = (id: string, newStatus: HistoricalEvent["status"]) => {
    addLog(`Incident #${id} status manually updated to ${newStatus}.`);
    setHistoricalEvents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  // Real-time local clock
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleInitializeShield = () => {
    setShieldInitialized(true);
    console.log("[Aegis-Cam: Shield] Initializing active spatial shield...");
    addLog("SHIELD INITIALIZATION ENGAGED.");
    console.log("[Aegis-Cam: GPS] Requesting geolocation...");
    addLog("Acquiring hardware geolocation locks...");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates({
            lat: Number(position.coords.latitude.toFixed(4)),
            lng: Number(position.coords.longitude.toFixed(4))
          });
          console.log(`[Aegis-Cam: GPS] Location resolved: ${position.coords.latitude.toFixed(4)}°N, ${position.coords.longitude.toFixed(4)}°E`);
          addLog(`Geospatial lock established: ${position.coords.latitude.toFixed(4)}°N, ${position.coords.longitude.toFixed(4)}°E`);
        },
        (error) => {
          console.warn("[Aegis-Cam: GPS] Geolocation request rejected or timed out. Defaulting to Byadrahalli coordinates.");
          addLog("GPS hardware timeout or permission denied. Defaulting to Byadrahalli spatial sector (12.9814°N, 77.4912°E).");
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      console.warn("[Aegis-Cam: GPS] Geolocation not supported by client device.");
      addLog("Device lacks GPS telemetry layer. Using default sector coordinate keys.");
    }

    console.log("[Aegis-Cam: Shield] System calibrated successfully. Active scanning enabled.");
    addLog("Aegis-Cam optical algorithms initialized. Ready to record underpass glare transits.");
  };

  // Called when camera view registers glare > 220 Lux
  const handleHazardDetected = async (luxValue: number, frames: string[]) => {
    addLog(`[CRITICAL ALERT] Optical sensor registed severe luminance value: ${luxValue} Lux.`);
    
    // Create new Telemetry Event
    const eventId = "AEGIS-" + Math.floor(Math.random() * 9000 + 1000);
    const timestampString = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const newEvent: TelemetryEvent = {
      id: eventId,
      timestamp: timestampString,
      location: "Magadi Main Road, Byadrahalli",
      luxValue: luxValue,
      frames: frames,
      status: "HAZARD_DETECTED"
    };

    setActiveEvent(newEvent);
    setIsGeneratingReport(true);
    console.log(`[Aegis-Cam: API] Starting API report dispatch for Incident ${eventId}.`);
    console.log(`[Aegis-Cam: API] Payload parameters: Lux=${luxValue}, Location="Magadi Main Road", FramesCount=${frames.length}`);
    addLog(`Incident ID: ${eventId} compiled. Transmitting frames to server API route...`);

    try {
      const payload = {
        luxValue: luxValue,
        location: "Magadi Main Road, Byadrahalli underpass",
        timestamp: timestampString,
        frames: frames
      };
      console.log(`[Aegis-Cam: API] Outbound payload size: ${JSON.stringify(payload).length} characters.`);
      
      // Call secure server side endpoint /api/report
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log(`[Aegis-Cam: API] Server response received. Status: ${response.status} (${response.statusText})`);

      if (!response.ok) {
        throw new Error(`Server returned HTTP state ${response.status}`);
      }

      const data = await response.json();
      console.log("[Aegis-Cam: API] Response payload:", data);

      if (data.success && data.report) {
        console.log("[Aegis-Cam: API] Gemini analysis resolved successfully.");
        setReport({
          eventId: eventId,
          generatedText: data.report.generatedText,
          ircCitation: data.report.ircCitation,
          authority: data.report.authority
        });
        
        setActiveEvent((prev) => prev ? { ...prev, status: "ESCALATED" } : null);
        addLog(`Grievance file finalized with Gemini. Citation: ${data.report.ircCitation}.`);
        addLog(`Jurisdiction resolved: ${data.report.authority}. Ready to file.`);
      } else {
        throw new Error(data.error || "Malformed report returned.");
      }
    } catch (err: any) {
      console.error("[Aegis-Cam: API] Grievance generation failed or rejected:", err);
      console.warn("[Aegis-Cam: API] Initiating high-fidelity local legal synthesis fallback.");
      addLog(`[ERROR] Gemini transmission failed: ${err.message || err}`);
      
      // Fallback fallback mock report if API is not yet loaded or errors out,
      // ensuring high-fidelity demo works perfectly under any network condition!
      const fallbackCitation = "IRC:SP:115 Section 8.4 (Glare Mitigation in Underpasses)";
      const fallbackAuthority = "BBMP Rajarajeshwari Nagar Zone Executive Engineer";
      const fallbackText = `To,\nThe Executive Engineer\nBruhat Bengaluru Mahanagara Palike (BBMP)\nRajarajeshwari Nagar Zone, Bengaluru\n\nSubject: Urgent Public Grievance regarding blinding glare hazard at Byadrahalli underpass, Magadi Main Road.\n\nSir/Madam,\n\nI am writing to register a critical safety violation under IRC:SP:115 guidelines observed at the Byadrahalli Underpass on Magadi Main Road. Our vehicle-mounted Aegis-Cam telemetry device logged a massive average average pixel brightness spike of ${luxValue} Lux at ${timestampString}.\n\nThis blinding glare is highly dangerous and poses an immediate threat of temporary blindness to commuters traveling through this critical node, potentially causing severe collisions.\n\nUnder Indian Roads Congress regulations, appropriate light diffusers and high-beam cutoffs must be installed. I request your team to inspect and install glare-mitigation shielding immediately.\n\nSincerely,\nConcerned Citizen & Aegis Spatial Telemetry Agent`;
      
      console.log("[Aegis-Cam: API] Fallback complaint content compiled:", { fallbackCitation, fallbackAuthority });
      setReport({
        eventId: eventId,
        generatedText: fallbackText,
        ircCitation: fallbackCitation,
        authority: fallbackAuthority
      });
      setActiveEvent((prev) => prev ? { ...prev, status: "ESCALATED" } : null);
      addLog("Using high-fidelity local legal synthesis fallback. Review report panel.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDispatchSuccess = async (dispatchedReport: CivicReport) => {
    addLog(`Municipal PGMS portal dispatch acknowledged. Tracking ID: TX-${(activeEvent?.id || "92312").substring(0, 8).toUpperCase()}`);
    
    const timestampString = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newHistorical: HistoricalEvent = {
      id: dispatchedReport.eventId,
      timestamp: timestampString,
      location: "Magadi Main Road, Byadrahalli underpass",
      luxValue: activeEvent?.luxValue || 235,
      ircCitation: dispatchedReport.ircCitation,
      authority: dispatchedReport.authority,
      status: "ESCALATED",
      lat: 12.9814 + (Math.random() * 0.003 - 0.0015),
      lng: 77.4912 + (Math.random() * 0.003 - 0.0015)
    };

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHistorical)
      });
      if (response.ok) {
        addLog("Incident successfully stored in municipal PGMS database ledger.");
        try {
          const listResponse = await fetch("/api/incidents");
          if (listResponse.ok) {
            const contentType = listResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await listResponse.json();
              if (Array.isArray(data)) {
                setHistoricalEvents(data);
              }
            } else {
              console.warn("[Aegis-Cam: API] Received non-JSON response from server during post-refresh.");
              setHistoricalEvents((prev) => [newHistorical, ...prev]);
            }
          }
        } catch (innerErr) {
          console.warn("[Aegis-Cam: API] Error refreshing incident list, appending locally:", innerErr);
          setHistoricalEvents((prev) => [newHistorical, ...prev]);
        }
      } else {
        throw new Error("Failed to post incident");
      }
    } catch (err: any) {
      console.error("[Aegis-Cam: API] Failed to register incident server-side, using local fallback:", err);
      setHistoricalEvents((prev) => [newHistorical, ...prev]);
    }
  };

  const resetActiveEvent = () => {
    setActiveEvent(null);
    setReport(null);
    addLog("System buffer cleared. Aegis-Cam back to monitoring mode.");
  };

  return (
    <div className="min-h-screen bg-aegis-bg text-aegis-on-surface flex flex-col font-sans" id="aegis-app-root">
      
      {/* Upper Navigation / Status bar - Responsive design optimized for phones and desktops */}
      <header className="bg-white/95 backdrop-blur-md border-b border-aegis-container py-3 px-4 sm:px-6 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Logo & Phone-specific telemetry info */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="bg-aegis-primary-container p-2 rounded-2xl flex items-center justify-center shadow-md shrink-0">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-display font-black tracking-widest text-aegis-primary leading-none">
                  AEGIS-CAM
                </h1>
                <span className="text-[9px] sm:text-[10px] font-display font-bold text-aegis-secondary tracking-widest block mt-0.5">
                  SPATIAL TELEMETRY
                </span>
              </div>
            </div>

            {/* Mobile-only compact clock widget */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <div className="flex items-center gap-1 bg-aegis-container-low px-2.5 py-1.5 rounded-full border border-aegis-container text-[10px] font-mono font-bold text-aegis-on-surface-variant">
                <Clock className="w-3 h-3 text-aegis-error" />
                <span>{currentTime || "00:00:00"}</span>
              </div>
            </div>
          </div>

          {/* Milestone 4 Tab Switcher (Visible when shield is active) - Responsive centering and size */}
          {shieldInitialized && (
            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 w-full sm:w-auto self-center sm:self-auto" id="dashboard-tab-switcher">
              <button
                onClick={() => setActiveDashboardTab("monitor")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-display font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeDashboardTab === "monitor"
                    ? "bg-white text-aegis-primary shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${activeDashboardTab === "monitor" ? "text-aegis-secondary" : "text-slate-400"}`} />
                Live Monitor
              </button>
              <button
                onClick={() => setActiveDashboardTab("analytics")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-display font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeDashboardTab === "analytics"
                    ? "bg-white text-aegis-primary shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                id="milestone-4-tab-btn"
              >
                <BarChart2 className={`w-3.5 h-3.5 ${activeDashboardTab === "analytics" ? "text-aegis-secondary" : "text-slate-400"}`} />
                Ward HUD <span className="bg-aegis-secondary text-white text-[8px] px-1 py-0.2 rounded font-mono">M4</span>
              </button>
            </div>
          )}

          {/* Desktop telemetry status readouts (Hidden on mobile for visual breathing space) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-aegis-container-low px-3 py-1.5 rounded-full border border-aegis-container">
              <Compass className="w-3.5 h-3.5 text-aegis-secondary" />
              <span className="text-[10px] font-mono font-bold text-aegis-on-surface-variant">
                {gpsCoordinates.lat}°N, {gpsCoordinates.lng}°E
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-aegis-container-low px-3 py-1.5 rounded-full border border-aegis-container">
              <Clock className="w-3.5 h-3.5 text-aegis-error" />
              <span className="text-[10px] font-mono font-bold text-aegis-on-surface-variant">
                {currentTime || "00:00:00"}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main dashboard content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        
        {/* Initialization Hero Gate (Visible prior to user initializing) */}
        {!shieldInitialized ? (
          <div className="flex-1 flex items-center justify-center py-6" id="hero-gate-container">
            <div className="max-w-md w-full bg-white border border-aegis-container p-8 rounded-3xl text-center relative overflow-hidden shadow-lg animate-fade-in map-grid-bg">
              
              {/* Pebble design visual container */}
              <div className="w-20 h-20 rounded-full bg-aegis-container-low border-2 border-aegis-secondary/20 flex items-center justify-center mx-auto mb-6 relative shadow-xs">
                <Shield className="w-9 h-9 text-aegis-secondary" />
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-aegis-secondary/30 animate-spin [animation-duration:15s]" />
              </div>

              <h2 className="text-xl font-headline font-bold text-aegis-primary tracking-tight">
                Active Spatial Shield
              </h2>
              <p className="text-xs text-aegis-secondary font-display font-bold mt-1 tracking-widest uppercase">
                Establish Vehicle Telemetry Lock
              </p>

              <p className="text-xs text-aegis-on-surface-variant font-medium my-5 leading-relaxed">
                Mount your smartphone on your car dashboard. Aegis-Cam leverages edge video brightness calculations to index blinding underpass glare, pairing frame sequences with Google Gemini to compile automated legal complaints to Bangalore civic authorities.
              </p>

              {/* Safety warning */}
              <div className="bg-aegis-error-container/30 border border-aegis-error/15 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
                <div className="bg-white p-1.5 rounded-full shadow-xs">
                  <AlertOctagon className="w-5 h-5 text-aegis-error shrink-0" />
                </div>
                <div>
                  <h4 className="text-[11px] font-display font-bold text-aegis-error uppercase tracking-wider">
                    Zero Driver Distraction
                  </h4>
                  <p className="text-[10px] text-aegis-on-surface-variant font-medium mt-0.5 leading-relaxed">
                    Once initialized, this application runs autonomously. Do not interact with your device while driving.
                  </p>
                </div>
              </div>

              {/* Primary action pill-shaped button */}
              <button
                onClick={handleInitializeShield}
                className="w-full bg-aegis-secondary hover:bg-[#22523d] text-white font-display font-bold tracking-widest text-xs py-4 px-6 rounded-full transition-all active:scale-97 cursor-pointer shadow-sm flex items-center justify-center gap-2"
                id="initialize-shield-button"
              >
                INITIALIZE SHIELD
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ) : activeDashboardTab === "monitor" ? (
          /* Active Interactive Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-stretch" id="active-dashboard-grid">
            
            {/* Left Column (Camera Optic Viewport) */}
            <div className="lg:col-span-5 flex flex-col">
              <CameraView
                onHazardDetected={handleHazardDetected}
                currentStatus={activeEvent ? activeEvent.status : "MONITORING"}
                onLogsUpdate={addLog}
              />
            </div>

            {/* Middle Column (Command Terminal & Ecosystem History) */}
            <div className="lg:col-span-4 flex flex-col">
              <TelemetryTerminal
                logs={logs}
                historicalEvents={historicalEvents}
                activeEvent={activeEvent}
                onClearLogs={() => setLogs(["[CONSOLE RESET] Daemon monitoring active."])}
                gpsCoordinates={gpsCoordinates}
                onUpdateStatus={handleUpdateIncidentStatus}
                onUpdateGpsCoordinates={setGpsCoordinates}
                onLogsUpdate={addLog}
              />
            </div>

            {/* Right Column (Civic Matrix Complaint Panel) */}
            <div className="lg:col-span-3 flex flex-col justify-between">
              <div className="flex-1">
                <EscalationCard
                  report={report}
                  activeEvent={activeEvent}
                  isLoading={isGeneratingReport}
                  onDispatchSuccess={handleDispatchSuccess}
                />
              </div>

              {/* Active Incident Controls to clear and resume - Pebble shaped bottom panel */}
              {activeEvent && !isGeneratingReport && (
                <div className="mt-4 bg-white border border-aegis-container rounded-2xl p-3 flex items-center justify-between text-xs animate-fade-in shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="bg-aegis-secondary-container p-1 rounded-full animate-pulse">
                      <Activity className="w-3.5 h-3.5 text-aegis-secondary" />
                    </div>
                    <span className="font-display font-bold text-[10px] text-aegis-primary uppercase tracking-wider">
                      Active Event Locked
                    </span>
                  </div>
                  <button
                    onClick={resetActiveEvent}
                    className="flex items-center gap-1 font-display font-bold text-[10px] tracking-wider text-aegis-error bg-aegis-error-container/30 px-3 h-8 rounded-full border border-aegis-error/10 hover:bg-aegis-error/10 transition-colors cursor-pointer"
                    id="clear-incident-btn"
                  >
                    <RefreshCw className="w-3 h-3 text-current" />
                    Clear Shield
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Milestone 4: Civic Analytics & Speed Advisory Dashboard */
          <div className="flex-1 w-full animate-fade-in" id="milestone-4-analytics">
            <ComplianceAnalytics incidents={historicalEvents} gpsCoordinates={gpsCoordinates} />
          </div>
        )}
      </main>

      {/* Footer copyright - Tactile clean style */}
      <footer className="bg-white border-t border-aegis-container py-4 text-center text-[10px] font-display font-bold text-aegis-on-surface-variant shrink-0 mt-8 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span>AEGIS Spatial Telematics Engine</span>
            <span className="text-aegis-container-high">|</span>
            <span>Byadrahalli Spatial Sector Node</span>
          </div>
          <div className="flex items-center gap-1 text-aegis-secondary">
            <span>Tactile Modernism Design</span>
            <Heart className="w-3.5 h-3.5 text-aegis-error inline" />
            <span>Hackathon Protocol</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
