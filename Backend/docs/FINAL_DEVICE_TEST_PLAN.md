# MediVoice Final Device Test Plan

Use this checklist on a **physical Android device** before the final-year demonstration.

## Prerequisites

1. Backend running: `cd backend && npm run start:dev`
2. MongoDB connected via `backend/.env`
3. Flutter API URL set for your device:

```bash
# Find your computer LAN IP (e.g. 192.168.1.42)
flutter run --dart-define=API_BASE_URL=http://<LAN-IP>:3000
```

| Target | API_BASE_URL |
|--------|----------------|
| Android Emulator | `http://10.0.2.2:3000` |
| Physical Android (same Wi‑Fi) | `http://<LAN-IP>:3000` |
| iOS Simulator | `http://localhost:3000` |

4. Optional for full voice/AI: `GEMINI_API_KEY`, Whisper service, Piper configured on backend host

---

## Permissions

- [ ] Camera — medicine scan + prescription
- [ ] Microphone — voice commands + chat
- [ ] Notifications — reminder alerts (Android 13+ POST_NOTIFICATIONS)

---

## Camera & Scanner

- [ ] Barcode scan identifies medicine (or shows not-found gracefully)
- [ ] Camera capture for medicine image
- [ ] Prescription photo upload
- [ ] Gallery image upload
- [ ] Permission denied → useful error, no crash
- [ ] Retry after granting permission

---

## Voice

- [ ] Home voice greeting plays (if Piper configured)
- [ ] "Scan medicine" opens scanner
- [ ] "Scan prescription" opens prescription
- [ ] "My medicines" opens medicine list
- [ ] "Show reminders" opens today's reminders
- [ ] "Start chatbot" opens chat
- [ ] Unrecognized speech shows help message
- [ ] Cancel / stop does not crash

---

## Notifications (manual timing verification)

1. Confirm a prescription with reminders scheduled **2–5 minutes** ahead
2. Open Reminders screen (triggers `syncReminders`)
3. Background the app
4. [ ] Notification fires at approximately scheduled time
5. [ ] Mark taken → notification cleared/resynced
6. [ ] Skip → notification cleared/resynced
7. [ ] Multiple medicines → separate notifications (may be ~10 min apart)

**Note:** Inexact scheduling on Android may vary by ±few minutes.

---

## Network

- [ ] Backend reachable — login works
- [ ] Backend stopped — friendly "Unable to connect" message, no crash
- [ ] Slow network — loading indicators, no infinite spinner

---

## Authentication

- [ ] Signup → login
- [ ] Login → home
- [ ] Kill app → reopen → still logged in
- [ ] Logout → login screen, voice stopped
- [ ] Forgot password → email submitted
- [ ] Reset password with dev token (from backend log if SMTP unset)

---

## Demo Script (recommended order)

1. **Login** (UI, not voice auth)
2. **Voice:** "Scan medicine" → barcode → result + TTS
3. **Prescription:** upload → review → confirm → reminders
4. **Reminders:** mark one taken, skip one
5. **My Medicines:** verify list
6. **Chat:** ask general medicine question (informational only)
7. **History:** verify activity appears

---

## Known Device Limitations

- Notification timing not verified until physical test marked above
- Voice auth unreliable — use UI login for demo
- Gemini free tier may hit quota → chat shows "AI service temporarily unavailable"
- Prescription AI failure still allows deterministic OCR fallback when OCR text exists
