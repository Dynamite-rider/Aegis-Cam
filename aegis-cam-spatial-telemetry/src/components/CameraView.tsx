import React, { useRef, useEffect, useState } from "react";
import { Camera, AlertTriangle, Play, Pause, Zap, RefreshCw, Layers, Compass } from "lucide-react";
import { TelemetryEvent } from "../types";

interface CameraViewProps {
  onHazardDetected: (luxValue: number, frames: string[]) => void;
  currentStatus: TelemetryEvent["status"];
  onLogsUpdate: (log: string) => void;
}

export default function CameraView({ onHazardDetected, currentStatus, onLogsUpdate }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lux, setLux] = useState<number>(110);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [simulationMode, setSimulationMode] = useState(true);
  const simulationIntensityRef = useRef(110);
  const [isSimulatingUnderpass, setIsSimulatingUnderpass] = useState(false);
  const frameCountRef = useRef(0);

  // Initialize camera stream
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      console.log("[Aegis-Cam: Camera] Requesting access...");
      onLogsUpdate("Requesting camera and hardware location channels...");
      
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("navigator.mediaDevices.getUserMedia is not supported or permitted in this browser environment.");
      }

      const constraints = {
        video: {
          facingMode: "environment", // rear camera preferred for driving
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[Aegis-Cam: Camera] MediaStream track initialized successfully.");
      console.log("[Aegis-Cam: Camera] Access granted");
      console.log("[Aegis-Cam: Camera] Stream dimensions configured: 640x480");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setSimulationMode(false);
        onLogsUpdate("Hardware camera stream initiated. Passive monitoring active.");
      }
    } catch (err: any) {
      console.warn("[Aegis-Cam: Camera] Access denied or failed: ", err?.message || err);
      setErrorMsg(
        "Camera permission denied or camera unavailable. Falling back to the Aegis Telemetry Simulator."
      );
      setSimulationMode(true);
      onLogsUpdate("Camera permission deferred. Fallback telemetry engine initialized.");
    }
  };

  const stopCamera = () => {
    console.log("[Aegis-Cam: Camera] Stopping stream...");
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    onLogsUpdate("Telemetry feed paused by operator.");
  };

  // Periodic frame analysis (The Canvas Hack)
  useEffect(() => {
    let intervalId: any = null;

    if (streamActive && !simulationMode && currentStatus === "MONITORING") {
      const analyzeFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw current frame to small hidden canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          let totalLuminance = 0;

          // Sample pixels
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // Standard perceptual luminance formula
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            totalLuminance += luminance;
          }

          const avgLuminance = Math.round(totalLuminance / (data.length / 4));
          console.log(`[Aegis-Cam: Canvas] Frame brightness processed: ${avgLuminance} LUX`);
          setLux(avgLuminance);

          frameCountRef.current += 1;
          if (frameCountRef.current % 4 === 0) {
            onLogsUpdate(`Optic scan check: Luminance level at ${avgLuminance} Lux.`);
          }

          // Check if Lux violates safe parameters (> 220)
          if (avgLuminance > 220 && currentStatus === "MONITORING") {
            console.warn(`[Aegis-Cam: Canvas] CRITICAL BRIGHTNESS EXCEEDED: ${avgLuminance} Lux!`);
            onLogsUpdate(`[CRITICAL] Massive average pixel intensity spike detected: ${avgLuminance} Lux.`);
            triggerCaptureSequence(avgLuminance);
          }
        } catch (e) {
          console.error("[Aegis-Cam: Canvas] Pixel read failed: ", e);
        }
      };

      intervalId = setInterval(analyzeFrame, 500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [streamActive, simulationMode, currentStatus]);

  // Simulation mode loop
  useEffect(() => {
    let simInterval: any = null;

    if (simulationMode && currentStatus === "MONITORING") {
      simInterval = setInterval(() => {
        if (isSimulatingUnderpass) {
          // Accelerate intensity towards blinding glare
          const currentVal = simulationIntensityRef.current;
          const next = currentVal + Math.floor(Math.random() * 25) + 15;
          simulationIntensityRef.current = next;
          console.log(`[Aegis-Cam: Simulator] Accelerating transit glare. Current: ${next} Lux`);
          
          if (next >= 235) {
            // Lock high, trigger sequence
            clearInterval(simInterval);
            setLux(235);
            simulationIntensityRef.current = 235;
            console.warn(`[Aegis-Cam: Simulator] PEAK TRANSIT GLARE LOGGED: 235 Lux`);
            triggerCaptureSequence(235);
            setIsSimulatingUnderpass(false);
          } else {
            setLux(next);
          }
        } else {
          // Nominal driving glare fluctuations (100 - 140 Lux)
          const currentVal = simulationIntensityRef.current;
          const drift = Math.floor(Math.random() * 9) - 4;
          const next = Math.max(95, Math.min(135, currentVal + drift));
          simulationIntensityRef.current = next;
          console.log(`[Aegis-Cam: Simulator] Fluctuating road glare. Current: ${next} Lux`);
          setLux(next);

          frameCountRef.current += 1;
          if (frameCountRef.current % 4 === 0) {
            onLogsUpdate(`Optic scan check: Luminance level at ${next} Lux.`);
          }
        }
      }, 500);
    }

    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [simulationMode, isSimulatingUnderpass, currentStatus]);

  // Captures 3 sequential frames and triggers the report flow
  const triggerCaptureSequence = async (triggerLux: number) => {
    console.log("[Aegis-Cam: Core] Brightness threshold exceeded. Staging micro-burst payload for Gemini.");
    onLogsUpdate("Visual Hazard sequence engaged! Initiating 3-frame spatial capture sequence...");
    const frames: string[] = [];
    
    // Capture helper
    const captureSingleFrame = (): string => {
      const canvas = canvasRef.current;
      if (!canvas) return "";
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      if (simulationMode) {
        // Draw simulated premium high-glare underpass on the canvas, matching brand colors
        ctx.fillStyle = "#1b4332"; // Deep green tunnel background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Clean line-art routes like the design spec map!
        ctx.strokeStyle = "rgba(165, 208, 185, 0.3)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * 0.7);
        ctx.lineTo(canvas.width, canvas.height * 0.4);
        ctx.stroke();

        ctx.strokeStyle = "#a5d0b9";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width * 0.2, canvas.height);
        ctx.bezierCurveTo(canvas.width * 0.3, canvas.height * 0.5, canvas.width * 0.7, canvas.height * 0.4, canvas.width * 0.8, 0);
        ctx.stroke();

        // High beam blinding light circle
        const gradient = ctx.createRadialGradient(
          canvas.width / 2 + (Math.random() * 10 - 5),
          canvas.height / 2 - 10,
          2,
          canvas.width / 2,
          canvas.height / 2 - 10,
          65
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.3, "rgba(251, 191, 36, 0.9)"); // warn amber
        gradient.addColorStop(0.7, "rgba(44, 105, 78, 0.5)"); // brand secondary tint
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Overlay metadata watermarks
        ctx.font = "8px 'JetBrains Mono'";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("AEGIS SPATIAL TELEMETRY", 10, 20);
        ctx.fillText(`LUX: ${triggerLux} [CRITICAL]`, 10, 32);
        ctx.fillText("LOC: Magadi Main Road", 10, 44);
      } else {
        // Use real video elements
        const video = videoRef.current;
        if (video) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Draw telemetry overlay on captured output
          ctx.font = "8px 'JetBrains Mono'";
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(`AEGIS LIVE: ${triggerLux} Lux`, 10, 20);
          ctx.fillText("MAGADI ROAD BYADRAHALLI", 10, 32);
        }
      }

      return canvas.toDataURL("image/jpeg", 0.85);
    };

    // Staggered captures: 0ms, 400ms, 800ms
    for (let i = 0; i < 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, i === 0 ? 0 : 400));
      const frameBase64 = captureSingleFrame();
      frames.push(frameBase64);
      setCapturedFrames((prev) => [...prev, frameBase64]);
      onLogsUpdate(`Captured telemetry frame ${i + 1}/3 [OK]`);
    }

    onLogsUpdate("Multi-frame telemetry package bundled with geospatial vector keys.");
    onHazardDetected(triggerLux, frames);
  };

  const handleManualTrigger = () => {
    if (currentStatus !== "MONITORING") return;
    onLogsUpdate("Triggering simulated Byadrahalli Transit...");
    setIsSimulatingUnderpass(true);
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-aegis-container tactile-shadow flex flex-col h-full" id="camera-view-container">
      {/* Header and status lights */}
      <div className="flex items-center justify-between mb-4 border-b border-aegis-container pb-3 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-aegis-primary-container/10 p-2 rounded-full">
            <Camera className="w-5 h-5 text-aegis-secondary" />
          </div>
          <h2 className="text-xs font-display font-bold tracking-widest text-aegis-primary uppercase">
            Telemetry Optical Feed
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              currentStatus === "ESCALATED" ? "bg-aegis-error" : "bg-aegis-secondary"
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              currentStatus === "ESCALATED" ? "bg-aegis-error" : "bg-aegis-secondary"
            }`}></span>
          </span>
          <span className="text-xs font-mono font-semibold text-aegis-on-surface-variant bg-aegis-container-low px-2.5 py-0.5 rounded-full">
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Main visual viewfinder container - Pebble styled rounded corners */}
      <div className="relative bg-[#eceeec] rounded-2xl aspect-video w-full overflow-hidden flex items-center justify-center border border-aegis-container-high shadow-sm z-10 flex-1">
        
        {/* Hidden analysis canvas */}
        <canvas 
          ref={canvasRef} 
          width="320" 
          height="240" 
          className="hidden" 
        />

        {/* Polished Error Notification Overlay */}
        {errorMsg && (
          <div className="absolute top-12 left-3 right-3 bg-red-50/95 backdrop-blur-xs border border-red-200 p-2.5 rounded-xl text-[10px] text-red-800 z-40 flex items-start gap-2 shadow-sm animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">Hardware Feed Unavailable</p>
              <p className="text-red-700 leading-tight font-medium">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setErrorMsg(null)}
              className="text-red-500 hover:text-red-700 font-bold px-1 cursor-pointer text-xs select-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Real camera video tag */}
        {!simulationMode && (
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              streamActive ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Simulated driver viewport animation if in Simulation Mode */}
        {simulationMode && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#334155] flex flex-col justify-between select-none overflow-hidden">
            
            {/* Top HUD overlay and status indicator */}
            <div className="flex justify-between items-center p-2 sm:p-3 z-30 bg-slate-950/40 backdrop-blur-xs border-b border-white/5 gap-2">
              <div className="flex items-center gap-1.5 text-[8.5px] min-[360px]:text-[10px] font-mono text-white font-bold truncate">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse inline-block shrink-0" />
                <span className="truncate">ACTIVE DRIVER EYE-LINE FEED</span>
              </div>
              <div className="bg-aegis-secondary-container/80 text-aegis-on-secondary-container px-1.5 sm:px-2.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold tracking-wider shrink-0">
                AUTO_GAIN_ACTIVE
              </div>
            </div>

            {/* Simulated 3D highway environment */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              
              {/* Sky Sunset horizon glow */}
              <div className="absolute top-[35%] inset-x-0 h-12 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />

              {/* Concrete Underpass Arch Portal Looming on Horizon */}
              <div 
                className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-[800ms] ease-out border-[12px] border-b-0 border-slate-700 bg-black/50 rounded-t-full flex items-center justify-center ${
                  isSimulatingUnderpass 
                    ? "w-80 h-52 border-slate-600 opacity-100 scale-125" 
                    : "w-36 h-24 border-slate-800 opacity-70 scale-100"
                }`}
                style={{
                  boxShadow: "inset 0 4px 16px rgba(0,0,0,0.9), 0 8px 16px rgba(0,0,0,0.6)"
                }}
              >
                {/* Simulated underpass darkness depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-90 rounded-t-full" />
              </div>

              {/* True Perspective Road Asphalt Layout */}
              <div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[160%] h-[60%] bg-gradient-to-t from-[#1e222a] via-[#1b1c21] to-[#111316] origin-bottom [clip-path:polygon(42%_0%,_58%_0%,_100%_100%,_0%_100%)] border-t border-slate-600"
              />

              {/* Highway Yellow Shoulder Lines */}
              <div className="absolute bottom-0 left-[18%] w-1.5 h-[60%] bg-amber-500/20 origin-bottom [clip-path:polygon(48%_0%,_52%_0%,_100%_100%,_0%_100%)]" />
              <div className="absolute bottom-0 right-[18%] w-1.5 h-[60%] bg-amber-500/20 origin-bottom [clip-path:polygon(48%_0%,_52%_0%,_100%_100%,_0%_100%)]" />

              {/* Continuously moving center dash lane stripes */}
              <div className="absolute top-[40%] left-1/2 w-1.5 h-12 bg-white/70 -translate-x-1/2 animate-road-stripe" />
              <div className="absolute top-[40%] left-1/2 w-1.5 h-12 bg-white/70 -translate-x-1/2 animate-road-stripe" style={{ animationDelay: '0.4s' }} />
              <div className="absolute top-[40%] left-1/2 w-1.5 h-12 bg-white/70 -translate-x-1/2 animate-road-stripe" style={{ animationDelay: '0.8s' }} />

              {/* Road side cat-eye markers floating down in 3D perspective */}
              <div className="absolute top-[40%] left-1/2 w-1.5 h-1.5 rounded-full bg-white/80 animate-side-left" />
              <div className="absolute top-[40%] left-1/2 w-1.5 h-1.5 rounded-full bg-white/80 animate-side-left" style={{ animationDelay: '0.7s' }} />
              <div className="absolute top-[40%] left-1/2 w-1.5 h-1.5 rounded-full bg-white/80 animate-side-right" />
              <div className="absolute top-[40%] left-1/2 w-1.5 h-1.5 rounded-full bg-white/80 animate-side-right" style={{ animationDelay: '0.7s' }} />

              {/* Blinding Solar Glare Source */}
              <div className={`absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
                isSimulatingUnderpass 
                  ? "bg-white scale-[8.0] blur-2xl opacity-100" 
                  : "bg-warning-amber/40 scale-125 blur-lg opacity-85"
              } w-16 h-16 z-20`} style={{
                boxShadow: isSimulatingUnderpass 
                  ? "0 0 140px 80px rgba(255, 255, 255, 1), 0 0 240px 140px rgba(251, 191, 36, 0.85)" 
                  : "0 0 45px 15px rgba(251, 191, 36, 0.45)"
              }} />

              {/* Central situational text overlay badge */}
              <div className="text-center z-30 bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 shadow-lg max-w-[85%] mt-12">
                {isSimulatingUnderpass ? (
                  <p className="text-[10px] font-mono font-bold text-red-500 tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    APPROACHING UNDERPASS PORTAL...
                  </p>
                ) : currentStatus === "HAZARD_DETECTED" ? (
                  <p className="text-[10px] font-mono font-bold text-red-500 tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    CAPTURING HIGH-CONTRAST EPHEMERAL STATE
                  </p>
                ) : (
                  <p className="text-[10px] font-mono font-bold text-slate-300 tracking-wider flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    DRIVING MAGADI MAIN RD
                  </p>
                )}
              </div>
            </div>

            {/* Dashboard cockpit overlay at bottom of viewfinder */}
            <div className="w-full bg-slate-950 border-t border-slate-800/80 px-2.5 sm:px-3.5 py-2 sm:py-2.5 flex flex-col min-[420px]:flex-row min-[420px]:items-center justify-between gap-1.5 sm:gap-2 z-30 font-mono text-[8px] sm:text-[9px] text-slate-400">
              <div className="flex items-center gap-1.5 shrink-0">
                <Compass className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-aegis-secondary shrink-0 animate-spin [animation-duration:12s]" />
                <span className="tracking-tight">COORD: 12.9814°N, 77.4912°E</span>
              </div>
              <div className="flex items-center justify-between min-[420px]:justify-end gap-2 sm:gap-3 border-t border-slate-900 min-[420px]:border-t-0 pt-1.5 min-[420px]:pt-0 mt-0.5 min-[420px]:mt-0 w-full min-[420px]:w-auto">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span>GEAR: <b className="text-white">D4</b></span>
                  <span>SYS_TEMP: <b className="text-green-400">38°C</b></span>
                </div>
                <span className="text-aegis-secondary font-black tracking-wider shrink-0 uppercase">MONITORING LIVE</span>
              </div>
            </div>

          </div>
        )}

        {/* Viewfinder Grid overlay */}
        <div className="absolute inset-0 border border-aegis-primary/5 pointer-events-none flex items-center justify-center">
          <div className="border-l border-aegis-primary/5 h-full absolute left-1/2"></div>
          <div className="border-t border-aegis-primary/5 w-full absolute top-1/2"></div>
          {/* Target Reticle */}
          <div className="w-14 h-14 border-2 border-dashed border-aegis-secondary/25 rounded-full animate-spin [animation-duration:20s]" />
        </div>

        {/* Big Alert Overlay if status is HAZARD_DETECTED */}
        {currentStatus === "HAZARD_DETECTED" && (
          <div className="absolute inset-0 bg-aegis-error-container/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center z-20 animate-fade-in">
            <div className="bg-white p-3 rounded-full shadow-md mb-2">
              <AlertTriangle className="w-10 h-10 text-aegis-error animate-bounce" />
            </div>
            <h3 className="text-aegis-error font-headline font-bold text-base uppercase tracking-wider">
              Luminance Peak Registered
            </h3>
            <p className="text-xs text-aegis-on-surface-variant max-w-xs mt-1.5 font-sans leading-relaxed">
              Average pixel intensity exceeded critical driver bounds (&gt; 220 Lux). Auto-dispatch pipeline engaged.
            </p>
            <div className="mt-3 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-aegis-error animate-ping" style={{ animationDelay: `${i * 300}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control panel and sensors */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 z-10">
        
        {/* Lux Sensor readout - Styled with Space Grotesk per image design system */}
        <div className="bg-aegis-container-low border border-aegis-container rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-display font-bold tracking-wider text-aegis-on-surface-variant uppercase">
              Luminance Level
            </span>
            <Zap className={`w-4 h-4 ${lux > 220 ? 'text-aegis-error animate-pulse' : 'text-aegis-secondary'}`} />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className={`text-[36px] font-display font-bold tracking-tight leading-none ${
              lux > 220 ? "text-aegis-error" : "text-aegis-primary"
            }`}>
              {lux}
            </span>
            <span className="text-xs font-mono text-aegis-on-surface-variant font-medium">
              Lux
            </span>
          </div>
          {/* Visual Lux Bar graph with fully rounded ends */}
          <div className="w-full bg-aegis-container rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                lux > 220 ? "bg-aegis-error" : "bg-aegis-secondary"
              }`}
              style={{ width: `${Math.min(100, (lux / 255) * 100)}%` }}
            />
          </div>
        </div>

        {/* Camera state buttons - Pill shaped controls consistent with image specs */}
        <div className="flex flex-col gap-2.5 justify-center">
          {simulationMode ? (
            <button
              onClick={handleManualTrigger}
              disabled={currentStatus !== "MONITORING" || isSimulatingUnderpass}
              className={`w-full py-3 px-4 rounded-full text-xs font-display font-bold tracking-wider transition-all border flex items-center justify-center gap-2 ${
                isSimulatingUnderpass
                  ? "bg-aegis-container text-gray-400 border-transparent cursor-wait"
                  : currentStatus !== "MONITORING"
                  ? "bg-aegis-container-low text-gray-400 border-transparent cursor-not-allowed"
                  : "bg-aegis-secondary hover:bg-[#22523d] text-white border-transparent active:scale-97 cursor-pointer shadow-sm"
              }`}
              id="simulate-transit-button"
            >
              <Zap className="w-4 h-4 text-white" />
              Transit Glare Test
            </button>
          ) : (
            <button
              onClick={streamActive ? stopCamera : startCamera}
              className={`w-full py-3 px-4 rounded-full text-xs font-display font-bold tracking-wider transition-all border flex items-center justify-center gap-2 ${
                streamActive
                  ? "bg-aegis-error-container text-aegis-error border-aegis-error/20 hover:bg-aegis-error/10"
                  : "bg-aegis-secondary hover:bg-[#22523d] text-white border-transparent"
              }`}
              id="toggle-hardware-camera-button"
            >
              {streamActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Sensor
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Arm Sensor
                </>
              )}
            </button>
          )}

          {/* Toggle between hardware camera and simulation - Pill shaped outline button */}
          <button
            onClick={() => {
              if (simulationMode) {
                setSimulationMode(false);
                startCamera();
              } else {
                stopCamera();
                setSimulationMode(true);
                onLogsUpdate("Switched telemetry engine to virtual flight deck.");
              }
            }}
            className="w-full h-11 rounded-full text-[11px] font-display font-bold text-aegis-primary hover:text-aegis-secondary border-2 border-aegis-primary hover:border-aegis-secondary bg-transparent transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            id="toggle-mode-button"
          >
            <RefreshCw className="w-3.5 h-3.5 text-current" />
            {simulationMode ? "Switch to Live Cam" : "Switch to Simulator"}
          </button>
        </div>
      </div>

      {/* Captured Frames Previews */}
      {capturedFrames.length > 0 && (
        <div className="mt-4 bg-aegis-container-low border border-aegis-container rounded-2xl p-3 z-10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-display font-bold text-aegis-primary uppercase tracking-wider">
              Incident Frames (3 Captured)
            </span>
            <button
              onClick={() => setCapturedFrames([])}
              className="text-[10px] font-display font-bold text-aegis-secondary hover:text-aegis-primary cursor-pointer"
            >
              Clear Buffer
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {capturedFrames.slice(-3).map((frame, idx) => (
              <div
                key={idx}
                className="aspect-video bg-[#eceeec] rounded-lg border border-aegis-container overflow-hidden relative group hover:border-aegis-secondary transition-colors shadow-xs"
              >
                <img
                  src={frame}
                  alt={`Frame ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-aegis-primary/60 flex items-center justify-center text-[8px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  FRAME 0{idx + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
