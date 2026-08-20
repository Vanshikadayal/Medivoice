# Documentation Audit Report

Generated from full source-code audit of `backend/src/` and `frontend/lib/`.

---

## Backend

| Category | Count | Notes |
|----------|-------|-------|
| Modules audited | 12 | auth, users, medicine, medicine-scanner, prescription, extraction, reminder, scheduler, history, chat, roles, ocr |
| Controllers audited | 13 | All `*.controller.ts` files |
| Services audited | 20+ | Including providers |
| DTOs audited | 21 | All `*.dto.ts` files |
| Schemas audited | 11 | All `*.schema.ts` files |
| Guards audited | 3 | Authentication, JwtAuth, Authorization |
| Providers audited | 6+ | Gemini, Whisper, Piper, India DB, OpenFDA |

---

## API

| Metric | Count |
|--------|-------|
| **Total endpoints discovered** | **50** |
| Public (no JWT) | 8 |
| JWT protected | 41 |
| JWT + RBAC | 1 (`GET /products`) |
| Multipart endpoints | 4 |
| Voice endpoints | 3 (`/voice/speak`, `/voice/transcribe`, `/chat/voice`) |
| AI endpoints | 5+ | chat, voice chat, prescription process/confirm, Gemini extraction |

### Public endpoints
- `POST /auth/signup`, `/login`, `/refresh`, `/forgot-password`
- `PUT /auth/reset-password`
- `POST /voice/speak`, `/voice/transcribe`
- `POST /roles`

---

## Frontend

| Category | Count |
|----------|-------|
| Screens discovered | 17 |
| API integration classes | 9 |
| Routes defined | 14 |

### Screens
Splash, Login, Signup, ForgotPassword, ResetPassword, Home, Scanner, BarcodeScanner, LiveCameraCapture, Prescription, PrescriptionReview, Medicines, Reminders, Chat, Conversations, History, Profile

### Connected APIs
Auth, Users, Medicine Scanner, Prescription (upload/process/confirm), Medicines, Reminders (today/status), History, Chat, Voice utilities

### Disconnected backend endpoints (exist, no Flutter UI)
| Endpoint | Notes |
|----------|-------|
| `POST /prescriptions` | Create without upload |
| `PATCH /prescriptions/:id` | Update prescription |
| `POST /prescriptions/:id/ocr` | Granular OCR only |
| `POST /medicines`, `/medicines/bulk` | Manual create |
| `PATCH /medicines/:id` | Update medicine |
| `GET /reminders` (all) | UI uses `/today` only |
| `GET /reminders/medicine/:id` | Not exposed |
| `DELETE /reminders/:id` | Not in UI |
| `POST /reminders/generate/*` | Confirm auto-generates |
| `POST /history/reminder/:id` | Status patch creates history |
| `GET /history/date/:date` | Not in UI |
| `GET /history/medicine/:id` | Not in UI |
| `POST /roles` | Scaffold only |
| `GET /products` | Legacy scaffold |

---

## Dependencies

| Stack | Production deps | Dev deps |
|-------|-----------------|----------|
| Backend | 24 | 18 |
| Flutter | 16 | 2 |

### External services
- MongoDB (required)
- Google Gemini (required for chat module startup)
- OpenFDA (optional fallback)
- Local Whisper HTTP service
- Local Piper executable
- SMTP (optional for password reset email)

---

## Potential Inconsistencies

**Report only — not auto-fixed.**

| # | Issue | Backend | Flutter |
|---|-------|---------|---------|
| 1 | No `upcoming` reminders endpoint | Only `/today` and `/all` exist | No upcoming UI (correct) |
| 2 | No server logout | Tokens cleared client-side | Matches implementation |
| 3 | `POST /roles` unguarded | Open endpoint | Not called |
| 4 | Gemini 429 | Mapped to 503 ServiceUnavailable | Flutter has `rateLimited` type but may rarely see 429 |
| 5 | Prescription delete API exists | `DELETE /prescriptions/:id` | Repository has method; no screen button |
| 6 | Medicine delete API exists | `DELETE /medicines/:id` | Repository has method; no screen button |
| 7 | History manual POST | `POST /history/reminder/:id` | Flutter uses `PATCH /reminders/:id/status` instead |
| 8 | `extractMedicines` vs `process` | Both exist | Main flow uses `process` only |
| 9 | Voice auth reliability | N/A | Documented as best-effort; UI login primary |
| 10 | CORS | localhost only | Physical device uses LAN IP (no CORS issue on mobile) |

### Field name alignment
- Reminder status: backend enum `TAKEN`/`SKIPPED`/`MISSED` — Flutter sends uppercase strings ✓
- Confirm medicines: Flutter `ReviewMedicine.toConfirmJson()` matches `ConfirmMedicineDto` ✓
- Chat conversations: backend returns `_id`; Flutter maps to `id` in models ✓

---

## Documentation Files Created

- [x] `docs/BACKEND_DOCUMENTATION.md`
- [x] `docs/API_REFERENCE.md`
- [x] `docs/FLUTTER_INTEGRATION_GUIDE.md`
- [x] `docs/DATABASE_SCHEMA.md`
- [x] `docs/DEPENDENCIES.md`
- [x] `docs/WORKFLOWS.md`
- [x] `docs/API_QUICK_REFERENCE.md`
- [x] `docs/PROJECT_ARCHITECTURE.md`
- [x] `docs/MediVoice.postman_collection.json`
- [x] `docs/DOCUMENTATION_AUDIT.md`

---

## Verification Method

1. Enumerated all `*.controller.ts` route decorators
2. Cross-checked each route against `frontend/lib/core/constants/api_constants.dart`
3. Read DTO validation rules from `class-validator` decorators
4. Read response shapes from services (not assumed)
5. Verified schemas from `*.schema.ts`
6. Confirmed no `POST /medicine/scan` — actual path is `/medicine-scanner/barcode`

**Potential integration issues found: 10** (documented above; none are blocking for MVP demo)
