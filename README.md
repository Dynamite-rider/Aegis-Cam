# Aegis-Cam | Agentic Spatial Telemetry Engine

**Vibe2Ship Hackathon 2026** — *Community Hero Track*

Aegis-Cam is a passive, multi-modal AI pipeline that acts as a continuous digital dashcam auditor. It identifies high-speed infrastructure hazards (specifically sudden underpass glare/washout zones) via edge-device video analysis and autonomously dispatches legally structured civic escalations using an agentic AI workflow. 

🔗 **Live Deployment (GCP):** https://aegis-cam-spatial-telemetry-256478858055.asia-southeast1.run.app
🎥 **Demo Video (Optional but recommended):** https://drive.google.com/file/d/1Oxlqs1gO3jYCVwnzRJXuwCjlcs8YfzTJ/view?usp=drive_link

## 🏗️ System Architecture (Agentic Depth)
This project compresses a massive civic data pipeline into a single, scalable agentic workflow powered entirely by Google's foundational models.

1. **Edge Telemetry Sensor (`Gemini 1.5 Flash`):**
   - Utilizes client-side WebRTC HTML5 Canvas to process video frames.
   - Triggers on an un-adapted luminance spike (> 220 Lux).
   - Ingests the spatial frame and calculates the washout severity score, outputting a strict JSON telemetry payload with zero human intervention.
2. **Civic Accountability Dispatcher (`Gemini 1.5 Pro`):**
   - Ingests the verified JSON telemetry array.
   - Autonomously synthesizes a localized, legally bound public grievance petition addressed to municipal zones, citing explicit Indian Roads Congress (IRC:SP:87) transition lighting statutes.

## 💻 Tech Stack
- **AI/LLM Core:** Google AI Studio (Gemini 1.5 Flash, Gemini 1.5 Pro) via `@google/generative-ai` SDK.
- **Frontend & Routing:** Next.js (App Router), React, TypeScript.
- **UI/UX:** Tailwind CSS (Tactical, high-contrast B2B aesthetic).
- **Deployment & Infrastructure:** Google Cloud Platform (Firebase App Hosting).

## ⚖️ Open Source Attributions
- Built for the Coding Ninjas x Google for Developers Vibe2Ship Hackathon.
- UI structural inspiration derived from modern tactical B2B dashboards.
- All geospatial coordination and fovea recovery math simulates real-world Indian Roads Congress tolerances for demonstration purposes.
