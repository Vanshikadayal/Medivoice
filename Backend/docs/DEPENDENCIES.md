# MediVoice Dependencies

Source: `backend/package.json`, `frontend/pubspec.yaml` (audited from repository).

---

## Backend Dependencies

| Dependency | Version | Purpose | Used In | Why Needed |
|------------|---------|---------|---------|------------|
| `@nestjs/common` | ^11.0.1 | NestJS core decorators, pipes, exceptions | All modules | Application framework |
| `@nestjs/core` | ^11.0.1 | NestJS bootstrap/DI | `main.ts`, `app.module.ts` | Runtime |
| `@nestjs/platform-express` | ^11.0.1 | Express HTTP adapter | All controllers | REST API |
| `@nestjs/config` | ^4.0.4 | Environment configuration | `config/`, modules | `.env` loading |
| `@nestjs/mongoose` | ^11.0.4 | MongoDB integration | All schema modules | Persistence |
| `@nestjs/jwt` | ^11.0.2 | JWT sign/verify | `auth/`, guards | Authentication |
| `@nestjs/passport` | ^11.0.5 | Auth strategies (scaffold) | Guards | JWT infrastructure |
| `@nestjs/schedule` | ^6.1.3 | Cron jobs | `scheduler/` | Mark overdue reminders |
| `@nestjs/mapped-types` | * | DTO helpers | DTOs | Partial updates |
| `@nestjs-modules/mailer` | ^2.3.7 | Email (available) | Listed in package | Mail module scaffold; app uses `nodemailer` directly in `MailService` |
| `mongoose` | ^9.9.1 | ODM | All schemas | MongoDB documents |
| `bcrypt` | ^6.0.0 | Password hashing | `auth.service.ts` | Secure passwords |
| `class-validator` | ^0.15.1 | Request validation | All DTOs | Input validation |
| `class-transformer` | ^0.5.1 | DTO transformation | DTOs with `@Type()` | Query/body casting |
| `passport` | ^0.7.0 | Auth middleware | Guards | JWT extraction |
| `passport-jwt` | ^4.0.1 | JWT strategy | Guards | Token validation |
| `@google/generative-ai` | ^0.24.1 | Gemini SDK | `chat/`, `extraction/` | AI chat + prescription extraction |
| `tesseract.js` | ^7.0.0 | OCR | `ocr/`, medicine scanner, extraction | Image text extraction |
| `multer` | ^2.2.0 | File uploads | Prescription, scanner, voice | Multipart handling |
| `nodemailer` | ^9.0.5 | SMTP email | `mail.service.ts` | Password reset emails |
| `uuid` | ^14.0.1 | Refresh tokens | `auth.service.ts` | Token generation |
| `csv-parse` | ^7.0.2 | CSV parsing | `scripts/import-indian-medicines.ts` | Indian medicine DB import |
| `rxjs` | ^7.8.1 | Reactive utilities | NestJS internals | Framework dependency |
| `reflect-metadata` | ^0.2.2 | Decorator metadata | TypeScript/NestJS | DI/metadata |

### Dev dependencies (backend)

| Dependency | Version | Purpose |
|------------|---------|---------|
| `typescript` | ^5.7.3 | TypeScript compiler |
| `jest` | ^30.0.0 | Unit tests |
| `@nestjs/testing` | ^11.0.1 | Nest test utilities |
| `supertest` | ^7.0.0 | HTTP integration tests |
| `eslint` / `prettier` | various | Lint/format |

**Node.js:** Not pinned in `package.json`; use Node 18+ (NestJS 11 requirement).

---

## Flutter Dependencies

| Package | Version | Purpose | Used In | Why Frontend Team Needs It |
|---------|---------|---------|---------|----------------------------|
| `flutter` (SDK) | — | UI framework | Entire app | Core |
| `http` | ^1.6.0 | HTTP client | `core/network/api_client.dart` | All REST API calls |
| `flutter_secure_storage` | ^11.0.0 | Secure token storage | `core/storage/token_storage.dart` | JWT persistence |
| `shared_preferences` | ^2.5.5 | Key-value storage | Listed in pubspec | Available; not primary auth storage |
| `image_picker` | ^1.2.3 | Gallery/camera pick | Scanner, prescription | Image upload flows |
| `camera` | ^0.11.1 | Live camera (web) | `shared/camera/` | Web live capture |
| `mobile_scanner` | ^7.4.0 | Barcode/QR | `barcode_scanner_screen.dart` | Medicine barcode scan |
| `record` | ^7.1.1 | Audio recording | Voice flows | STT input |
| `audioplayers` | ^6.8.1 | Audio playback | Voice/TTS | Play Piper responses |
| `flutter_local_notifications` | ^19.4.0 | Local notifications | `reminder_notification_service.dart` | Reminder alerts |
| `timezone` | ^0.10.1 | TZ scheduling | Notifications | Correct local schedule times |
| `flutter_timezone` | ^4.1.1 | Device timezone | Notifications init | Map device TZ |
| `path_provider` | ^2.1.6 | File paths | Voice temp files | Audio file handling |
| `http_parser` | ^4.1.2 | MIME types | Multipart uploads | Content-Type for uploads |
| `cross_file` | ^0.3.5+4 | Cross-platform files | Image capture | File abstraction |
| `cupertino_icons` | ^1.0.8 | Icons | UI | iOS-style icons |

### Environment

| Setting | Value | Source |
|---------|-------|--------|
| Dart SDK | ^3.13.0 | `pubspec.yaml` |

**State management:** No third-party package (Provider, Bloc, Riverpod). Uses `StatefulWidget` + repository pattern.

**Routing:** Named routes via `MaterialApp.routes` in `lib/app/routes.dart` (no `go_router`).
