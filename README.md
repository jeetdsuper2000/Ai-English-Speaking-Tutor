# Speakly — AI English Speaking Tutor MVP

A voice-first English speaking tutor built with Vite + vanilla JavaScript.

## What is implemented

- Browser microphone → SpeechRecognition → tutor/correction engine → SpeechSynthesis
- English, Hindi and Hinglish input scaffolding
- Important-error interruption and repeat flow
- Scenario selection
- Adaptive practice based on weak areas
- Local recurring-mistake memory
- Progress tracking
- Session history
- Responsive mobile-first UI
- Mock/local provider architecture without paid APIs
- No database or payment dependency

## Run

```bash
npm install
npm run dev
```

Open the Vite URL in a browser. For microphone access, use a supported browser and allow microphone permission. Chrome on Android is a practical first test.

## Architecture note

The MVP intentionally keeps the learning memory separate from speech recognition and the tutor engine. The current implementation is local/browser-based so it can be tested at ₹0.

For production, replace the local `analyzeSpeech()` / `tutorResponse()` layer with an API-backed `AIProvider`, while keeping the UI/session state contract intact. Replace browser SpeechRecognition and SpeechSynthesis with streaming STT/TTS providers later.

## Memory behavior

The app stores practice memory in `localStorage` under:

` speakly_tutor_v1 `

It remembers:
- correction category
- original sentence
- corrected sentence
- recurrence count
- weak-area scores
- sessions

Repeated mistakes influence future prompts. This is separate from ChatGPT memory and is the app's own learner memory.

## Important limitation

Browser-native speech recognition is not a full semantic AI model and browser support varies. The included Hindi/Hinglish rules are an offline MVP scaffold, not a claim of unlimited Hindi understanding. A real LLM endpoint should be connected later for robust semantic understanding, grammar analysis, pronunciation analysis, and natural conversation.
