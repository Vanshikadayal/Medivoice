# MediVoice E2E Test Matrix

Status values: `PASS` | `FAIL` | `PARTIAL` | `NOT RUN` | `MANUAL`

Record results during validation. Do not fabricate pass status.

| ID | Feature | Action | Expected Result | Status | Notes |
|----|---------|--------|-----------------|--------|-------|
| AUTH-01 | Signup | Create account via UI | Account created, redirect to login | NOT RUN | Automated: `auth_ui_test.dart` |
| AUTH-02 | Login | Login with valid credentials | JWT stored, navigate Home | NOT RUN | Automated: `auth_ui_test.dart` |
| AUTH-03 | Session restore | Kill app, reopen | Home if token valid | NOT RUN | Manual device |
| AUTH-04 | Logout | Profile logout | Tokens cleared, voice stopped | NOT RUN | Manual |
| AUTH-05 | Forgot password | Submit email | Success message shown | NOT RUN | Automated: `forgot_password_test.dart` |
| AUTH-06 | Reset password | Token + new password | Success, return login | NOT RUN | Manual (needs token) |
| MED-01 | Barcode scan | POST `/medicine-scanner/barcode` | Medicine result or not-found | NOT RUN | Automated scanner tests |
| MED-02 | Image scan | POST `/medicine-scanner/image` | OCR + identification | NOT RUN | Automated |
| MED-03 | Medicine not found | Unknown barcode | UI shows not-found, no crash | NOT RUN | |
| MED-04 | Medicine list | GET `/medicines` | List renders | NOT RUN | |
| MED-05 | Medicine details | Tap medicine | Details screen | NOT RUN | |
| RX-01 | Upload prescription | Multipart `image` | Prescription created | NOT RUN | Automated prescription tests |
| RX-02 | Process | POST `.../process` | Review medicines returned | NOT RUN | Automated |
| RX-03 | AI extraction | Gemini available | Structured medicines in review | NOT RUN | Requires GEMINI_API_KEY |
| RX-04 | AI failure | Gemini quota/timeout | Deterministic fallback, no crash | NOT RUN | Backend falls back |
| RX-05 | Review | User edits medicines | Edits preserved | NOT RUN | `prescription_review_test.dart` |
| RX-06 | Confirm | POST `.../confirm` | Medicines + reminders created | NOT RUN | Automated |
| RX-07 | Multiple medicines | Rx with 2+ meds | Separate records + spaced reminders | NOT RUN | Backend integration tests |
| REM-01 | Today's reminders | GET `/reminders/today` | Grouped list | NOT RUN | |
| REM-02 | Take reminder | PATCH status `TAKEN` | Status updated, notification resynced | NOT RUN | |
| REM-03 | Skip reminder | PATCH status `SKIPPED` | Status updated | NOT RUN | |
| REM-04 | Multiple reminders | 2+ medicines same day | 10-min spacing (backend) | NOT RUN | Backend unit tests |
| REM-05 | Local notification | Schedule pending reminder | OS notification fires | NOT RUN | **Manual device only** |
| CHAT-01 | Text chatbot | POST `/chat` | Assistant reply | NOT RUN | Requires Gemini |
| CHAT-02 | Voice chatbot | POST `/chat/voice` | Transcript + reply + audio | NOT RUN | Requires Whisper+Piper |
| CHAT-03 | TTS | `/voice/speak` | Audio playback | NOT RUN | |
| CHAT-04 | Gemini failure | 429 from API | Friendly AI unavailable message | NOT RUN | Mapper tested |
| VOICE-01 | Scan medicine | Say "scan medicine" | Opens scanner | NOT RUN | `voice_intent_parser_test.dart` |
| VOICE-02 | Scan prescription | Say "scan prescription" | Opens prescription | NOT RUN | |
| VOICE-03 | Chat command | Say "start chatbot" | Opens chat | NOT RUN | |
| VOICE-04 | Reminder command | Say "show reminders" | Opens reminders | NOT RUN | |
| VOICE-05 | Medicines command | Say "my medicines" | Opens medicines list | NOT RUN | |
| VOICE-06 | History command | Say "show history" | Opens history | NOT RUN | |
| HIST-01 | History display | GET `/history` + stats | Adherence + activity list | NOT RUN | |
| ACC-01 | Screen reader | Semantics on key controls | Meaningful labels | PARTIAL | Semantics on auth, reminders, medicines, history |
| ACC-02 | Voice navigation | Voice intents route correctly | Correct screen | NOT RUN | |
| ACC-03 | Reminder controls | Mark taken / Skip | Accessible button labels | NOT RUN | |

## Automated Test Baseline (last run: 2026-08-20)

| Suite | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test` | 206/206 |
| `flutter analyze` | 0 issues |
| `flutter test` | 174/174 |
| `flutter build apk --debug` | NOT VERIFIED (Android SDK unavailable) |

## Critical Demo Flows

| Flow | IDs | Demo ready |
|------|-----|------------|
| Login → scan medicine | AUTH-02, MED-01 | Pending manual |
| Prescription → reminders | RX-01–06, REM-01 | Pending manual |
| Voice navigation | VOICE-01–06 | Pending manual |
| Chatbot | CHAT-01, CHAT-04 | Pending manual |
