import '/components/button/button_widget.dart';
import '/components/login_header/login_header_widget.dart';
import '/components/text_field/text_field_widget.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import '/flutter_flow/flutter_flow_widgets.dart';
import 'dart:ui';
import '/index.dart';
import 'accessible_login_widget.dart' show AccessibleLoginWidget;
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

class AccessibleLoginModel extends FlutterFlowModel<AccessibleLoginWidget> {
  /// Local state fields for this page.
  String? email = '';
  String? password = '';
  bool? isRegistering = false;
  String? error = '';

  /// State fields for stateful widgets in this page.

  // Model for LoginHeader.
  late LoginHeaderModel loginHeaderModel;

  // Model for Email TextField.
  late TextFieldModel textFieldModel1;

  // Model for Password TextField.
  late TextFieldModel textFieldModel2;

  // Model for Forgot Password Button.
  late ButtonModel buttonModel1;

  // Model for Voice Sign-in Button.
  late ButtonModel buttonModel2;

  // Model for Account Toggle Button.
  late ButtonModel buttonModel3;

  @override
  void initState(BuildContext context) {
    loginHeaderModel = createModel(context, () => LoginHeaderModel());
    textFieldModel1 = createModel(context, () => TextFieldModel());
    textFieldModel2 = createModel(context, () => TextFieldModel());
    buttonModel1 = createModel(context, () => ButtonModel());
    buttonModel2 = createModel(context, () => ButtonModel());
    buttonModel3 = createModel(context, () => ButtonModel());
  }

  @override
  void dispose() {
    loginHeaderModel.dispose();
    textFieldModel1.dispose();
    textFieldModel2.dispose();
    buttonModel1.dispose();
    buttonModel2.dispose();
    buttonModel3.dispose();
  }

  /// Helper to clear or reset state errors and inputs
  void resetForm() {
    email = '';
    password = '';
    error = '';
  }
}