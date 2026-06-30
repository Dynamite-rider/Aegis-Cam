import React, { useEffect, useRef, useState } from "react";
import { Terminal, Shield, MapPin, Navigation, Cpu, Eye, Compass, Map } from "lucide-react";
import { TelemetryEvent, HistoricalEvent } from "../types";
import SpatialMap from "./SpatialMap";

interface TelemetryTerminalProps {
  logs: string[];
  historicalEvents: HistoricalEvent[];
  activeEvent: TelemetryEvent | null;
  onClearLogs: () => void;
  gpsCoordinates: { lat: number; lng: number };
  onUpdateStatus: (id: string, newStatus: HistoricalEvent["status"]) => void;
  onUpdateGpsCoordinates: (coords: { lat: number; lng: number }) => void;
  onLogsUpdate: (message: string) => void;
}

export default function TelemetryTerminal({
  logs,
  historicalEvents,
  activeEvent,
  onClearLogs,
  gpsCoordinates,
  onUpdateStatus,
  onUpdateGpsCoordinates,
  onLogsUpdate
}: TelemetryTerminalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"terminal" | "spatial">("spatial"); // Default to spatial map to showcase Milestone 3!

  // Auto-scroll logs to bottom locally (prevents page/iframe jitter)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-white rounded-3xl p-5 border border-aegis-container tactile-shadow flex flex-col h-full" id="telemetry-terminal-container">
      
      {/* Terminal Title Header with View Toggle Tabs */}
      <div className="flex items-center justify-between mb-3 border-b border-aegis-container pb-2.5 gap-2">
        <div className="flex items-center gap-1.5">
          <div className="bg-aegis-primary-container/10 p-1.5 rounded-full shrink-0">
            {activeTab === "terminal" ? (
              <Terminal className="w-4 h-4 text-aegis-secondary" />
            ) : (
              <Map className="w-4 h-4 text-aegis-secondary" />
            )}
          </div>
          <h2 className="text-[11px] font-display font-bold tracking-wider text-aegis-primary uppercase truncate">
            {activeTab === "terminal" ? "CLI Logs" : "Spatial Radar"}
          </h2>
        </div>
        
        {/* Toggle Controls */}
        <div className="flex bg-aegis-container-low p-0.5 rounded-full border border-aegis-container text-[10px] font-display font-bold shrink-0 ml-auto">
          <button
            onClick={() => setActiveTab("spatial")}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "spatial"
                ? "bg-white text-aegis-primary shadow-xs"
                : "text-aegis-on-surface-variant hover:text-aegis-primary"
            }`}
          >
            Radar Map
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "terminal"
                ? "bg-white text-aegis-primary shadow-xs"
                : "text-aegis-on-surface-variant hover:text-aegis-primary"
            }`}
          >
            CLI Logs
          </button>
        </div>
      </div>

      {activeTab === "terminal" ? (
        <div className="flex-1 flex flex-col justify-between" id="cli-logs-layout-view">
          {/* Cybernetic HUD Indicators Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-2.5 flex items-center gap-2">
              <div className="bg-white p-1 rounded-full shadow-xs">
                <MapPin className="w-3.5 h-3.5 text-aegis-error" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-display font-bold text-aegis-on-surface-variant tracking-wider uppercase">ZONE</div>
                <div className="text-xs font-sans font-bold text-aegis-primary truncate">Byadrahalli</div>
              </div>
            </div>

            <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-2.5 flex items-center gap-2">
              <div className="bg-white p-1 rounded-full shadow-xs">
                <Navigation className="w-3.5 h-3.5 text-aegis-secondary animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-display font-bold text-aegis-on-surface-variant tracking-wider uppercase">VECTOR</div>
                <div className="text-xs font-sans font-bold text-aegis-primary truncate">12.9814°N</div>
              </div>
            </div>

            <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-2.5 flex items-center gap-2">
              <div className="bg-white p-1 rounded-full shadow-xs">
                <Cpu className="w-3.5 h-3.5 text-aegis-secondary" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-display font-bold text-aegis-on-surface-variant tracking-wider uppercase">ENGINE</div>
                <div className="text-xs font-sans font-bold text-aegis-primary truncate">Gemini-3.5</div>
              </div>
            </div>
          </div>

          {/* Live Logs Terminal Panel */}
          <div className="flex-1 min-h-[170px] bg-aegis-container-low border border-aegis-container rounded-2xl p-4 font-mono text-xs flex flex-col justify-between overflow-hidden shadow-inner">
            <div ref={scrollContainerRef} className="overflow-y-auto pr-1 flex-1 space-y-2 scrollbar-thin scrollbar-thumb-aegis-container max-h-[190px]">
              <div className="text-aegis-primary/60 border-b border-aegis-container pb-1.5 mb-2 flex items-center justify-between text-[10px]">
                <span className="font-bold">[SYS CONSOLE CONNECTED]</span>
                <span className="bg-aegis-container px-2 py-0.5 rounded-full">v1.2.4</span>
              </div>

              {logs.map((log, index) => {
                let isError = log.includes("[CRITICAL]") || log.includes("Error") || log.includes("denied");
                let isOk = log.includes("[OK]") || log.includes("Success") || log.includes("active");
                return (
                  <div
                    key={index}
                    className={`leading-relaxed break-all ${
                      isError 
                        ? "text-aegis-error font-bold" 
                        : isOk 
                        ? "text-aegis-secondary font-semibold" 
                        : "text-aegis-on-surface-variant"
                    }`}
                  >
                    <span className="text-aegis-on-secondary-container/40 mr-1.5">&gt;</span>
                    {log}
                  </div>
                );
              })}
            </div>
            
            {/* CLI Prompt simulation line */}
            <div className="mt-3 pt-2.5 border-t border-aegis-container flex items-center justify-between text-aegis-primary font-bold text-[10px]">
              <div className="flex items-center">
                <span className="animate-pulse mr-2 text-aegis-secondary">●</span>
                <span className="text-aegis-on-surface-variant tracking-wide font-sans">SYS ENGINE STATUS: ACTIVE SCAN RUNNING</span>
              </div>
              <button
                onClick={onClearLogs}
                className="text-[9px] hover:text-aegis-error transition-colors uppercase"
              >
                Clear Log
              </button>
            </div>
          </div>

          {/* Historical Dispatch / Escalation Ledger */}
          <div className="mt-4 flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="bg-aegis-secondary/10 p-1.5 rounded-full">
                <Shield className="w-4 h-4 text-aegis-secondary" />
              </div>
              <h3 className="text-xs font-display font-bold tracking-widest text-aegis-primary uppercase">
                Incidents Escalated to BBMP
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 bg-aegis-bg border border-aegis-container rounded-2xl p-3 max-h-[135px]">
              {historicalEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-4 text-center">
                  <Eye className="w-5 h-5 text-gray-400 mb-1" />
                  <p className="text-[10px] font-sans text-gray-500">
                    No telemetry dispatches on current shift.
                  </p>
                </div>
              ) : (
                historicalEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="bg-white border border-aegis-container rounded-xl p-3 flex items-center justify-between text-xs transition-all hover:bg-aegis-container-low shadow-xs"
                  >
                    <div className="space-y-1 max-w-[70%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-aegis-primary">
                          #{evt.id.substring(0, 10)}
                        </span>
                        <span className="text-[9px] font-display font-bold bg-aegis-error-container text-aegis-error px-2 py-0.5 rounded-full">
                          {evt.luxValue} Lux
                        </span>
                      </div>
                      <div className="text-[10px] text-aegis-on-surface-variant font-medium truncate">
                        {evt.ircCitation}
                      </div>
                      <div className="text-[9px] text-gray-400 truncate">
                        {evt.authority}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-display font-bold px-2.5 py-0.5 rounded-full ${
                        evt.status === "RESOLVED"
                          ? "bg-aegis-secondary-container text-aegis-on-secondary-container"
                          : evt.status === "REVIEW"
                          ? "bg-amber-100 text-amber-800"
                          : evt.status === "INVESTIGATING"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800 animate-pulse"
                      }`}>
                        {evt.status}
                      </span>
                      <div className="text-[8px] font-mono text-gray-400">
                        {evt.timestamp.includes(" ") ? evt.timestamp.split(" ")[1] : evt.timestamp}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col" id="spatial-map-layout-view">
          <SpatialMap
            gpsCoordinates={gpsCoordinates}
            incidents={historicalEvents}
            onUpdateStatus={onUpdateStatus}
            onUpdateGpsCoordinates={onUpdateGpsCoordinates}
            onLogsUpdate={onLogsUpdate}
          />
        </div>
      )}
    </div>
  );
}
