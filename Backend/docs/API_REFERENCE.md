# MediVoice API Reference

**Base URL:** `http://localhost:3000` (or `PORT` env)  
**Auth header:** `Authorization: Bearer <accessToken>`  
**Validation:** Global `ValidationPipe` (whitelist, transform, forbidNonWhitelisted)

---

## Master Endpoint Table

| # | Method | Endpoint | Auth | Module | Flutter consumer |
|---|--------|----------|------|--------|------------------|
| 1 | POST | `/auth/signup` | No | Auth | `AuthApi.signup` |
| 2 | POST | `/auth/login` | No | Auth | `AuthApi.login` |
| 3 | POST | `/auth/refresh` | No | Auth | `ApiClient` (auto) |
| 4 | PUT | `/auth/change-password` | JWT | Auth | `AuthApi.changePassword` |
| 5 | POST | `/auth/forgot-password` | No | Auth | `AuthApi.forgotPassword` |
| 6 | PUT | `/auth/reset-password` | No | Auth | `AuthApi.resetPassword` |
| 7 | GET | `/users/me` | JWT | Users | `AuthApi.getCurrentUser` |
| 8 | PATCH | `/users/me` | JWT | Users | `AuthApi.updateProfile` |
| 9 | POST | `/medicine-scanner/barcode` | JWT | Scanner | `ScannerApi.scanBarcode` |
| 10 | POST | `/medicine-scanner/image` | JWT | Scanner | `ScannerApi.scanImage` |
| 11 | POST | `/prescriptions` | JWT | Prescription | Not used in main UI |
| 12 | POST | `/prescriptions/upload` | JWT | Prescription | `PrescriptionApi.uploadImage` |
| 13 | GET | `/prescriptions` | JWT | Prescription | `PrescriptionApi.getAll` |
| 14 | GET | `/prescriptions/:id` | JWT | Prescription | `PrescriptionApi.getById` |
| 15 | PATCH | `/prescriptions/:id` | JWT | Prescription | Not in Flutter UI |
| 16 | DELETE | `/prescriptions/:id` | JWT | Prescription | `PrescriptionApi.delete` |
| 17 | POST | `/prescriptions/:id/ocr` | JWT | Extraction | Not in main UI flow |
| 18 | POST | `/prescriptions/:id/extract-medicines` | JWT | Extraction | `PrescriptionApi.extractMedicines` |
| 19 | POST | `/prescriptions/:id/process` | JWT | Extraction | `PrescriptionApi.process` |
| 20 | POST | `/prescriptions/:id/confirm` | JWT | Extraction | `PrescriptionApi.confirm` |
| 21 | POST | `/medicines` | JWT | Medicine | Not in main UI |
| 22 | POST | `/medicines/bulk` | JWT | Medicine | Not in Flutter UI |
| 23 | GET | `/medicines` | JWT | Medicine | `MedicineApi.getAll` |
| 24 | GET | `/medicines/prescription/:prescriptionId` | JWT | Medicine | `MedicineApi` (if used) |
| 25 | GET | `/medicines/:id` | JWT | Medicine | `MedicineApi.getById` |
| 26 | PATCH | `/medicines/:id` | JWT | Medicine | Not in Flutter UI |
| 27 | DELETE | `/medicines/:id` | JWT | Medicine | `MedicineApi.delete` |
| 28 | POST | `/reminders/generate/medicine/:medicineId` | JWT | Reminder | `ReminderApi.generateForMedicine` |
| 29 | POST | `/reminders/generate/prescription/:prescriptionId` | JWT | Reminder | `ReminderApi.generateForPrescription` |
| 30 | GET | `/reminders` | JWT | Reminder | `ReminderApi.getAll` |
| 31 | GET | `/reminders/today` | JWT | Reminder | `ReminderApi.getToday` |
| 32 | GET | `/reminders/medicine/:medicineId` | JWT | Reminder | Not in Flutter UI |
| 33 | GET | `/reminders/:id` | JWT | Reminder | `ReminderApi.getById` |
| 34 | PATCH | `/reminders/:id/status` | JWT | Reminder | `ReminderApi.updateStatus` |
| 35 | DELETE | `/reminders/:id` | JWT | Reminder | Not in Flutter UI |
| 36 | POST | `/history/reminder/:reminderId` | JWT | History | Not in Flutter UI |
| 37 | GET | `/history` | JWT | History | `HistoryApi.getAll` |
| 38 | GET | `/history/stats` | JWT | History | `HistoryApi.getStats` |
| 39 | GET | `/history/date/:date` | JWT | History | Not in Flutter UI |
| 40 | GET | `/history/medicine/:medicineId` | JWT | History | Not in Flutter UI |
| 41 | POST | `/chat/conversations` | JWT | Chat | `ChatApi.createConversation` |
| 42 | GET | `/chat/conversations` | JWT | Chat | `ChatApi.getConversations` |
| 43 | GET | `/chat/conversations/:conversationId` | JWT | Chat | `ChatApi.getConversation` |
| 44 | DELETE | `/chat/conversations/:conversationId` | JWT | Chat | `ChatApi.deleteConversation` |
| 45 | POST | `/chat` | JWT | Chat | `ChatApi.sendMessage` |
| 46 | POST | `/chat/voice` | JWT | Chat | `VoiceChatApi.sendVoice` |
| 47 | POST | `/voice/speak` | No | Voice | `VoiceUtilityApi.speak` |
| 48 | POST | `/voice/transcribe` | No | Voice | `VoiceUtilityApi.transcribe` |
| 49 | POST | `/roles` | No | Roles | Not in Flutter |
| 50 | GET | `/products` | JWT+RBAC | App | Not in Flutter |

