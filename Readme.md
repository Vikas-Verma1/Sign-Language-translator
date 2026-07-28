# SignBridge — Real-time Audio → ASL Avatar

A browser app that listens to spoken English, converts it to an **ASL gloss** sequence,
and drives a **rigged 3D human avatar** (WebGL / three.js) that performs the signs,
while speaking each gloss token aloud.

## Stack
- **Frontend:** React 18 + Vite 5 + three.js 0.165 (Web Speech API for input, Web Speech Synthesis for output)
- **Backend:** Express 4 + CORS (currently a health-check stub on `:5000`)

## Run