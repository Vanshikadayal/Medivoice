# MediVoice API Quick Reference

Base URL (default): `http://localhost:3000`  
Override in Flutter: `--dart-define=API_BASE_URL=...`

All protected routes require:

```http
Authorization: Bearer <accessToken>
```

---

## AUTH (public unless noted)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/auth/signup` | No |
| POST | `/auth/login` | No |
| POST | `/auth/refresh` | No |
| PUT | `/auth/change-password` | JWT |
| POST | `/auth/forgot-password` | No |
| PUT | `/auth/reset-password` | No |

## USERS

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/users/me` | JWT |
| PATCH | `/users/me` | JWT |

## MEDICINE SCANNER

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/medicine-scanner/barcode` | JWT |
| POST | `/medicine-scanner/image` | JWT (multipart `image`) |

## PRESCRIPTIONS

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/prescriptions` | JWT |
| POST | `/prescriptions/upload` | JWT (multipart `image`) |
| GET | `/prescriptions` | JWT |
| GET | `/prescriptions/:id` | JWT |
| PATCH | `/prescriptions/:id` | JWT |
| DELETE | `/prescriptions/:id` | JWT |
| POST | `/prescriptions/:id/ocr` | JWT |
| POST | `/prescriptions/:id/extract-medicines` | JWT |
| POST | `/prescriptions/:id/process` | JWT |
| POST | `/prescriptions/:id/confirm` | JWT |

## MEDICINES

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/medicines` | JWT |
| POST | `/medicines/bulk` | JWT |
| GET | `/medicines` | JWT |
| GET | `/medicines/prescription/:prescriptionId` | JWT |
| GET | `/medicines/:id` | JWT |
| PATCH | `/medicines/:id` | JWT |
| DELETE | `/medicines/:id` | JWT |

## REMINDERS

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/reminders/generate/medicine/:medicineId` | JWT |
| POST | `/reminders/generate/prescription/:prescriptionId` | JWT |
| GET | `/reminders` | JWT |
| GET | `/reminders/today` | JWT |
| GET | `/reminders/medicine/:medicineId` | JWT |
| GET | `/reminders/:id` | JWT |
| PATCH | `/reminders/:id/status` | JWT |
| DELETE | `/reminders/:id` | JWT |

## HISTORY

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/history/reminder/:reminderId` | JWT |
| GET | `/history` | JWT |
| GET | `/history/stats` | JWT |
| GET | `/history/date/:date` | JWT |
| GET | `/history/medicine/:medicineId` | JWT |

## CHAT

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/chat/conversations` | JWT |
| GET | `/chat/conversations` | JWT |
| GET | `/chat/conversations/:conversationId` | JWT |
| DELETE | `/chat/conversations/:conversationId` | JWT |
| POST | `/chat` | JWT |
| POST | `/chat/voice` | JWT (multipart `audio`) |

## VOICE UTILITIES (public)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/voice/speak` | No |
| POST | `/voice/transcribe` | No (multipart `audio`) |

## ROLES (scaffold)

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/roles` | No |

## LEGACY / SCAFFOLD

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/products` | JWT + AuthorizationGuard |

**Total documented endpoints: 50**
