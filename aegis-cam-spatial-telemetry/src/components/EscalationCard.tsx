import React, { useState } from "react";
import { Shield, FileText, CheckCircle, Clock, AlertTriangle, Send, Copy, Sparkles, Building } from "lucide-react";
import { CivicReport, TelemetryEvent } from "../types";

interface EscalationCardProps {
  report: CivicReport | null;
  activeEvent: TelemetryEvent | null;
  isLoading: boolean;
  onDispatchSuccess: (report: CivicReport) => void;
}

export default function EscalationCard({
  report,
  activeEvent,
  isLoading,
  onDispatchSuccess
}: EscalationCardProps) {
  const [copied, setCopied] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDispatch = () => {
    if (!report) return;
    setDispatching(true);
    setTimeout(() => {
      setDispatching(false);
      setDispatched(true);
      onDispatchSuccess(report);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-aegis-container tactile-shadow flex flex-col h-full" id="escalation-card-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-aegis-container pb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-aegis-primary-container/10 p-2 rounded-full">
            <Shield className="w-5 h-5 text-aegis-secondary" />
          </div>
          <h2 className="text-xs font-display font-bold tracking-widest text-aegis-primary uppercase">
            Civic Escalation Matrix
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono text-aegis-on-surface-variant bg-aegis-container-low px-2.5 py-0.5 rounded-full">
          <Building className="w-3.5 h-3.5 text-aegis-secondary" />
          <span className="font-semibold text-[10px]">BBMP PGMS Hub</span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-aegis-container-low rounded-2xl border border-aegis-container min-h-[300px]">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-aegis-container border-t-aegis-secondary animate-spin"></div>
            <Sparkles className="w-6 h-6 text-warning-amber absolute top-5 left-5 animate-pulse" />
          </div>
          <h3 className="text-xs font-display font-bold text-aegis-primary mb-1.5 uppercase tracking-widest">
            Synthesizing Grievance File
          </h3>
          <p className="text-[11px] text-aegis-on-surface-variant max-w-xs leading-relaxed font-mono animate-pulse">
            Analyzing video frames...
            <br />
            Cross-referencing Indian Roads Congress (IRC) Codes...
            <br />
            Resolving Bruhat Bengaluru Mahanagara Palike jurisdiction...
          </p>
        </div>
      )}

      {/* Idle / No Event State */}
      {!isLoading && !report && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-aegis-container-low rounded-2xl border border-aegis-container min-h-[300px]">
          <div className="bg-white p-4 rounded-full shadow-xs mb-3">
            <FileText className="w-10 h-10 text-aegis-on-secondary-container" />
          </div>
          <h3 className="text-xs font-display font-bold text-aegis-primary mb-1.5 uppercase tracking-widest">
            Complaints Engine Standing By
          </h3>
          <p className="text-xs text-aegis-on-surface-variant max-w-xs leading-relaxed">
            Aegis-Cam will autonomously compile and display a legal complaint package here once a severe underpass lighting hazard (&gt; 220 Lux) is logged.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-white border border-aegis-container rounded-full px-3 py-1 text-[10px] font-mono text-aegis-secondary shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-aegis-secondary animate-ping"></span>
            Passive Optic Vigilance Active
          </div>
        </div>
      )}

      {/* Report Active State */}
      {!isLoading && report && (
        <div className="flex-1 flex flex-col space-y-4 z-10">
          
          {/* Metadata banner highlighting IRC & Authority - Tactile modernism floating widgets */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-display font-bold text-aegis-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-aegis-error" /> Legal Violation
              </span>
              <span className="text-xs font-mono font-bold text-aegis-primary mt-1.5 leading-snug">
                {report.ircCitation}
              </span>
            </div>

            <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-3 flex flex-col justify-between">
              <span className="text-[9px] font-display font-bold text-aegis-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-aegis-secondary" /> Responsible Division
              </span>
              <span className="text-xs font-mono font-bold text-aegis-secondary mt-1.5 leading-snug">
                {report.authority}
              </span>
            </div>
          </div>

          {/* Letter / Draft complaint file */}
          <div className="flex-1 flex flex-col bg-aegis-container-low border border-aegis-container rounded-2xl overflow-hidden shadow-inner">
            <div className="bg-aegis-container border-b border-aegis-container-high px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-aegis-primary font-bold">
                GRIEVANCE_FILE_#{activeEvent?.id.substring(0, 8).toUpperCase()}.MD
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="text-aegis-on-surface-variant hover:text-aegis-secondary transition-colors p-1 cursor-pointer"
                  title="Copy to Clipboard"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Letter Body in scrollable block */}
            <div className="p-4 overflow-y-auto max-h-[190px] font-mono text-[11px] text-aegis-on-surface leading-relaxed space-y-2 whitespace-pre-wrap bg-white/60">
              {report.generatedText}
            </div>
          </div>

          {/* Dispatch controls - Pill shaped modern layout */}
          <div className="border-t border-aegis-container pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-display font-bold text-aegis-on-surface-variant uppercase tracking-wider">
                Redressal Pipeline
              </span>
              <span className="text-xs font-bold text-aegis-primary">
                {dispatched ? "Sent to PGMS portal" : "Needs Dispatch"}
              </span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopy}
                className="flex-1 sm:flex-none px-3.5 h-10 rounded-full text-xs font-display font-bold border-2 border-aegis-primary text-aegis-primary hover:text-aegis-secondary hover:border-aegis-secondary transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {copied ? "Copied!" : "Copy Report"}
              </button>

              <button
                onClick={handleDispatch}
                disabled={dispatched || dispatching}
                className={`flex-1 sm:flex-none px-5 h-10 rounded-full text-xs font-display font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap ${
                  dispatched
                    ? "bg-aegis-secondary-container text-aegis-on-secondary-container border border-transparent cursor-default"
                    : dispatching
                    ? "bg-aegis-container text-gray-400 border border-transparent cursor-wait animate-pulse"
                    : "bg-aegis-secondary hover:bg-[#22523d] text-white border border-transparent active:scale-97 cursor-pointer"
                }`}
                id="dispatch-municipal-button"
              >
                {dispatched ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Dispatched!
                  </>
                ) : dispatching ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    File Grievance
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Receipt Overlay */}
          {dispatched && (
            <div className="bg-aegis-secondary-container/20 border border-aegis-secondary-container rounded-2xl p-3.5 flex items-start gap-2.5 animate-fade-in text-xs font-sans text-aegis-on-secondary-container shadow-xs">
              <CheckCircle className="text-aegis-secondary w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-display font-bold text-aegis-primary uppercase tracking-wider text-[10px]">
                  BBMP Grievance Redressal Dispatch Receipt
                </div>
                <div className="text-[11px] font-mono">
                  Transaction: <span className="font-bold">TX-{(activeEvent?.id || "92312").substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="text-[11px] font-mono">
                  IRC Section: <span className="text-aegis-error font-bold">{report.ircCitation}</span>
                </div>
                <div className="text-[10px] italic text-aegis-on-surface-variant">
                  Legally registered into Karnataka PGMS hub under BBMP ward spatial governance act. Authority notified.
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
