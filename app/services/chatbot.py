from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from app.models.chatbot import ChatMessage, ChatMessageCreate, ChatResponse
from app.core.database import get_collection
from app.core.logging import get_logger
from app.services.emotion_analysis import emotion_service
from langdetect import detect, LangDetectException

# Helper to add inside ChatbotService class
def _detect_language(self, text: str) -> str:
    try:
        return detect(text)
    except LangDetectException:
        return 'en' # Default to English if detection fails

logger = get_logger("chatbot")


class ChatbotService:
    """CBT-based AI chatbot service"""
    
    def __init__(self):
        self._chat_collection = None

        # CBT techniques and responses
        self.cbt_techniques = {
            "cognitive_restructuring": {
                "name": "Cognitive Restructuring",
                "description": "Identify and challenge negative thoughts",
                "questions": [
                    "What facts or signs support this thought?",
                    "What facts or signs contradict this thought?",
                    "What would you tell your friend in this situation?",
                    "How might you view these thoughts differently in a week or month?"
                ]
            },
            "behavioral_activation": {
                "name": "Behavioral Activation",
                "description": "Increase positive activities and behaviors",
                "questions": [
                    "What are the activities which you usually used to enjoy?",
                    "What small step could you take today?",
                    "How might you reward yourself for trying?",
                    "What activity would make today a little better?"
                ]
            },
            "mindfulness": {
                "name": "Mindfulness",
                "description": "Practice present-moment awareness",
                "questions": [
                    "What are you noticing right now?",
                    "Can you describe your current emotions without any judgment?",
                    "What physical sensations do you feel right now?",
                    "How might you ground yourself in this moment?"
                ]
            },
            "problem_solving": {
                "name": "Problem Solving",
                "description": "Break down problems into manageable steps",
                "questions": [
                    "What specific problem are you facing?",
                    "What options do you have for addressing this problem?",
                    "What's the smallest step you could take?",
                    "How might you know if a solution is working?"
                ]
            }
        }
        
        # Crisis responses
        self.crisis_responses = {
            "suicidal": {
                "immediate": "I'm concerned about what you're sharing. Your life has value, and help is available. Please call the National Suicide Prevention Lifeline at 988 or text HOME to 741741 to reach the Crisis Text Line. You are not alone.",
                "follow_up": "It's important to talk to someone who can provide professional support. Would you be willing to reach out to a mental health professional or trusted person in your life?"
            },
            "self_harm": {
                "immediate": "I hear that you're in a lot of pain right now. You deserve support and care. Please consider reaching out to a crisis hotline or mental health professional who can help you through this difficult time.",
                "follow_up": "What might help you feel safer right now? Is there someone you trust who you could talk to?"
            },
            "panic": {
                "immediate": "I can see you're feeling very overwhelmed. Let's take a moment to breathe together. Try taking slow, deep breaths - inhale for 4 counts, hold for 4, exhale for 4. You are safe right now.",
                "follow_up": "What triggered these feelings? How might you ground yourself in this moment?"
            }
        }

    @property
    def chat_collection(self):
        if self._chat_collection is None:
            self._chat_collection = get_collection("chat_history")
        return self._chat_collection

    async def process_message(self, user_id: str, message_data: ChatMessageCreate) -> ChatResponse:
        """Process user message and generate CBT-based response"""
        try:
            # 1. Detect language (NEW)
            lang = self._detect_language(message_data.content)
            
            # 2. Analyze message for emotions
            emotion_analysis = emotion_service.analyze_text(message_data.content)
            
            # 3. Check for crisis indicators
            crisis_response = self._check_crisis_indicators(message_data.content, emotion_analysis)
            if crisis_response:
                # We pass 'lang' here to potentially translate the crisis response too
                return await self._create_crisis_response(user_id, message_data, crisis_response, lang)
            
            # 4. Determine appropriate CBT technique
            technique = self._select_cbt_technique(emotion_analysis)
            
            # 5. Generate response (Passing 'lang' for multilingual output)
            response_content = self._generate_cbt_response(message_data.content, technique, emotion_analysis, lang)
            
            # 6. Generate suggestions (Passing 'lang')
            suggestions = self._generate_suggestions(technique, emotion_analysis, lang)
            
            # Create response message
            response_message = await self._create_chat_message(
                user_id=user_id,
                content=response_content,
                is_user=False,
                emotion_data=emotion_analysis.dict()
            )
            
            # Save user message
            await self._create_chat_message(
                user_id=user_id,
                content=message_data.content,
                is_user=True,
                emotion_data=emotion_analysis.dict()
            )

    
            
            return ChatResponse(
                message=response_message,
                suggestions=suggestions,
                mood_analysis=emotion_analysis.dict()
            )
            
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            return await self._create_fallback_response(user_id, message_data)
    
    async def get_chat_history(self, user_id: str, page: int = 1, size: int = 50) -> List[ChatMessage]:
        """Return a paginated list of chat messages for the given user.

        Messages are sorted newest-first so the most recent exchange appears
        on page 1.

        Args:
            user_id: The ID of the authenticated user whose history to fetch.
            page:    1-indexed page number (default 1).
            size:    Number of messages per page (default 50).

        Returns:
            A list of ChatMessage objects.  Returns an empty list if no
            messages exist or if a database error occurs.
        """
        try:
            # Calculate the number of documents to skip for the requested page.
            # e.g. page=2, size=20 → skip the first 20 documents.
            skip = (page - 1) * size

            cursor = (
                self.chat_collection
                .find({"user_id": user_id})
                .sort("created_at", -1)
                .skip(skip)
                .limit(size)
            )

            messages = []
            async for doc in cursor:
                try:
                    # ── Fix: handle documents without an explicit "id" field ──
                    # The legacy chat endpoint used insert_many() without
                    # generating a UUID, so those docs only have MongoDB's
                    # internal "_id".  We use it as a fallback identifier.
                    if not doc.get("id"):
                        doc["id"] = str(doc.get("_id", ""))

                    # Remove the MongoDB-internal key before handing to Pydantic
                    # (Pydantic doesn't know about "_id" and would raise an error).
                    doc.pop("_id", None)

                    # Supply defaults for fields that legacy messages may lack
                    doc.setdefault("message_type", "text")
                    doc.setdefault("emotion_data", {})

                    messages.append(ChatMessage(**doc))
                except Exception as parse_err:
                    # Skip any malformed document so one bad record doesn't
                    # break the entire history response.
                    logger.warning(f"Skipping malformed chat document: {parse_err}")
                    continue

            return messages

        except Exception as e:
            logger.error(f"Error getting chat history: {e}")
            return []
    
    def _check_crisis_indicators(self, message: str, emotion_analysis) -> Optional[Dict[str, str]]:
        """Check for crisis indicators in message"""
        message_lower = message.lower()
        
        # Check for suicidal ideation
        if any(word in message_lower for word in ["kill myself", "suicide", "end it all", "don't want to live"]):
            return self.crisis_responses["suicidal"]
        
        # Check for self-harm
        if any(word in message_lower for word in ["hurt myself", "self-harm", "cut myself", "harm myself"]):
            return self.crisis_responses["self_harm"]
        
        # Check for panic/anxiety
        if any(word in message_lower for word in ["panic", "can't breathe", "overwhelmed", "losing control"]):
            return self.crisis_responses["panic"]
        
        return None
    
    def _select_cbt_technique(self, emotion_analysis) -> str:
        """Select appropriate CBT technique based on emotions"""
        dominant_emotion = emotion_analysis.dominant_emotion
        sentiment_score = emotion_analysis.sentiment_score
        
        if sentiment_score < -0.3:
            if dominant_emotion in ["sad", "depressed", "hopeless"]:
                return "behavioral_activation"
            elif dominant_emotion in ["anxious", "worried", "fearful"]:
                return "mindfulness"
            else:
                return "cognitive_restructuring"
        elif sentiment_score > 0.3:
            return "mindfulness"  # Positive emotions - maintain awareness
        else:
            return "problem_solving"  # Neutral - focus on practical solutions
    
    def _generate_cbt_response(self, user_message: str, technique: str, emotion_analysis, lang: str = "en") -> str:
        """Generate CBT-based response with language support"""
        technique_info = self.cbt_techniques[technique]
        
        if lang == "hi":
            if technique == "cognitive_restructuring":
                response = f"मैं देख रहा हूँ कि आप {emotion_analysis.dominant_emotion} महसूस कर रहे हैं। आइए इन विचारों को चुनौती दें। "
            elif technique == "behavioral_activation":
                response = "मैं समझ सकता हूँ कि आप संघर्ष कर रहे हैं। छोटे कदम बहुत मदद कर सकते हैं। "
            elif technique == "mindfulness":
                response = "लगता है आप बहुत तीव्र भावनाएं महसूस कर रहे हैं। आइए इस पल को महसूस करें। "
            else:
                response = "मैं देख सकता हूँ कि आप एक कठिन स्थिति से गुजर रहे हैं। आइए इसे छोटे हिस्सों में बाँटें। "
            response += technique_info["questions"][0]
        else:
            if technique == "cognitive_restructuring":
                response = f"I notice you're feeling {emotion_analysis.dominant_emotion}. Let us explore the thoughts behind these feelings. "
            elif technique == "behavioral_activation":
                response = "I hear that you are struggling right now. Sometimes small actions can help shift our mood a lot. "
            elif technique == "mindfulness":
                response = "It sounds like you're experiencing some intense emotions. Let's take a moment to observe what is happening. "
            else:
                response = "I can see you're dealing with a challenging situation. Let's break this down into small, manageable pieces. "
            response += technique_info["questions"][0]
        
        return response
    
    def _generate_suggestions(self, technique: str, emotion_analysis, lang: str = "en") -> List[str]:
        """Generate follow-up suggestions with language support"""
        if lang == "hi":
            if technique == "cognitive_restructuring":
                return ["अपने विचारों को लिखें और उन्हें चुनौती दें - सोचें कि क्या वे 100% सच हैं।", "ऐसे तथ्य खोजें जो आपके नकारात्मक विचारों को गलत साबित करें।", "पीछे हटें और सोचें: आप अपने किसी करीबी दोस्त को क्या सलाह देंगे?"]
            elif technique == "behavioral_activation":
                return ["आज कोई 1 सुखद गतिविधि चुनें।", "छोटी शुरुआत करें: कोई भी गतिविधि चुनें और उसे केवल 5 मिनट के लिए करें।", "अपनी भावनाओं पर ध्यान दें: गतिविधि से पहले और बाद में अपने मूड को ट्रैक करें।"]
            elif technique == "mindfulness":
                return ["3 मिनट का गहरा सांस लेने का व्यायाम करें।", "अपने चारों ओर देखें और 5 ऐसी चीजें बताएं जिन्हें आप देख, सुन और महसूस कर सकते हैं।", "बिना किसी निर्णय के अभी महसूस हो रही भावनाओं को देखें।"]
            else:
                return ["समस्या को छोटे-छोटे हिस्सों में बांटें।", "अपने विकल्पों की सूची बनाएं और उनके फायदे/नुकसान का विश्लेषण करें।", "अभी अपने लिए 1 आसान, प्राप्त करने योग्य लक्ष्य निर्धारित करें।"]
        else:
            # Keep your existing English list logic here
            technique_info = self.cbt_techniques[technique]
            suggestions = []
            if technique == "cognitive_restructuring":
                suggestions.extend(["Write down your thoughts and challenge them.", "Look for facts that prove negative thoughts wrong.", "What would you tell a friend?"])
            elif technique == "behavioral_activation":
                suggestions.extend(["Pick 1 enjoyable activity to do today.", "Start small: 5 minutes.", "Track your mood."])
            elif technique == "mindfulness":
                suggestions.extend(["Try deep breathing.", "5-4-3-2-1 technique.", "Observe emotions without judgment."])
            else:
                suggestions.extend(["Break the problem down.", "Analyze pros/cons.", "Set an achievable goal."])
            suggestions.extend(["Chat with a mental health professional.", "Reach out to a trusted friend.", "Do an activity that brings comfort."])
            return suggestions[:5]
    
    async def _create_crisis_response(self, user_id: str, message_data: ChatMessageCreate, crisis_response: Dict[str, str]) -> ChatResponse:
        """Create crisis response"""
        response_message = await self._create_chat_message(
            user_id=user_id,
            content=crisis_response["immediate"],
            is_user=False,
            emotion_data={"crisis": True}
        )
        
        # Save user message
        await self._create_chat_message(
            user_id=user_id,
            content=message_data.content,
            is_user=True,
            emotion_data={"crisis": True}
        )
        
        return ChatResponse(
            message=response_message,
            suggestions=[
                "Call a crisis hotline",
                "Reach out to a mental health professional",
                "Talk to a trusted person",
                "Consider emergency services if needed"
            ],
            mood_analysis={"crisis": True, "severity": "high"}
        )
    
    async def _create_fallback_response(self, user_id: str, message_data: ChatMessageCreate) -> ChatResponse:
        """Create fallback response when processing fails"""
        response_message = await self._create_chat_message(
            user_id=user_id,
            content="I'm here to listen and support you. Could you tell me more about what you're experiencing?",
            is_user=False,
            emotion_data={}
        )
        
        return ChatResponse(
            message=response_message,
            suggestions=[
                "Share more about your feelings",
                "Describe what's happening in your life",
                "Talk about what you need right now"
            ],
            mood_analysis={}
        )
    
    async def _create_chat_message(self, user_id: str, content: str, is_user: bool, emotion_data: Dict[str, Any]) -> ChatMessage:
        """Create and save chat message"""
        message_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        message_doc = {
            "id": message_id,
            "user_id": user_id,
            "content": content,
            "message_type": "text",
            "is_user": is_user,
            "emotion_data": emotion_data,
            "created_at": now
        }
        
        await self.chat_collection.insert_one(message_doc)
        return ChatMessage(**message_doc)


def get_ai_response(message: str) -> str:
    # Dummy AI response for now
    responses = [
        "I understand how you are feeling. Can you tell me more about what's troubling you?",
        "That sounds challenging. Let's work through this together. What thoughts are going through your mind right now?",
        "Thank you for sharing. Have you noticed any patterns in when these feelings occur?",
        "I'm here to support you. What coping strategies have helped you with these felings in the past?"
    ]
    import random
    return random.choice(responses)


# Global chatbot service instance
chatbot_service = ChatbotService() 
