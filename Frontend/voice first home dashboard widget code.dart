import '/components/bottom_nav4/bottom_nav4_widget.dart';
import '/components/quick_action_card/quick_action_card_widget.dart';
import '/flutter_flow/flutter_flow_icon_button.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import 'dart:ui';
import '/index.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'voice_first_home_dashboard_model.dart';
export 'voice_first_home_dashboard_model.dart';

class VoiceFirstHomeDashboardWidget extends StatefulWidget {
  const VoiceFirstHomeDashboardWidget({super.key});

  static String routeName = 'VoiceFirstHomeDashboard';
  static String routePath = '/voiceFirstHomeDashboard';

  @override
  State<VoiceFirstHomeDashboardWidget> createState() =>
      _VoiceFirstHomeDashboardWidgetState();
}

class _VoiceFirstHomeDashboardWidgetState
    extends State<VoiceFirstHomeDashboardWidget> {
  late VoiceFirstHomeDashboardModel _model;

  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => VoiceFirstHomeDashboardModel());
  }

  @override
  void dispose() {
    _model.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        FocusScope.of(context).unfocus();
        FocusManager.instance.primaryFocus?.unfocus();
      },
      child: Scaffold(
        key: scaffoldKey,
        backgroundColor: const Color(0xBCA4BBEA),
        body: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.max,
            children: [
              // --- HEADER SECTION ---
              Container(
                decoration: BoxDecoration(
                  color: FlutterFlowTheme.of(context).secondaryBackground,
                  shape: BoxShape.rectangle,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24.0,
                        vertical: 16.0,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.max,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hello, User',
                                style: FlutterFlowTheme.of(context)
                                    .headlineSmall
                                    .override(
                                      fontFamily: GoogleFonts.readexPro().fontFamily,
                                      fontWeight: FontWeight.bold,
                                      color: FlutterFlowTheme.of(context).primaryText,
                                      lineHeight: 1.35,
                                    ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'MediVoice is listening...',
                                style: FlutterFlowTheme.of(context)
                                    .bodyMedium
                                    .override(
                                      fontFamily: GoogleFonts.inter().fontFamily,
                                      color: FlutterFlowTheme.of(context).secondaryText,
                                      lineHeight: 1.5,
                                    ),
                              ),
                            ],
                          ),
                          FlutterFlowIconButton(
                            borderRadius: 8,
                            buttonSize: 48,
                            fillColor: Colors.transparent,
                            icon: Icon(
                              Icons.account_circle_rounded,
                              color: FlutterFlowTheme.of(context).primaryText,
                              size: 32,
                            ),
                            onPressed: () async {
                              context.pushNamed(
                                AccessibilitySettingsWidget.routeName,
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                    Container(
                      height: 1,
                      color: FlutterFlowTheme.of(context).alternate,
                    ),
                  ],
                ),
              ),

              // --- MAIN SCROLLABLE CONTENT ---
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // MAIN VOICE MIC INTERACTION BUTTON
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20.0),
                          child: Column(
                            children: [
                              InkWell(
                                splashColor: Colors.transparent,
                                focusColor: Colors.transparent,
                                hoverColor: Colors.transparent,
                                highlightColor: Colors.transparent,
                                onTap: () async {
                                  context.pushNamed(
                                    AIChatbotAssistantWidget.routeName,
                                  );
                                },
                                child: Container(
                                  width: 120,
                                  height: 120,
                                  decoration: BoxDecoration(
                                    color: FlutterFlowTheme.of(context).primary,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        blurRadius: 20,
                                        color: FlutterFlowTheme.of(context)
                                            .primary
                                            .withOpacity(0.4),
                                        offset: const Offset(0, 8),
                                      )
                                    ],
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 4,
                                    ),
                                  ),
                                  alignment: Alignment.center,
                                  child: const Icon(
                                    Icons.mic_rounded,
                                    color: Colors.white,
                                    size: 60,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Tap to Speak',
                                style: FlutterFlowTheme.of(context)
                                    .headlineMedium
                                    .override(
                                      fontFamily: GoogleFonts.readexPro().fontFamily,
                                      fontWeight: FontWeight.w900,
                                      color: FlutterFlowTheme.of(context).primaryText,
                                    ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),

                        // QUICK ACTION ROW 1
                        Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () async {
                                  // Navigates directly from Dashboard to Camera Scanner
                                  context.pushNamed(CameraScannerWidget.routeName);
                                },
                                child: wrapWithModel(
                                  model: _model.quickActionCardModel1,
                                  updateCallback: () => safeSetState(() {}),
                                  child: QuickActionCardWidget(
                                    icon: Icon(
                                      Icons.qr_code_scanner_rounded,
                                      color: FlutterFlowTheme.of(context).primaryText,
                                      size: 32,
                                    ),
                                    title: 'Scan Medicine',
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: InkWell(
                                onTap: () async {
                                  context.pushNamed(AIChatbotAssistantWidget.routeName);
                                },
                                child: wrapWithModel(
                                  model: _model.quickActionCardModel2,
                                  updateCallback: () => safeSetState(() {}),
                                  child: QuickActionCardWidget(
                                    icon: Icon(
                                      Icons.smart_toy_rounded,
                                      color: FlutterFlowTheme.of(context).primaryText,
                                      size: 32,
                                    ),
                                    title: 'Voice Chatbot',
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // QUICK ACTION ROW 2
                        Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () async {
                                  context.pushNamed(MedicationScheduleWidget.routeName);
                                },
                                child: wrapWithModel(
                                  model: _model.quickActionCardModel3,
                                  updateCallback: () => safeSetState(() {}),
                                  child: QuickActionCardWidget(
                                    icon: Icon(
                                      Icons.event_note_rounded,
                                      color: FlutterFlowTheme.of(context).primaryText,
                                      size: 32,
                                    ),
                                    title: 'Medication Schedule',
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: InkWell(
                                onTap: () async {
                                  context.pushNamed(AccessibilitySettingsWidget.routeName);
                                },
                                child: wrapWithModel(
                                  model: _model.quickActionCardModel4,
                                  updateCallback: () => safeSetState(() {}),
                                  child: QuickActionCardWidget(
                                    icon: Icon(
                                      Icons.accessibility_new_rounded,
                                      color: FlutterFlowTheme.of(context).primaryText,
                                      size: 32,
                                    ),
                                    title: 'Accessibility Settings',
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // --- BOTTOM NAVIGATION BAR ---
              Align(
                alignment: const AlignmentDirectional(0, 1),
                child: wrapWithModel(
                  model: _model.bottomNavModel,
                  updateCallback: () => safeSetState(() {}),
                  child: const BottomNav4Widget(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
