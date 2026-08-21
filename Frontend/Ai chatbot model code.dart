import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'ai_chatbot_assistant_widget.dart' show AIChatbotAssistantWidget;
import 'package:flutter/material.dart';

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final Map<String, dynamic>? medicineData; // Holds medicine payload for action cards

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.medicineData,
  });
}

class AIChatbotAssistantModel extends FlutterFlowModel<AIChatbotAssistantWidget> {
  /// State fields for stateful widgets in this page.
  TextEditingController? textController;
  FocusNode? textControllerFocusNode;
  
  List<ChatMessage> chatMessages = [];
  bool isAiTyping = false;

  @override
  void initState(BuildContext context) {
    textController = TextEditingController();
    textControllerFocusNode = FocusNode();
  }

  @override
  void dispose() {
    textController?.dispose();
    textControllerFocusNode?.dispose();
  }
}