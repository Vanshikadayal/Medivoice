# Flutter Frontend Integration Guide

Implementation-ready guide for connecting the MediVoice Flutter app to the NestJS backend.  
All endpoints verified from `backend/src/**/*.controller.ts` and `frontend/lib/core/constants/api_constants.dart`.

---

## Base URL

Configured in `frontend/lib/core/constants/api_constants.dart`:

```dart
static const String baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);
```

| Environment | URL |
|-------------|-----|
| iOS Simulator / Chrome / macOS | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Physical device | `http://<YOUR_LAN_IP>:3000` |

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

**Timeouts:** connect 15s, receive 60s (`ApiConstants`).

---

## HTTP Client Architecture

Existing structure (do not duplicate):

```text
lib/
├── core/
│   ├── constants/api_constants.dart    # All route paths
│   ├── network/api_client.dart         # JWT, refresh, multipart
│   ├── network/api_exception.dart      # Typed errors
│   └── storage/token_storage.dart      # Secure JWT storage
├── features/
│   ├── auth/data/auth_api.dart
│   ├── scanner/data/scanner_api.dart
│   ├── prescription/data/prescription_api.dart
│   ├── medicines/data/medicine_api.dart
│   ├── reminders/data/reminder_api.dart
│   ├── history/data/history_api.dart
│   └── chat/data/chat_api.dart
```

**Pattern:** Screen → Repository → `*Api` → `ApiClient.shared`

---

## Headers

