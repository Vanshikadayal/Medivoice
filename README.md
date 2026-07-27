# MediVoice 🎙️💊

**A voice-enabled, AI-powered mobile application that helps visually impaired individuals manage their medicines safely and independently.**

Final Year B.Tech Project — Department of Computer Science & Engineering
United Institute of Technology, Prayagraj (Affiliated to Dr. A.P.J. Abdul Kalam Technical University, Lucknow)
2025–26

---

## 📖 Overview

Millions of visually impaired individuals struggle to read medicine labels, dosage instructions, and printed prescriptions — leading to missed doses, wrong dosages, and dangerous drug interactions. **MediVoice** solves this by providing a fully voice-driven medicine management system, combining QR code scanning, OCR, and conversational AI to give users complete independence in handling their medication.

MediVoice works as a **daily health companion** — ensuring safety, accuracy, and independence, with no reliance on screens or typing.

## ❗ Problem Statement

- Inability to read medicine labels, dosage, and warnings
- Confusion due to small text and similar-looking tablets
- Difficulty identifying medicine if the QR code is damaged or missing
- Dependence on others for setting medicine reminders
- Difficulty understanding printed prescriptions
- Communication barriers due to typing limitations
- Higher risk of wrong dosage, missed medication, and drug interactions

## ✨ Features

- **Full Voice-Controlled Navigation** — operate the entire app using voice commands, no screen interaction needed
- **QR Code-Based Medicine Identification** — scan a medicine's QR code to instantly hear its name, composition, usage, and dosage
- **Ingredient-Based Identification (Backup)** — if the QR code is damaged/missing, OCR extracts the ingredient list and AI predicts the medicine from its composition
- **Prescription Upload → Auto Reminders** — upload a photo of a printed prescription; OCR reads medicine names & dosage and automatically schedules spoken reminders
- **AI Medical Chatbot** — ask medicine-related questions and get spoken, text-to-speech responses
- **Adaptive Reminder Engine** *(planned)* — reinforcement learning to personalize reminder timing based on user behavior

## 🧩 System Modules

| Module | Responsibility |
|---|---|
| **Medicine Detection** | QR scanning + image processing for medicine identification |
| **Reminder Engine** | Reminder scheduling, snooze/reset, adaptive RL-based timing |
| **Chatbot** | Voice-enabled AI assistance for medicine queries and emergencies |
| **Database** | Stores medicine details, patient profiles, and reminder logs |

## 🏗️ Architecture

The system follows a **modular architecture** with a Flutter frontend and Node.js backend:

1. **Voice Interaction Layer** — Speech-to-Text converts voice commands to text; Text-to-Speech delivers audio responses
2. **Medicine Identification** — Camera captures packaging → OCR extracts text/barcode → matched against backend database
3. **Prescription Processing** — OCR scans printed prescriptions → AI parses dosage/frequency → auto-generates reminder schedule
4. **AI Chatbot Assistance** — User queries handled by backend AI model → responses delivered in text + speech
5. **Reminder Engine** — Local notifications scheduled and logged, with planned reinforcement-learning-based adaptive scheduling

## 🛠️ Tech Stack

**Frontend**
- Flutter & Dart
- Google ML Kit
- `flutter_local_notifications`
- `speech_to_text` package
- `flutter_tts` package
- `flutter_camera` package

**Backend**
- Node.js with NestJS framework
- PostgreSQL (MongoDB also considered)
- OpenAI API (chatbot logic)
- Google Vision API (cloud OCR fallback)

**Planned/Future**
- Reinforcement learning models for adaptive reminder scheduling

## 👥 Stakeholders

- **Primary:** Patients with visual impairments
- **Secondary:** Caregivers, family members, healthcare providers
- **Tertiary:** Developers, researchers, medical institutions

## 📈 Scalability Considerations

- Multi-language support for diverse patients
- Expanded medicine datasets covering the global pharmacopoeia
- Cloud-based backend for performance and reliability
- Integration with wearable devices for health monitoring

## 🔍 Comparison with Existing Systems

| System | Limitation vs. MediVoice |
|---|---|
| **August AI** | Built for doctors/clinicians, not patients; no voice navigation or barcode scanning |
| **Medisafe / MyTherapy** | Requires manual typing; no barcode scanning or AI-based medicine detection |
| **Google Lookout** | General object/text reading; no medicine-specific dosage, chatbot, or prescription automation |

## 👨‍💻 Team

- Mahak Kesarwani (2302840100119)
- Vanshika Dayal (2302841530101)
- Utkarsh Agrawal (2302840100250)
- Sudhanshu Yadav (2302840100243)

**Project Supervisor:** Mr. Gaurav Narain Singh, Assistant Professor, CSE

## 📚 Related Work / References

- Smart Drug Authentication & Medicine Reminder System (2025) — [IJCRT2505183](https://www.ijcrt.org/papers/IJCRT2505183.pdf)
- AI-Powered Medication Reminder & Tracker Using Reinforcement Learning (2025)
- Intelligent Medication Schedule Generation (2024)
- memorAIs — OCR for Automatic Medicine Reminder Generation (2023) — [arXiv:2312.06841](https://arxiv.org/abs/2312.06841)
- AI-Powered Public Health Automated Kiosk System (2025) — [arXiv:2504.13880](https://arxiv.org/abs/2504.13880)

---

*This README is based on the project synopsis and presentation materials. Update sections as the implementation evolves.*
