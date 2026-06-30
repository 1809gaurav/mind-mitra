from collections import defaultdict
from datetime import datetime, timezone, timedelta
from app.core.database import get_collection

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import Table, TableStyle
import matplotlib.pyplot as plt
import os

class ReportService:
    def __init__(self):
        self.emotion_db = get_collection("emotion_logs")
        self.journal_db = get_collection("journal_entries")
        self.chat_db = get_collection("chat_history")

    async def get_raw_weekly_data(self, user_id: str):
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        query = {"user_id": user_id, "timestamp": {"$gte": start_date}}
        journal_query = {"user_id": user_id, "created_at": {"$gte": start_date}}
        chat_query = {"user_id": user_id, "is_user": True, "created_at": {"$gte": start_date}}
        
        chat_count = await self.chat_db.count_documents(chat_query)

        return {
            "emotions": await self.emotion_db.find(query).to_list(None),
            "journals": await self.journal_db.find(journal_query).to_list(None),
            "chats": chat_count
        }

    async def aggregate_weekly_data(self, user_id: str):
        data = await self.get_raw_weekly_data(user_id)
        
        emotion_freq = defaultdict(int)
        for log in data["emotions"]:
            emotion_freq[log.get("dominant_emotion", "unknown")] += 1

        mood_trend = [log.get("mood_score") for log in data["journals"]]

        raw_text = " ".join([log.get("text", "") for log in data["journals"]])
        summary = raw_text[:100]

        return {
            "weekly_summary": dict(emotion_freq),
            "mood_trend": mood_trend,
            "journal_highlight": summary,
            "cbt_sessions": data["chats"]
        }
    
    async def generate_weekly_pdf(self, user_id: str):
        data = await self.aggregate_weekly_data(user_id)
        
        os.makedirs("reports", exist_ok=True)
        file_path = f"reports/{user_id}_weekly.pdf"
        chart_path = f"reports/{user_id}_chart.png"
        
        plt.style.use('seaborn-v0_8-muted') 
        plt.figure(figsize=(6, 2.5))
        plt.plot(data["mood_trend"], marker='o', linestyle='-', color='#4A90E2', linewidth=2)
        plt.grid(True, linestyle='--', alpha=0.6)
        plt.title("Weekly Mood Trend", fontsize=12, pad=10)
        plt.savefig(chart_path, bbox_inches='tight')
        plt.close()

        doc = SimpleDocTemplate(file_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        styles = getSampleStyleSheet()
        
        title_style = styles['Title']
        title_style.textColor = colors.HexColor("#2C3E50")
        
        story = [Paragraph("Weekly Mental Health Report", title_style), Spacer(1, 0.5 * inch)]

        story.append(Paragraph("Mood Trend", styles['Heading2']))
        story.append(Image(chart_path, width=5 * inch, height=2 * inch))
        story.append(Spacer(1, 0.3 * inch))

        story.append(Paragraph("Emotion Breakdown", styles['Heading2']))
        table_data = [["Emotion", "Count"]] + [[k.capitalize(), v] for k, v in data["weekly_summary"].items()]
        t = Table(table_data, colWidths=[2 * inch, 1 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4A90E2")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        story.append(t)
        story.append(Spacer(1, 0.3 * inch))

        story.append(Paragraph("Journal Highlights", styles['Heading2']))
        story.append(Paragraph(data["journal_highlight"], styles['Normal']))
        story.append(Spacer(1, 0.2 * inch))
        
        story.append(Paragraph(f"<b>CBT Sessions Completed:</b> <font color='#27AE60'>{data['cbt_sessions']}</font>", styles['Normal']))

        doc.build(story)
        return file_path