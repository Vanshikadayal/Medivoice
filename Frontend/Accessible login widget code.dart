import '/components/button/button_widget.dart';
import '/components/login_header/login_header_widget.dart';
import '/components/text_field/text_field_widget.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import 'dart:ui';
import '/index.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'accessible_login_model.dart';
export 'accessible_login_model.dart';

class AccessibleLoginWidget extends StatefulWidget {
  const AccessibleLoginWidget({super.key});

  static String routeName = 'AccessibleLogin';
  static String routePath = '/accessibleLogin';

  @override
  State<AccessibleLoginWidget> createState() => _AccessibleLoginWidgetState();
}

class _AccessibleLoginWidgetState extends State<AccessibleLoginWidget> {
  late AccessibleLoginModel _model;

  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => AccessibleLoginModel());
  }

  @override
  void dispose() {
    _model.dispose();
    super.dispose();
  }

  void _handleSignInOrRegister() async {
    // Basic frontend validation check
    if ((_model.email ?? '').isEmpty || (_model.password ?? '').isEmpty) {
      safeSetState(() {
        _model.error = 'Please fill in both Email and Password fields.';
      });
      return;
    }

    safeSetState(() {
      _model.error = '';
    });

    if (_model.isRegistering == true) {
      // Registration Action Logic
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Registering account...')),
      );
    } else {
      // Sign-in Action Logic
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Signing in...')),
      );
      // Navigate to dashboard upon successful login
      context.pushNamed(VoiceFirstHomeDashboardWidget.routeName);
    }
  }

  void _handleVoiceSignIn() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Listening for voice sign-in...')),
    );
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
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header Component
                  wrapWithModel(
                    model: _model.loginHeaderModel,
                    updateCallback: () => safeSetState(() {}),
                    child: LoginHeaderWidget(
                      title: 'MediVoice',
                      subtitle: 'Access your medication partner',
                    ),
                  ),

                  // Form Input Fields Section
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Email Field Container
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: FlutterFlowTheme.of(context).primaryText,
                            width: 2,
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: wrapWithModel(
                            model: _model.textFieldModel1,
                            updateCallback: () => safeSetState(() {}),
                            child: TextFieldWidget(
                              label: 'Email Address',
                              labelPresent: true,
                              helper: '',
                              helperPresent: false,
                              leadingIcon: Icon(
                                Icons.email_rounded,
                                color: FlutterFlowTheme.of(context).primaryText,
                                size: 24,
                              ),
                              leadingIconPresent: true,
                              trailingIconPresent: false,
                              hint: 'Enter your email',
                              value: _model.email,
                              onChange: (val) => _model.email = val,
                              onSubmit: (val) => _handleSignInOrRegister(),
                              variant: 'ghost',
                              error: false,
                            ),
                          ),
                        ),
                      ),

                      // Password Field Container
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: FlutterFlowTheme.of(context).primaryText,
                            width: 2,
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(6),
                          child: wrapWithModel(
                            model: _model.textFieldModel2,
                            updateCallback: () => safeSetState(() {}),
                            child: TextFieldWidget(
                              label: 'Password',
                              labelPresent: true,
                              helper: '',
                              helperPresent: false,
                              leadingIcon: Icon(
                                Icons.lock_rounded,
                                color: FlutterFlowTheme.of(context).primaryText,
                                size: 24,
                              ),
                              leadingIconPresent: true,
                              trailingIcon: Icon(
                                Icons.visibility_rounded,
                                color: FlutterFlowTheme.of(context).primaryText,
                                size: 24,
                              ),
                              trailingIconPresent: true,
                              hint: 'Enter your password',
                              value: _model.password,
                              onChange: (val) => _model.password = val,
                              onSubmit: (val) => _handleSignInOrRegister(),
                              variant: 'ghost',
                              error: false,
                            ),
                          ),
                        ),
                      ),

                      // Dynamic Error Message Display
                      if (_model.error != null && _model.error!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: Text(
                            _model.error!,
                            style: FlutterFlowTheme.of(context).bodyMedium.override(
                                  fontFamily: GoogleFonts.inter().fontFamily,
                                  color: FlutterFlowTheme.of(context).error,
                                  lineHeight: 1.6,
                                ),
                          ),
                        ),

                      // Forgot Password Link Button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          wrapWithModel(
                            model: _model.buttonModel1,
                            updateCallback: () => safeSetState(() {}),
                            child: InkWell(
                              onTap: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                      content: Text('Navigating to Forgot Password...')),
                                );
                              },
                              child: ButtonWidget(
                                iconPresent: false,
                                iconEndPresent: false,
                                content: 'Forgot Password?',
                                variant: 'ghost',
                                size: 'small',
                                fullWidth: false,
                                loading: false,
                                disabled: false,
                                icon: const Icon(Icons.record_voice_over),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ].divide(const SizedBox(height: 20)),
                  ),

                  // Voice Action Section
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: 64,
                        child: wrapWithModel(
                          model: _model.buttonModel2,
                          updateCallback: () => safeSetState(() {}),
                          child: InkWell(
                            onTap: _handleVoiceSignIn,
                            child: ButtonWidget(
                              icon: const Icon(
                                Icons.record_voice_over,
                                color: Color(0xFFE5E7EB),
                                size: 20,
                              ),
                              iconPresent: true,
                              iconEndPresent: false,
                              content: 'Sign in with Voice',
                              variant: 'outline',
                              size: 'large',
                              fullWidth: true,
                              loading: false,
                              disabled: false,
                              iconEnd: null,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  // Account Toggle Option Section
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Divider(
                        height: 16,
                        thickness: 1,
                        color: FlutterFlowTheme.of(context).primaryText,
                      ),
                      Text(
                        _model.isRegistering == true
                            ? 'Already have an account?'
                            : 'Don\'t have an account?',
                        style: FlutterFlowTheme.of(context).bodyLarge.override(
                              fontFamily: GoogleFonts.inter().fontFamily,
                              color: FlutterFlowTheme.of(context).secondaryText,
                              lineHeight: 1.6,
                            ),
                      ),
                      InkWell(
                        onTap: () async {
                          safeSetState(() {
                            _model.isRegistering = !(_model.isRegistering ?? false);
                            _model.error = '';
                          });
                        },
                        child: wrapWithModel(
                          model: _model.buttonModel3,
                          updateCallback: () => safeSetState(() {}),
                          child: ButtonWidget(
                            iconPresent: false,
                            iconEndPresent: false,
                            content: _model.isRegistering == true
                                ? 'Back to Sign In'
                                : 'Create Account',
                            variant: 'secondary',
                            size: 'large',
                            fullWidth: true,
                            loading: false,
                            disabled: false,
                          ),
                        ),
                      ),
                    ].divide(const SizedBox(height: 16)),
                  ),

                  // Accessibility Notice Card
                  Container(
                    decoration: BoxDecoration(
                      color: FlutterFlowTheme.of(context).surfaceVariant,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Icon(
                            Icons.accessibility_new_rounded,
                            color: FlutterFlowTheme.of(context).primary,
                            size: 28,
                          ),
                          Expanded(
                            child: Text(
                              'High-contrast mode is active. Use voice commands at any time.',
                              style: FlutterFlowTheme.of(context).bodyMedium.override(
                                    fontFamily: GoogleFonts.inter().fontFamily,
                                    color: FlutterFlowTheme.of(context).primaryText,
                                    lineHeight: 1.6,
                                  ),
                            ),
                          ),
                        ].divide(const SizedBox(width: 16)),
                      ),
                    ),
                  ),
                ].divide(const SizedBox(height: 32)),
              ),
            ),
          ),
        ),
      ),
    );
  }
}