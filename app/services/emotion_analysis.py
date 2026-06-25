import base64
import io
import numpy as np
from typing import List, Dict, Any, Optional
from PIL import Image
import cv2
import librosa
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from transformers import pipeline
import torch

from app.models.analysis import (
    EmotionResult, TextAnalysisResponse, AudioAnalysisResponse, 
    ImageAnalysisResponse, MultiModalAnalysisResponse
)
from app.core.logging import get_logger

logger = get_logger("emotion_analysis")


class EmotionAnalysisService:
    """Service for emotion analysis using AI models"""
    
    def __init__(self):
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        self.text_classifier = None
        self.audio_classifier = None
        self.image_classifier = None
        
        # Check if CUDA (GPU) is available to accelerate inference
        self.device = 0 if torch.cuda.is_available() else -1
        
        # Initialize models
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize AI models"""
        try:
            # Text classification model (emotion detection)
            self.text_classifier = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                return_all_scores=True,
                device=self.device
            )
            logger.info("Text emotion model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load text emotion model: {e}")
        
        try:
            # Audio emotion classification (Wav2Vec2 fine-tuned on emotion datasets)
            self.audio_classifier = pipeline(
                "audio-classification",
                model="ehsanaghaei/wav2vec2-base-Speech_Emotion_Recognition",
                device=self.device
            )
            logger.info("Audio emotion model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to load audio emotion model: {e}")

        try:
            # Image emotion classification (ViT fine-tuned on facial expressions)
            self.image_classifier = pipeline(
                "image-classification",
                model="dima806/facial_emotions_image_detection",
                device=self.device
            )
            logger.info("Image emotion model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to load image emotion model: {e}")
    
    def analyze_text(self, text: str) -> TextAnalysisResponse:
        """Analyze text for emotions and sentiment"""
        try:
            vader_scores = self.sentiment_analyzer.polarity_scores(text)
            sentiment_score = vader_scores['compound']
            
            if sentiment_score >= 0.05:
                sentiment = "positive"
            elif sentiment_score <= -0.05:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            emotions = []
            if self.text_classifier:
                try:
                    emotion_results = self.text_classifier(text)[0]
                    for result in emotion_results:
                        emotions.append(EmotionResult(
                            label=result['label'],
                            confidence=result['score'],
                            score=sentiment_score
                        ))
                except Exception as e:
                    logger.error(f"Text emotion classification failed: {e}")
            
            if not emotions:
                if sentiment == "positive":
                    emotions = [EmotionResult(label="happy", confidence=0.7, score=sentiment_score)]
                elif sentiment == "negative":
                    emotions = [EmotionResult(label="sad", confidence=0.7, score=sentiment_score)]
                else:
                    emotions = [EmotionResult(label="neutral", confidence=0.7, score=sentiment_score)]
            
            dominant_emotion = max(emotions, key=lambda x: x.confidence)
            
            return TextAnalysisResponse(
                emotions=emotions,
                sentiment=sentiment,
                sentiment_score=sentiment_score,
                dominant_emotion=dominant_emotion.label,
                confidence=dominant_emotion.confidence
            )
            
        except Exception as e:
            logger.error(f"Text analysis error: {e}")
            return TextAnalysisResponse(
                emotions=[EmotionResult(label="neutral", confidence=0.5, score=0.0)],
                sentiment="neutral",
                sentiment_score=0.0,
                dominant_emotion="neutral",
                confidence=0.5
            )
    
    def analyze_audio(self, audio_data: str, audio_format: str = "wav") -> AudioAnalysisResponse:
        """Analyze audio for emotion detection"""
        try:
            audio_bytes = base64.b64decode(audio_data)
            # Force target sampling rate to 16kHz as required by most audio transformers
            audio_array, sample_rate = librosa.load(io.BytesIO(audio_bytes), sr=16000)
            
            # Keep feature extraction intact for API safety
            features = self._extract_audio_features(audio_array, sample_rate)
            
            # Transformer-based classification
            emotions = []
            if self.audio_classifier:
                model_outputs = self.audio_classifier(audio_array)
                for out in model_outputs:
                    # Map common naming conventions back to standard ones if necessary
                    label = out['label'].lower()
                    emotions.append(EmotionResult(label=label, confidence=out['score']))
            
            if not emotions:
                emotions = self._classify_audio_emotion(features)
                
            dominant_emotion = max(emotions, key=lambda x: x.confidence)
            
            return AudioAnalysisResponse(
                emotions=emotions,
                dominant_emotion=dominant_emotion.label,
                confidence=dominant_emotion.confidence,
                audio_features=features
            )
            
        except Exception as e:
            logger.error(f"Audio analysis error: {e}")
            return AudioAnalysisResponse(
                emotions=[EmotionResult(label="neutral", confidence=0.5)],
                dominant_emotion="neutral",
                confidence=0.5,
                audio_features={}
            )
    
    def analyze_image(self, image_data: str, image_format: str = "jpeg") -> ImageAnalysisResponse:
        """Analyze image for facial emotion detection"""
        try:
            image_bytes = base64.b64decode(image_data)
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            emotions = []
            face_detected = False
            
            # Step 1: Detect bounding boxes of faces
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                face_detected = True
                # Crop to the largest detected face for optimal transformer classification
                largest_face = max(faces, key=lambda bounding_box: bounding_box[2] * bounding_box[3])
                x, y, w, h = largest_face
                
                # Dynamic padding buffer around the face bounding box
                pad_w, pad_h = int(w * 0.1), int(h * 0.1)
                y1 = max(0, y - pad_h)
                y2 = min(cv_image.shape[0], y + h + pad_h)
                x1 = max(0, x - pad_w)
                x2 = min(cv_image.shape[1], x + w + pad_w)
                
                face_crop = pil_image.crop((x1, y1, x2, y2))
                
                if self.image_classifier:
                    model_outputs = self.image_classifier(face_crop)
                    for out in model_outputs:
                        emotions.append(EmotionResult(label=out['label'].lower(), confidence=out['score']))
            
            # Fallback if no faces detected or model failed
            if not emotions:
                if self.image_classifier:
                    # Process whole image as fallback
                    model_outputs = self.image_classifier(pil_image)
                    for out in model_outputs:
                        emotions.append(EmotionResult(label=out['label'].lower(), confidence=out['score']))
                else:
                    emotions = [EmotionResult(label="neutral", confidence=0.5)]
            
            dominant_emotion = max(emotions, key=lambda x: x.confidence)
            
            return ImageAnalysisResponse(
                emotions=emotions,
                dominant_emotion=dominant_emotion.label,
                confidence=dominant_emotion.confidence,
                face_detected=face_detected,
                face_features={}
            )
            
        except Exception as e:
            logger.error(f"Image analysis error: {e}")
            return ImageAnalysisResponse(
                emotions=[EmotionResult(label="neutral", confidence=0.5)],
                dominant_emotion="neutral",
                confidence=0.5,
                face_detected=False,
                face_features={}
            )
    
    def analyze_multimodal(self, text: Optional[str] = None, 
                          audio_data: Optional[str] = None,
                          image_data: Optional[str] = None) -> MultiModalAnalysisResponse:
        """Analyze multiple modalities and combine results"""
        text_analysis = None
        audio_analysis = None
        image_analysis = None
        
        if text:
            text_analysis = self.analyze_text(text)
        if audio_data:
            audio_analysis = self.analyze_audio(audio_data)
        if image_data:
            image_analysis = self.analyze_image(image_data)
        
        combined_emotion, combined_confidence, risk_level = self._combine_emotions(
            text_analysis, audio_analysis, image_analysis
        )
        
        return MultiModalAnalysisResponse(
            text_analysis=text_analysis,
            audio_analysis=audio_analysis,
            image_analysis=image_analysis,
            combined_emotion=combined_emotion,
            combined_confidence=combined_confidence,
            risk_level=risk_level
        )
    
    def _extract_audio_features(self, audio_array: np.ndarray, sample_rate: int) -> Dict[str, float]:
        """Extract audio features for emotion classification"""
        features = {}
        try:
            spectral_centroids = librosa.feature.spectral_centroid(y=audio_array, sr=sample_rate)[0]
            spectral_rolloff = librosa.feature.spectral_rolloff(y=audio_array, sr=sample_rate)[0]
            mfccs = librosa.feature.mfcc(y=audio_array, sr=sample_rate, n_mfcc=13)
            pitches, magnitudes = librosa.piptrack(y=audio_array, sr=sample_rate)
            
            features = {
                "spectral_centroid_mean": float(np.mean(spectral_centroids)),
                "spectral_rolloff_mean": float(np.mean(spectral_rolloff)),
                "mfcc_mean": float(np.mean(mfccs)),
                "pitch_mean": float(np.mean(pitches[magnitudes > 0.1])) if np.any(magnitudes > 0.1) else 0.0,
                "energy": float(np.mean(librosa.feature.rms(y=audio_array)[0]))
            }
        except Exception as e:
            logger.error(f"Audio feature extraction error: {e}")
        return features
    
    def _classify_audio_emotion(self, features: Dict[str, float]) -> List[EmotionResult]:
        """Classify emotions based on audio features (Fallback Method)"""
        emotions = []
        try:
            energy = features.get("energy", 0)
            pitch = features.get("pitch_mean", 0)
            
            if energy > 0.1 and pitch > 200:
                emotions.append(EmotionResult(label="excited", confidence=0.7))
            elif energy < 0.05:
                emotions.append(EmotionResult(label="sad", confidence=0.6))
            elif pitch > 300:
                emotions.append(EmotionResult(label="anxious", confidence=0.6))
            else:
                emotions.append(EmotionResult(label="neutral", confidence=0.5))
        except Exception as e:
            logger.error(f"Audio emotion classification error: {e}")
            emotions.append(EmotionResult(label="neutral", confidence=0.5))
        return emotions

    def _combine_emotions(self, text_analysis: Optional[TextAnalysisResponse],
                         audio_analysis: Optional[AudioAnalysisResponse],
                         image_analysis: Optional[ImageAnalysisResponse]) -> tuple[str, float, str]:
        """Combine emotions from multiple modalities"""
        emotions = []
        confidences = []
        
        if text_analysis:
            emotions.append(text_analysis.dominant_emotion)
            confidences.append(text_analysis.confidence)
        if audio_analysis:
            emotions.append(audio_analysis.dominant_emotion)
            confidences.append(audio_analysis.confidence)
        if image_analysis:
            emotions.append(image_analysis.dominant_emotion)
            confidences.append(image_analysis.confidence)
        
        if not emotions:
            return "neutral", 0.5, "low"
        
        emotion_counts = {}
        for emotion in emotions:
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
        
        combined_emotion = max(emotion_counts, key=emotion_counts.get)
        combined_confidence = np.mean(confidences) if confidences else 0.5
        
        negative_emotions = ["sad", "angry", "anxious", "depressed", "fear", "disgust"]
        if combined_emotion in negative_emotions and combined_confidence > 0.7:
            risk_level = "high"
        elif combined_emotion in negative_emotions and combined_confidence > 0.5:
            risk_level = "medium"
        else:
            risk_level = "low"
            
        return combined_emotion, combined_confidence, risk_level


# Global emotion analysis service instance
emotion_service = EmotionAnalysisService()