**Total: 50 endpoints** (51 routes; `/products` is legacy scaffold)

---

## Authentication

### POST `/auth/signup`

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret1"
}
```

**Validation:**
- `name`: string, required
- `email`: valid email
- `password`: min 6 chars, at least one digit

**Success:** `201` — empty body (void)  
**Errors:** `400` — `"Email already in use"`

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret1"}'
```

---

### POST `/auth/login`

**Body:**
```json
{ "email": "jane@example.com", "password": "secret1" }
```

**Success:** `200`
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<uuid>",
  "userId": "<mongodb-objectid>"
}
```

**Errors:** `401` — `"Wrong credentials"`

---

### POST `/auth/refresh`

**Body:**
```json
{ "refreshToken": "<uuid>" }
```

**Success:** `200` — same shape as login (new access + refresh tokens)  
**Errors:** `401` — `"Refresh Token is invalid"`

---

### PUT `/auth/change-password` (JWT)

**Body:**
```json
{
  "oldPassword": "secret1",
  "newPassword": "secret2"
}
```

**Validation:** `newPassword` min 6 + digit  
**Success:** `200` — empty  
**Errors:** `401` wrong old password, `404` user not found

---

### POST `/auth/forgot-password`

**Body:** `{ "email": "jane@example.com" }`

**Success:** `200`
```json
{ "message": "If this user exists, they will receive an email" }
```

Always returns same message (no email enumeration). Token expires in 1 hour.

---

### PUT `/auth/reset-password`

**Body:**
```json
{
  "resetToken": "<64-char-nanoid>",
  "newPassword": "newsecret1"
}
```

**Success:** `200` — empty  
**Errors:** `401` — `"Invalid link"`

---

### Logout

**Not implemented.** Client clears tokens only.

---

## JWT / Authorization Table

| Endpoint group | Public | JWT | Role (RBAC) |
|----------------|--------|-----|-------------|
| `/auth/signup`, `/login`, `/refresh`, `/forgot-password`, `/reset-password` | ✓ | | |
| `/voice/speak`, `/voice/transcribe` | ✓ | | |
| `/roles` POST | ✓ | | |
| `/auth/change-password` | | ✓ | |
| `/users/*`, `/medicines/*`, `/prescriptions/*`, `/reminders/*`, `/history/*`, `/chat/*`, `/medicine-scanner/*` | | ✓ | |
| `GET /products` | | ✓ | ✓ (permissions decorator commented out) |

---

## Users

### GET `/users/me`

**Success:** User document without `password`:
```json
{
  "_id": "...",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### PATCH `/users/me`

**Body (all optional):**
```json
{ "name": "New Name", "email": "new@example.com" }
```

---

## Medicine Scanner

### POST `/medicine-scanner/barcode`

**Body:**
```json
{ "barcode": "8901030865586" }
```

**Validation:** alphanumeric + `-_.`, max 128 chars

**Success:** `200`
```json
{
  "success": true,
  "found": true,
  "message": "...",
  "candidate": { "name": "...", "strength": "650 mg", "dosageForm": "tablet" },
  "medicine": { "found": true, "name": "...", "source": "indian-medicine-dataset", "...": "..." },
  "identification": {
    "medicineName": "Dolo 650",
    "brandName": "Dolo 650",
    "activeIngredients": ["Paracetamol"],
    "strength": "650 mg",
    "dosageForm": "tablet",
    "manufacturer": "...",
    "commonUses": ["..."],
    "warnings": ["..."],
    "source": "Indian Medicine Database",
    "identificationMethod": "QR",
    "confidence": "HIGH"
  },
  "speechSummary": "I found Dolo 650..."
}
```

`identificationMethod`: `QR` | `MEDICINE_NAME` | `INGREDIENT` | `UNKNOWN`  
`confidence`: `HIGH` | `MEDIUM` | `LOW`

**Not found:** `found: false` with `message` and `speechSummary`

---

### POST `/medicine-scanner/image`

**Content-Type:** `multipart/form-data`  
**Field:** `image` (jpg/png/webp, max 5MB)

Same response shape as barcode (uses OCR pipeline).

```bash
curl -X POST http://localhost:3000/medicine-scanner/image \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@medicine.jpg"
```

---

## Prescription & Extraction

### POST `/prescriptions/upload`

**Field:** `image` (jpg/png/webp, max 5MB)  
**Success:** `201` — Prescription document with `status: "UPLOADED"`

### POST `/prescriptions/:id/process`

Runs full pipeline: OCR → Gemini → deterministic fallback.

**Success:** `200`
```json
{
  "success": true,
  "prescriptionId": "...",
  "status": "REVIEW_REQUIRED",
  "message": "Please review the extracted medicines before setting reminders.",
  "prescription": { "_id": "...", "imageUrl": "...", "extractedText": "...", "status": "REVIEW_REQUIRED" },
  "doctor": { "name": "...", "qualification": null, "registrationNumber": null },
  "patient": { "name": "...", "age": null, "gender": null },
  "medicines": [
    {
      "name": "Dolo 650",
      "strength": "650 mg",
      "dosage": "1 tablet",
      "dosageForm": null,
      "frequency": "twice daily",
      "dosesPerDay": 2,
      "timings": ["morning", "evening"],
      "durationDays": 5,
      "instructions": "after food",
      "confidence": 0.85,
      "warnings": []
    }
  ],
  "warnings": [],
  "remindersCreated": 0
}
```

### POST `/prescriptions/:id/confirm`

**Body:**
```json
{
  "medicines": [
    {
      "name": "Dolo 650",
      "strength": "650 mg",
      "dosage": "1 tablet",
      "frequency": "twice daily",
      "dosesPerDay": 2,
      "durationDays": 5,
      "instructions": "after food",
      "confidence": 0.85
    }
  ]
}
```

**Required:** `medicines` array, min 1 item, each must have `name`

**Success:** `200`
```json
{
  "success": true,
  "alreadyConfirmed": false,
  "prescriptionId": "...",
  "status": "CONFIRMED",
  "message": "...",
  "medicines": [{ "_id": "...", "name": "...", "dosage": "...", "dosesPerDay": 2, "durationDays": 5 }],
  "remindersCreated": 10,
  "durationConfirmationNeeded": false,
  "durationConfirmationMessage": null
}
```

---

## Reminders

### GET `/reminders/today`

Returns pending/today reminders for authenticated user (server local date logic).

**Reminder object:**
```json
{
  "_id": "...",
  "userId": "...",
  "medicineId": "...",
  "prescriptionId": "...",
  "shift": "MORNING",
  "scheduledTime": "2026-08-20T08:00:00.000Z",
  "doseNumber": 1,
  "dosage": "1 tablet",
  "status": "PENDING",
  "isActive": true
}
```

### PATCH `/reminders/:id/status`

**Body:**
```json
{ "status": "TAKEN" }
```

Allowed: `TAKEN`, `SKIPPED`, `MISSED`

**Note:** Flutter uses `PATCH` (not PUT). Creates history record.

---

## Chat

### POST `/chat`

**Body:**
```json
{
  "conversationId": "<mongo-id>",
  "message": "What is paracetamol used for?"
}
```

**Success:**
```json
{
  "success": true,
  "message": "Paracetamol is commonly used for...",
  "provider": "gemini",
  "conversationId": "...",
  "safetyLevel": "SAFE"
}
```

`safetyLevel`: `SAFE` | `CAUTION` | `HIGH_RISK` | `EMERGENCY`

**Failure:**
```json
{
  "success": false,
  "message": "Unable to generate a response right now.",
  "conversationId": "..."
}
```

Gemini quota/timeout → `503 Service Unavailable` (not explicit 429 in code).

### POST `/chat/voice`

**Multipart:** `audio` file + form field `conversationId`

**Success:**
```json
{
  "success": true,
  "transcript": "...",
  "message": "...",
  "conversationId": "...",
  "safetyLevel": "SAFE",
  "provider": "gemini",
  "audio": { "mimeType": "audio/wav", "data": "<base64>" }
}
```

---

## Voice Utilities (Public)

### POST `/voice/speak`

**Body:** `{ "text": "Hello" }` (1–500 chars)

**Success:**
```json
{
  "success": true,
  "text": "Hello",
  "audio": { "mimeType": "audio/wav", "data": "<base64>" }
}
```

### POST `/voice/transcribe`

**Multipart:** `audio`

**Success:** `{ "success": true, "transcript": "..." }`  
**Empty/failed:** `{ "success": false, "transcript": "", "message": "..." }`

---

## History

### GET `/history/stats`

```json
{
  "total": 42,
  "taken": 30,
  "skipped": 5,
  "missed": 7,
  "adherencePercentage": 71
}
```

### GET `/history`

Array of history records with `reminderId`, `medicineId`, `status`, `scheduledTime`, `actionTime`.

---

## Error Format

NestJS standard:

```json
{
  "statusCode": 400,
  "message": "Validation message or array",
  "error": "Bad Request"
}
```

| Code | When |
|------|------|
| 400 | Validation, bad input, business rule |
| 401 | Missing/invalid JWT, wrong credentials, invalid reset token |
| 403 | RBAC forbidden (`/products` only in practice) |
| 404 | Resource not found or not owned by user |
| 413 | File too large (upload filters) |
| 503 | Gemini/Whisper/Piper unavailable |

---

## Voice Intents (Flutter — not API)

Full phrase list from `voice_intent_parser.dart`:

| Phrases | Intent |
|---------|--------|
| scan medicine, scan my medicine, identify medicine, what medicine is this, check medicine, medicine scan | scanMedicine |
| scan prescription, upload prescription, read prescription | scanPrescription |
| start chatbot, talk to doctor, chat with medivoice, ask a question | chat |
| open chat, open chatbot, voice bot | openChat |
| show reminders, today's medicines, my reminders | reminders |
| my medicines, show medicines, medicine list | medicines |
| show history, my history | history |
| open profile | profile |
| help, what can you do | help |
| repeat, say again | repeat |
| cancel, stop, never mind | cancel |

---

## Environment Variables

See `docs/DATABASE_SCHEMA.md` companion table in `BACKEND_DOCUMENTATION.md` and `.env.example`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | Database |
| `JWT_SECRET` | Yes | JWT signing |
| `GEMINI_API_KEY` | Yes (chat module) | AI chat + extraction |
| `SMTP_*` | No | Password reset email |
| `WHISPER_SERVICE_URL` | For voice STT | Local Whisper |
| `PIPER_*` | For voice TTS | Local Piper |
| `OPENFDA_API_KEY` | No | Medicine fallback |
| `PORT` | No | Default 3000 |

---

## cURL Examples

```bash
# Refresh
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<uuid>"}'

# Process prescription
curl -X POST http://localhost:3000/prescriptions/RX_ID/process \
  -H "Authorization: Bearer $TOKEN"

# Confirm prescription
curl -X POST http://localhost:3000/prescriptions/RX_ID/confirm \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"medicines":[{"name":"Dolo 650","dosesPerDay":2,"durationDays":5}]}'

# Mark reminder taken
curl -X PATCH http://localhost:3000/reminders/REMINDER_ID/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"TAKEN"}'

# Chat
curl -X POST http://localhost:3000/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"CONV_ID","message":"Hello"}'

# TTS
curl -X POST http://localhost:3000/voice/speak \
  -H "Content-Type: application/json" \
  -d '{"text":"Welcome to MediVoice"}'
```
