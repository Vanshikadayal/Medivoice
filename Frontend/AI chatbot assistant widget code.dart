import '/flutter_flow/flutter_flow_icon_button.dart';
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'ai_chatbot_assistant_model.dart';
export 'ai_chatbot_assistant_model.dart';

class AIChatbotAssistantWidget extends StatefulWidget {
  const AIChatbotAssistantWidget({
    super.key,
    this.scannedMedicineData,
  });

  final String? scannedMedicineData;

  static String routeName = 'AIChatbotAssistant';
  static String routePath = '/aiChatbotAssistant';

  @override
  State<AIChatbotAssistantWidget> createState() => _AIChatbotAssistantWidgetState();
}

class _AIChatbotAssistantWidgetState extends State<AIChatbotAssistantWidget> {
  late AIChatbotAssistantModel _model;
  final scaffoldKey = GlobalKey<ScaffoldState>();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _model = createModel(context, () => AIChatbotAssistantModel());

    // Automatically trigger analysis if routed from the Camera Scanner
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.scannedMedicineData != null && widget.scannedMedicineData!.isNotEmpty) {
        _handleScannedInput(widget.scannedMedicineData!);
      } else {
        // Initial welcome message from AI
        setState(() {
          _model.chatMessages.add(
            ChatMessage(
              text: "Hello! I'm your MediVoice AI Assistant. You can ask me about dosages, side effects, or scan a medicine QR code.",
              isUser: false,
              timestamp: DateTime.now(),
            ),
          );
        });
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _model.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  /// Handles payload received directly from Camera Scanner Page
  void _handleScannedInput(String scannedPayload) async {
    setState(() {
      _model.chatMessages.add(
        ChatMessage(
          text: "Scanned Medicine Code: $scannedPayload",
          isUser: true,
          timestamp: DateTime.now(),
        ),
      );
      _model.isAiTyping = true;
    });
    _scrollToBottom();

    // =========================================================================
    // BACKEND DEVELOPER HOOK: Replace this mock delay with your actual API endpoint.
    // e.g. final response = await http.post('/api/v1/analyze-qr', body: {'payload': scannedPayload});
    // =========================================================================
    await Future.delayed(const Duration(seconds: 2));

    if (!mounted) return;

    setState(() {
      _model.isAiTyping = false;
      _model.chatMessages.add(
        ChatMessage(
          text: "I analyzed the QR code! Here are the details for Amoxicillin 500mg:",
          isUser: false,
          timestamp: DateTime.now(),
          medicineData: {
            'name': 'Amoxicillin',
            'dosage': '500mg',
            'instructions': 'Take 1 capsule every 8 hours with water after meals.',
            'rawCode': scannedPayload,
          },
        ),
      );
    });
    _scrollToBottom();
  }

  /// Handles user sending a manual message
  void _handleSendMessage() async {
    final query = _model.textController?.text.trim();
    if (query == null || query.isEmpty) return;

    _model.textController?.clear();

    setState(() {
      _model.chatMessages.add(
        ChatMessage(
          text: query,
          isUser: true,
          timestamp: DateTime.now(),
        ),
      );
      _model.isAiTyping = true;
    });
    _scrollToBottom();

    // =========================================================================
    // BACKEND DEVELOPER HOOK: Send user query to LLM AI Server / LangChain / OpenAI API.
    // =========================================================================
    await Future.delayed(const Duration(milliseconds: 1500));

    if (!mounted) return;

    setState(() {
      _model.isAiTyping = false;
      _model.chatMessages.add(
        ChatMessage(
          text: "I received your question about '$query'. Always consult your healthcare provider, but standard guidelines recommend taking this with food.",
          isUser: false,
          timestamp: DateTime.now(),
        ),
      );
    });
    _scrollToBottom();
  }

  /// Navigates frontend state to the Medication Schedule Page
  void _navigateToMedicationSchedule(Map<String, dynamic> medicineData) {
    context.pushNamed(
      'MedicationSchedule', // Route name for your schedule page
      queryParameters: {
        'medicineName': medicineData['name'] ?? '',
        'dosage': medicineData['dosage'] ?? '',
        'instructions': medicineData['instructions'] ?? '',
      },
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
        backgroundColor: FlutterFlowTheme.of(context).primaryBackground,
        appBar: AppBar(
          backgroundColor: FlutterFlowTheme.of(context).secondaryBackground,
          automaticallyImplyLeading: false,
          leading: FlutterFlowIconButton(
            borderColor: Colors.transparent,
            borderRadius: 30,
            borderWidth: 1,
            buttonSize: 60,
            icon: Icon(
              Icons.arrow_back_rounded,
              color: FlutterFlowTheme.of(context).primaryText,
              size: 24,
            ),
            onPressed: () async {
              context.pop();
            },
          ),
          title: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: FlutterFlowTheme.of(context).primary.withOpacity(0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.smart_toy_rounded,
                  color: FlutterFlowTheme.of(context).primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'MediVoice AI Assistant',
                    style: FlutterFlowTheme.of(context).titleMedium.override(
                          fontFamily: GoogleFonts.readexPro().fontFamily,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  Text(
                    'Active • Medical Info Helper',
                    style: FlutterFlowTheme.of(context).labelSmall.override(
                          fontFamily: GoogleFonts.inter().fontFamily,
                          color: FlutterFlowTheme.of(context).success,
                        ),
                  ),
                ],
              ),
            ],
          ),
          centerTitle: false,
          elevation: 1,
        ),
        body: SafeArea(
          child: Column(
            children: [
              // --- CHAT MESSAGES AREA ---
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _model.chatMessages.length,
                  itemBuilder: (context, index) {
                    final msg = _model.chatMessages[index];
                    return _buildMessageBubble(msg);
                  },
                ),
              ),

              // --- AI TYPING INDICATOR ---
              if (_model.isAiTyping)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            FlutterFlowTheme.of(context).primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        'MediVoice AI is thinking...',
                        style: FlutterFlowTheme.of(context).labelMedium.override(
                              fontFamily: GoogleFonts.inter().fontFamily,
                              fontStyle: FontStyle.italic,
                            ),
                      ),
                    ],
                  ),
                ),

              // --- INPUT BAR ---
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: FlutterFlowTheme.of(context).secondaryBackground,
                  boxShadow: [
                    BoxShadow(
                      blurRadius: 4,
                      color: Colors.black.withOpacity(0.05),
                      offset: const Offset(0, -2),
                    )
                  ],
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _model.textController,
                        focusNode: _model.textControllerFocusNode,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          hintText: 'Ask MediVoice or paste info...',
                          hintStyle: FlutterFlowTheme.of(context).labelMedium,
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: FlutterFlowTheme.of(context).alternate,
                              width: 1,
                            ),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: FlutterFlowTheme.of(context).primary,
                              width: 2,
                            ),
                            borderRadius: BorderRadius.circular(24),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 12,
                          ),
                          filled: true,
                          fillColor: FlutterFlowTheme.of(context).primaryBackground,
                        ),
                        style: FlutterFlowTheme.of(context).bodyMedium,
                        onFieldSubmitted: (_) => _handleSendMessage(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FlutterFlowIconButton(
                      borderRadius: 24,
                      buttonSize: 48,
                      fillColor: FlutterFlowTheme.of(context).primary,
                      icon: const Icon(
                        Icons.send_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                      onPressed: _handleSendMessage,
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

  /// UI Builder for Individual Chat Bubbles and Medicine Action Cards
  Widget _buildMessageBubble(ChatMessage msg) {
    final isUser = msg.isUser;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment:
            isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment:
                isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser) ...[
                CircleAvatar(
                  radius: 16,
                  backgroundColor: FlutterFlowTheme.of(context).primary,
                  child: const Icon(Icons.smart_toy, color: Colors.white, size: 16),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isUser
                        ? FlutterFlowTheme.of(context).primary
                        : FlutterFlowTheme.of(context).secondaryBackground,
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(16),
                      topRight: const Radius.circular(16),
                      bottomLeft: Radius.circular(isUser ? 16 : 0),
                      bottomRight: Radius.circular(isUser ? 0 : 16),
                    ),
                    border: isUser
                        ? null
                        : Border.all(
                            color: FlutterFlowTheme.of(context).alternate,
                          ),
                  ),
                  child: Text(
                    msg.text,
                    style: FlutterFlowTheme.of(context).bodyMedium.override(
                          fontFamily: GoogleFonts.inter().fontFamily,
                          color: isUser
                              ? Colors.white
                              : FlutterFlowTheme.of(context).primaryText,
                        ),
                  ),
                ),
              ),
              if (isUser) ...[
                const SizedBox(width: 8),
                CircleAvatar(
                  radius: 16,
                  backgroundColor: FlutterFlowTheme.of(context).secondaryText,
                  child: const Icon(Icons.person, color: Colors.white, size: 16),
                ),
              ],
            ],
          ),

          // --- ACTION CARD: NAVIGATE TO MEDICATION SCHEDULE PAGE ---
          if (msg.medicineData != null) ...[
            const SizedBox(height: 10),
            Container(
              margin: const EdgeInsets.only(left: 40, right: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: FlutterFlowTheme.of(context).secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: FlutterFlowTheme.of(context).primary.withOpacity(0.5),
                  width: 1.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.medication_rounded,
                        color: FlutterFlowTheme.of(context).primary,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        msg.medicineData!['name'] ?? 'Detected Medicine',
                        style: FlutterFlowTheme.of(context).titleMedium.override(
                              fontFamily: GoogleFonts.readexPro().fontFamily,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: FlutterFlowTheme.of(context).primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          msg.medicineData!['dosage'] ?? '',
                          style: FlutterFlowTheme.of(context).bodySmall.override(
                                fontFamily: GoogleFonts.inter().fontFamily,
                                color: FlutterFlowTheme.of(context).primary,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    msg.medicineData!['instructions'] ?? '',
                    style: FlutterFlowTheme.of(context).bodySmall,
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _navigateToMedicationSchedule(msg.medicineData!),
                      icon: const Icon(Icons.calendar_today_rounded, size: 16),
                      label: const Text('Add to Medication Schedule'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: FlutterFlowTheme.of(context).primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}