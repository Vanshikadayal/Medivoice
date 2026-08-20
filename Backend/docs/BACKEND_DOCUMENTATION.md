# MediVoice Backend Documentation

Complete backend reference audited from `backend/src/`.

---

## Technology Stack

| Item | Value |
|------|-------|
| NestJS | ^11.0.1 |
| TypeScript | ^5.7.3 |
| MongoDB ODM | Mongoose ^9.9.1 |
| Node.js | 18+ recommended |
| Default port | 3000 |

---

## Folder Structure

```text
backend/
├── src/
│   ├── main.ts                 # Bootstrap, CORS, ValidationPipe
│   ├── app.module.ts           # Root module imports
│   ├── app.controller.ts       # Legacy GET /products (RBAC scaffold)
│   ├── auth/                   # Authentication
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dtos/
│   │   └── schemas/            # RefreshToken, ResetToken
│   ├── users/                  # Profile
│   ├── medicine/               # User medicine CRUD
│   ├── medicine-scanner/       # Barcode/image lookup
│   │   ├── providers/          # India DB, OpenFDA
│   │   ├── services/           # QR resolver, ingredient fallback
│   │   └── upload/
│   ├── prescription/           # Prescription CRUD + upload
│   ├── extraction/             # OCR, Gemini, confirm pipeline
│   ├── reminder/               # Reminder CRUD + generation
│   ├── scheduler/              # Cron missed reminders
│   ├── history/                # Adherence history
│   ├── chat/                   # Chatbot + voice
│   │   ├── providers/          # Gemini, Whisper, Piper
│   │   └── services/
│   ├── roles/                  # RBAC scaffold
│   ├── ocr/                    # Shared Tesseract
│   ├── guards/                 # JWT, Authorization
│   ├── decorators/             # @CurrentUser, @Permissions
│   ├── config/config.ts        # Env mapping
│   └── services/mail.service.ts
├── .env.example
├── package.json
└── scripts/import-indian-medicines.ts
```

---

## Module Reference

### Auth (`src/auth/`)

| Component | File | Purpose |
|-----------|------|---------|
| Controller | `auth.controller.ts` | 7 auth endpoints |
| Service | `auth.service.ts` | bcrypt, JWT, refresh, reset |
| DTOs | `dtos/*.dto.ts` | Validation |
| Schemas | `refresh-token.schema.ts`, `reset-token.schema.ts` | Token storage |

**JWT payload:** `{ userId }`  
**Access token expiry:** 10 hours  
**Refresh token expiry:** 3 days (one per user, upserted)

### Users (`src/users/`)

| Endpoint | Method | Guard |
|----------|--------|-------|
| `/users/me` | GET, PATCH | JwtAuthGuard |

Password never returned (`select('-password')`).

### Medicine Scanner (`src/medicine-scanner/`)

**Pipeline:**
1. Barcode → `QrMedicineResolverService` (QR payloads)
2. Image → Tesseract OCR → name/composition search
3. `IndiaMedicineDatabaseProvider` (primary, `medicine_database` collection)
4. `OpenFdaProvider` (fallback)
5. `IngredientFallbackService` (composition from OCR)
6. `buildScanResponse` → `identification` + `speechSummary`

**Controllers:** `MedicineScannerController` — JWT required.

### Prescription + Extraction

| Module | Responsibility |
|--------|----------------|
| `prescription/` | CRUD, image upload to `uploads/prescriptions/` |
| `extraction/` | OCR, Gemini extraction, `process`, `confirm` |

**Confirm creates:** Medicine documents + reminders (via `ReminderService`).

### Reminder (`src/reminder/`)

- Generation from medicine course (`durationDays`, `dosesPerDay`, `startDate`)
- Spacing: 10 min between medicines at same slot
- Unique index prevents duplicate schedules
- Status updates sync to history

### Scheduler (`src/scheduler/`)

- `@Cron(CronExpression.EVERY_5_MINUTES)`
- `markOverduePendingReminders` → sets `MISSED`
- **No push notifications**

### Chat (`src/chat/`)

- `ChatService` — Gemini with medical safety classifier
- `VoiceChatService` — STT → chat → TTS
- `VoiceUtilityService` — public Piper/Whisper for UI voice
- Requires `GEMINI_API_KEY` at module init

### History (`src/history/`)

- Records TAKEN/SKIPPED/MISSED actions
- Stats: adherence percentage

### Roles (`src/roles/`)

- `POST /roles` — **unguarded** scaffold
- Not used by MediVoice feature routes

---

## Guards & Authorization

| Guard | File | Sets |
|-------|------|------|
| `AuthenticationGuard` | `authentication.guard.ts` | `request.userId` from JWT |
| `JwtAuthGuard` | `jwt-auth.guard.ts` | Extends AuthenticationGuard |
| `AuthorizationGuard` | `authorization.guard.ts` | RBAC via `@Permissions()` |

**Domain APIs:** `JwtAuthGuard` + `@CurrentUser()` — userId from token only.

---

## Validation

Global pipe in `main.ts`:

```typescript
new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
})
```

---

## Exception Handling

Standard NestJS `HttpException` subclasses:

| Exception | Status |
|-----------|--------|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ServiceUnavailableException` | 503 |

Gemini failures → `ServiceUnavailableException` (not explicit 429 mapping).

Upload filters: custom exception filters for multer errors (413 for size).

---

## External Services

| Service | Env vars | Used by |
|---------|----------|---------|
| MongoDB | `MONGODB_URI` | All modules |
| Gemini | `GEMINI_API_KEY`, `GEMINI_MODEL` | Chat, extraction |
| OpenFDA | `OPENFDA_BASE_URL`, `OPENFDA_API_KEY` | Medicine scanner fallback |
| Whisper | `WHISPER_SERVICE_URL` | Voice STT |
| Piper | `PIPER_EXECUTABLE`, `PIPER_MODEL`, `PIPER_CONFIG` | Voice TTS |
| SMTP | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Password reset (optional) |

---

## File Upload Limits

| Upload | Max size | MIME types | Field |
|--------|----------|------------|-------|
| Prescription | 5 MB | jpeg, png, webp | `image` |
| Medicine scanner | 5 MB | jpeg, png, webp | `image` |
| Voice | 10 MB (config) | audio | `audio` |

---

## Database Collections

| Collection | Schema class |
|------------|--------------|
| `users` | User |
| `medicines` | Medicine |
| `prescriptions` | Prescription |
| `reminders` | Reminder |
| `histories` | History |
| `chat_conversations` | Conversation |
| `chat_messages` | ChatMessage |
| `medicine_database` | MedicineDatabaseEntry |
| `refreshtokens` | RefreshToken |
| `resettokens` | ResetToken |
| `roles` | Role |

See `docs/DATABASE_SCHEMA.md` for field details.

---

## Running the Backend

```bash
cd backend
cp .env.example .env   # Set MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run start:dev
```

Import Indian medicines (if not already):

```bash
npm run import:indian-medicines
```

---

## Tests

```bash
npm run build
npm test   # 205 tests (as of audit)
```
