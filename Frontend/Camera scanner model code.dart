dependencies:
  flutter:
    sdk: flutter
  mobile_scanner: ^5.2.0
  import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'camera_scanner_widget.dart' show CameraScannerWidget;
import 'package:flutter/material.dart';

class CameraScannerModel extends FlutterFlowModel<CameraScannerWidget> {
  bool isFlashOn = false;
  bool isFrontCamera = false;
  bool isProcessing = false;
  String? scannedResult;

  @override
  void initState(BuildContext context) {}

  @override
  void dispose() {}
}