import '/components/button/button_widget.dart';
import '/flutter_flow/flutter_flow_animations.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import 'dart:ui';
import '/index.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:percent_indicator/percent_indicator.dart';
import 'package:provider/provider.dart';

import 'splash_screen_model.dart';
export 'splash_screen_model.dart';

class SplashScreenWidget extends StatefulWidget {
  const SplashScreenWidget({super.key});

  static String routeName = 'SplashScreen';
  static String routePath = '/splashScreen';

  @override
  State<SplashScreenWidget> createState() => _SplashScreenWidgetState();
}

class _SplashScreenWidgetState extends State<SplashScreenWidget>
    with TickerProviderStateMixin {
  late SplashScreenModel _model;
  final scaffoldKey = GlobalKey<ScaffoldState>();
  final animationsMap = <String, AnimationInfo>{};

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => SplashScreenModel());

    // Auto-navigate after 2 seconds safely
    SchedulerBinding.instance.addPostFrameCallback((_) async {
      await Future.delayed(const Duration(milliseconds: 2000));
      if (!mounted) return; // Prevent navigation crash if screen was dismissed

      if (Navigator.of(context).canPop()) {
        context.pop();
      }
      context.pushNamed(AccessibleLoginWidget.routeName);
    });

    // Register animations
    animationsMap.addAll({
      'columnOnActionTriggerAnimation': AnimationInfo(
        trigger: AnimationTrigger.onActionTrigger,
        applyInitialState: true,
        effectsBuilder: () => [
          FadeEffect(
            curve: Curves.easeInOut,
            delay: 0.0.ms,
            duration: 1060.0.ms,
            begin: 0.0,
            end: 1.0,
          ),
        ],
      ),
      'iconOnPageLoadAnimation': AnimationInfo(
        trigger: AnimationTrigger.onPageLoad,
        effectsBuilder: () => [
          FadeEffect(
            curve: Curves.easeInOut,
            delay: 0.0.ms,
            duration: 600.0.ms,
            begin: 0.0,
            end: 1.0,
          ),
        ],
      ),
    });

    setupAnimations(
      animationsMap.values.where((anim) =>
          anim.trigger == AnimationTrigger.onActionTrigger ||
          !anim.applyInitialState),
      this,
    );
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
        body: Column(
          mainAxisSize: MainAxisSize.max,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Spacer(flex: 2),

            // App Logo Container
            Container(
              width: 120,
              height: 120,
              decoration: const BoxDecoration(
                color: Color(0xFFFFBF00),
                boxShadow: [
                  BoxShadow(
                    blurRadius: 30,
                    color: Color(0xFFFFBF00),
                    offset: Offset(0, 10),
                    spreadRadius: 0,
                  )
                ],
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.mic_rounded,
                      color: Color(0xFF0F172A),
                      size: 64,
                    ).animateOnPageLoad(
                        animationsMap['iconOnPageLoadAnimation']!),
                  ],
                ).animateOnActionTrigger(
                  animationsMap['columnOnActionTriggerAnimation']!,
                ),
              ),
            ),

            const SizedBox(height: 20),

            // App Name & Subtitle
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'MediVoice',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    fontSize: 48,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Voice-First Medication Partner',
                  style: GoogleFonts.readexPro(
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFFFFBF00),
                    fontSize: 16,
                    height: 1.4,
                  ),
                ),
              ],
            ),

            const Spacer(flex: 3),

            // Screen Reader Optimized Badge & Progress Indicator
            Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularPercentIndicator(
                  percent: 0,
                  radius: 16,
                  lineWidth: 4,
                  animation: true,
                  animateFromLastPercent: true,
                  progressColor: const Color(0xFFFFBF00),
                  backgroundColor:
                      FlutterFlowTheme.of(context).alternate,
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0x1AFFFFFF),
                    borderRadius: BorderRadius.circular(9999),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 32, vertical: 12),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.record_voice_over_rounded,
                          color: Color(0xFFFFBF00),
                          size: 18,
                        ),
                        const SizedBox(width: 10),
                        Text(
                          'Optimized for Screen Readers',
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const Spacer(),

            // Get Started Button
            InkWell(
              splashColor: Colors.transparent,
              focusColor: Colors.transparent,
              hoverColor: Colors.transparent,
              highlightColor: Colors.transparent,
              onTap: () async {
                context.goNamed(AccessibleLoginWidget.routeName);
              },
              child: wrapWithModel(
                model: _model.buttonModel,
                updateCallback: () => safeSetState(() {}),
                child: ButtonWidget(
                  iconPresent: false,
                  iconEndPresent: false,
                  content: 'Get Started',
                  variant: 'primary',
                  size: 'large',
                  fullWidth: false,
                  loading: false,
                  disabled: false,
                ),
              ),
            ),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}