### JSON endpoints

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
```

`ApiClient` adds `Authorization` automatically when a token exists.

### Multipart endpoints

Do **not** set `Content-Type` manually. `ApiClient.multipart()` sets boundary.

| Endpoint | Field name | Type |
|----------|------------|------|
| `POST /medicine-scanner/image` | `image` | jpg/png/webp, max 5MB |
| `POST /prescriptions/upload` | `image` | jpg/png/webp, max 5MB |
| `POST /chat/voice` | `audio` | audio file |
| `POST /voice/transcribe` | `audio` | audio file |

---

## Token Management

### Storage (`TokenStorage`)

| Key | Content |
|-----|---------|
| access token | JWT (10h expiry) |
| refresh token | UUID (3-day DB expiry) |
| userId | MongoDB ObjectId string |

Uses `flutter_secure_storage`.

### Login flow

```dart
final response = await authApi.login(LoginRequest(...));
await tokenStorage.saveAccessToken(response.accessToken);
await tokenStorage.saveRefreshToken(response.refreshToken);
await tokenStorage.saveUserId(response.userId);
final user = await authApi.getCurrentUser();
```

### 401 handling (`ApiClient`)

1. Request fails with 401
2. If `allowRefresh` and not auth endpoint → `POST /auth/refresh` `{ refreshToken }`
3. Save new tokens, retry request once
4. If refresh fails → clear tokens (unauthorized)

Auth endpoints skip refresh: `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`

### Logout

```dart
await authRepository.logout(); // clears secure storage only
await voiceSessionCleanup();   // stops TTS/STT
```

**No backend logout endpoint exists.**

---

## Screen → API Mapping

| Screen | API Call | Method | Notes |
|--------|----------|--------|-------|
| SplashScreen | `GET /users/me` | GET | Session restore |
| LoginScreen | `POST /auth/login` | POST | Then `GET /users/me` |
| SignupScreen | `POST /auth/signup` | POST | Empty body on success |
| ForgotPasswordScreen | `POST /auth/forgot-password` | POST | |
| ResetPasswordScreen | `PUT /auth/reset-password` | PUT | |
| HomeScreen | — | — | Voice uses `/voice/*` only |
| ScannerScreen | `POST /medicine-scanner/barcode` or `/image` | POST | JWT |
| PrescriptionScreen | `POST /prescriptions/upload` → `POST .../process` | POST | Multipart then JSON |
| PrescriptionReviewScreen | `POST /prescriptions/:id/confirm` | POST | |
| MedicinesScreen | `GET /medicines` | GET | |
| MedicineDetailScreen | `GET /medicines/:id` | GET | |
| RemindersScreen | `GET /reminders/today`, `GET /medicines` | GET | Enriches names |
| RemindersScreen (action) | `PATCH /reminders/:id/status` | PATCH | `TAKEN` / `SKIPPED` |
| ChatScreen | `POST /chat`, `POST /chat/voice` | POST | |
| HistoryScreen | `GET /history`, `GET /history/stats` | GET | |
| ProfileScreen | `GET /users/me`, `PATCH /users/me`, `PUT /auth/change-password` | mixed | |

---

## Feature Integration Details

### Medicine Scanner

```dart
// Barcode
await scannerApi.scanBarcode('8901234567890');

// Image
await scannerApi.scanImage(bytes: bytes, filename: 'scan.jpg', mimeType: 'image/jpeg');
```

**Response fields to use:**
- `found` (bool)
- `identification` — normalized display (`medicineName`, `activeIngredients`, `confidence`, `identificationMethod`)
- `speechSummary` — pass to Piper via `/voice/speak`
- `message` — user-facing when not found

### Prescription

```dart
final rx = await prescriptionApi.uploadImage(...);
final review = await prescriptionApi.process(rx.id);
// User edits ReviewMedicine list
final result = await prescriptionApi.confirm(id: rx.id, medicines: editedList);
// result.remindersCreated
```

**Do not call** `/ocr` or `/extract-medicines` separately in the main flow — `process` handles the full pipeline. Those endpoints exist for granular/debug use.

### Reminders

```dart
final today = await reminderApi.getToday();
await reminderApi.updateStatus(id: id, status: 'TAKEN'); // or 'SKIPPED'
```

After loading reminders:

```dart
await ReminderNotificationService.instance.syncReminders(today);
```

**Status values (exact strings):** `TAKEN`, `SKIPPED`, `MISSED` (backend enum)

### Chat

```dart
final conv = await chatApi.createConversation();
final response = await chatApi.sendMessage(
  conversationId: conv.id,
  message: 'What is paracetamol used for?',
);
// response.message, response.safetyLevel
```

### Voice (pre-auth)

```dart
// TTS
POST /voice/speak { "text": "What would you like to do?" }
// Response: { success, text, audio: { mimeType, data: base64 } }

// STT
POST /voice/transcribe (multipart audio)
// Response: { success, transcript } or { success: false, message }
```

---

## Voice Intents (Flutter-only)

Parsed in `VoiceIntentParser` — no backend intent API.

| User says (examples) | Intent | Route |
|---------------------|--------|-------|
| scan medicine, identify medicine | `scanMedicine` | `/scanner` |
| scan prescription, upload prescription | `scanPrescription` | `/prescription` |
| start chatbot, talk to doctor | `chat` | `/chat` |
| open chat, voice bot | `openChat` | `/chat` |
| show reminders, today's medicines | `reminders` | `/reminders` |
| my medicines, medicine list | `medicines` | `/medicines` |
| show history | `history` | `/history` |
| open profile | `profile` | `/profile` |
| help, what can you do | `help` | (stay on home) |
| repeat, say again | `repeat` | (stay on home) |
| cancel, stop | `cancel` | (stay on home) |

Full phrase list: see `docs/API_REFERENCE.md` § Voice Intents.

---

## Error Handling

`ApiException` types from `api_client.dart`:

| HTTP | ApiErrorType | Flutter action |
|------|--------------|----------------|
| 400 | validation | Show `message` from NestJS |
| 401 | unauthorized | Clear session → login |
| 403 | forbidden | Show permission error |
| 404 | notFound | Show not found |
| 413 | payloadTooLarge | File too large message |
| 429 | rateLimited | Retry later (Gemini maps to 503 in practice) |
| 5xx | server | Generic retry message |
| Network | network | Check connection |

NestJS validation errors return:

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

Use `UserFacingErrorMapper` / `AuthErrorMapper` — do not show stack traces.

---

## Flutter Integration Checklist

```text
[x] Configure base URL (ApiConstants / dart-define)
[x] HTTP client (ApiClient)
[x] JWT secure storage (TokenStorage)
[x] Auth interceptor + refresh (ApiClient._send)
[x] Login
[x] Signup
[x] Forgot password
[x] Reset password
[x] Medicine scanner (barcode + image)
[x] Prescription upload
[x] Prescription review
[x] Prescription confirmation
[x] Reminders (today + status)
[x] Local notifications
[x] Medicine list
[x] Chatbot (text + voice)
[x] Voice utilities (speak/transcribe)
[x] History
[ ] Manual reminder generate UI (API exists, no dedicated screen)
[ ] Prescription delete UI (API exists in repository)
[ ] Medicine delete UI (API exists in repository)
[ ] GET /reminders/:id detail via API (screen uses passed object)
[ ] POST /history/reminder/:id (backend only; Flutter uses PATCH status)
[ ] GET /history/date/:date (backend only)
[ ] GET /history/medicine/:medicineId (backend only)
[ ] POST /prescriptions/:id/ocr (not used in main flow)
[ ] POST /prescriptions/:id/extract-medicines (not used in main flow)
[x] Test 401 handling
[ ] Test 403 handling (only /products uses RBAC)
[x] Test 404 handling
[ ] Test 429 handling (Gemini → 503 ServiceUnavailable)
[x] Test network failure
[x] Test expired token refresh
[ ] Test physical Android device (notifications, camera)
```

---

## Android Permissions

`android/app/src/main/AndroidManifest.xml`:

- `INTERNET`
- `CAMERA`
- `RECORD_AUDIO`
- `POST_NOTIFICATIONS`
- `VIBRATE`

Request notification permission in `RemindersScreen` via `ReminderNotificationService.requestPermissions()`.

---

## cURL Quick Test

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret1"}' | jq -r .accessToken)

# Today's reminders
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/reminders/today

# Scan barcode
curl -X POST http://localhost:3000/medicine-scanner/barcode \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"barcode":"8901030865586"}'
```

See `docs/API_REFERENCE.md` for complete cURL examples.
