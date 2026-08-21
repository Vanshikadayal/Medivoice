import '/flutter_flow/flutter_flow_icon_button.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '/index.dart';

import 'camera_scanner_model.dart';
export 'camera_scanner_model.dart';

class CameraScannerWidget extends StatefulWidget {
  const CameraScannerWidget({super.key});

  static String routeName = 'CameraScanner';
  static String routePath = '/cameraScanner';

  @override
  State<CameraScannerWidget> createState() => _CameraScannerWidgetState();
}

class _CameraScannerWidgetState extends State<CameraScannerWidget> {
  late CameraScannerModel _model;
  final MobileScannerController _cameraController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  final scaffoldKey = GlobalKey<ScaffoldState>();
  bool _hasDetected = false;

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => CameraScannerModel());
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _model.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) async {
    if (_hasDetected) return;

    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
        setState(() {
          _hasDetected = true;
          _model.isProcessing = true;
          _model.scannedResult = barcode.rawValue;
        });

        await _cameraController.stop();

        if (!mounted) return;

        // Directly routes scanned payload from Scanner page to AI Assistant page
        context.pushNamed(
          AIChatbotAssistantWidget.routeName,
          queryParameters: {
            'scannedMedicineData': _model.scannedResult!,
          },
        );
        break;
      }
    }
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
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Stack(
            children: [
              MobileScanner(
                controller: _cameraController,
                onDetect: _onDetect,
                errorBuilder: (context, error, child) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Text(
                        'Camera permission denied or camera unavailable.',
                        style: GoogleFonts.inter(color: Colors.white),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  );
                },
              ),
              Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    FlutterFlowIconButton(
                      borderRadius: 24,
                      buttonSize: 48,
                      fillColor: Colors.black.withOpacity(0.5),
                      icon: const Icon(
                        Icons.arrow_back_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      onPressed: () async {
                        context.pop();
                      },
                    ),
                    Text(
                      'Medicine QR Scanner',
                      style: FlutterFlowTheme.of(context).titleMedium.override(
                            fontFamily: GoogleFonts.readexPro().fontFamily,
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    FlutterFlowIconButton(
                      borderRadius: 24,
                      buttonSize: 48,
                      fillColor: Colors.black.withOpacity(0.5),
                      icon: ValueListenableBuilder(
                        valueListenable: _cameraController,
                        builder: (context, state, child) {
                          return Icon(
                            state.torchState == TorchState.on
                                ? Icons.flash_on_rounded
                                : Icons.flash_off_rounded,
                            color: Colors.white,
                            size: 24,
                          );
                        },
                      ),
                      onPressed: () => _cameraController.toggleTorch(),
                    ),
                  ],
                ),
              ),
              Center(
                child: Container(
                  width: MediaQuery.sizeOf(context).width * 0.75,
                  height: MediaQuery.sizeOf(context).width * 0.75,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: _model.isProcessing
                          ? FlutterFlowTheme.of(context).success
                          : FlutterFlowTheme.of(context).primary,
                      width: 3.0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: (FlutterFlowTheme.of(context).primary)
                            .withOpacity(0.25),
                        blurRadius: 20,
                        spreadRadius: 2,
                      )
                    ],
                  ),
                  child: _model.isProcessing
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(
                                FlutterFlowTheme.of(context).primary,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'QR Code Detected!\nRedirecting to AI Assistant...',
                              textAlign: TextAlign.center,
                              style: FlutterFlowTheme.of(context)
                                  .bodyMedium
                                  .override(
                                    fontFamily: GoogleFonts.inter().fontFamily,
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                            ),
                          ],
                        )
                      : null,
                ),
              ),
              Positioned(
                bottom: 32,
                left: 20,
                right: 20,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    FlutterFlowIconButton(
                      borderRadius: 24,
                      buttonSize: 48,
                      fillColor: Colors.black.withOpacity(0.5),
                      icon: const Icon(
                        Icons.flip_camera_ios_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      onPressed: () => _cameraController.switchCamera(),
                    ),
                    Text(
                      'Point camera at medicine QR code',
                      style: FlutterFlowTheme.of(context).bodyMedium.override(
                            fontFamily: GoogleFonts.inter().fontFamily,
                            color: Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}