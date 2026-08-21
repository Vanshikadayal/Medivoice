import '/components/bottom_nav4/bottom_nav4_widget.dart';
import '/components/quick_action_card/quick_action_card_widget.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'voice_first_home_dashboard_widget.dart';
import 'package:flutter/material.dart';

class VoiceFirstHomeDashboardModel
    extends FlutterFlowModel<VoiceFirstHomeDashboardWidget> {
  /// State fields for stateful widgets in this page.

  // State field to track voice listening status if expanded
  bool isListening = false;

  // Model for QuickActionCard (Scan Medicine)
  late QuickActionCardModel quickActionCardModel1;
  
  // Model for QuickActionCard (Voice Chatbot)
  late QuickActionCardModel quickActionCardModel2;
  
  // Model for QuickActionCard (Medication Schedule)
  late QuickActionCardModel quickActionCardModel3;
  
  // Model for QuickActionCard (Accessibility Settings)
  late QuickActionCardModel quickActionCardModel4;
  
  // Model for BottomNav
  late BottomNav4Model bottomNavModel;

  @override
  void initState(BuildContext context) {
    quickActionCardModel1 = createModel(context, () => QuickActionCardModel());
    quickActionCardModel2 = createModel(context, () => QuickActionCardModel());
    quickActionCardModel3 = createModel(context, () => QuickActionCardModel());
    quickActionCardModel4 = createModel(context, () => QuickActionCardModel());
    bottomNavModel = createModel(context, () => BottomNav4Model());
  }

  @override
  void dispose() {
    quickActionCardModel1.dispose();
    quickActionCardModel2.dispose();
    quickActionCardModel3.dispose();
    quickActionCardModel4.dispose();
    bottomNavModel.dispose();
  }
}