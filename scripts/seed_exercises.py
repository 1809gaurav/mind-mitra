import sys
from pymongo import MongoClient
from app.core.config import settings

EXERCISES = [
    {
        "id": "cbt-thought-record",
        "title": "Thought Record (Cognitive Restructuring)",
        "description": "Identify and challenge automatic negative thoughts by looking at evidence for and against them.",
        "type": "cognitive",
        "steps": [
            "Identify the distressing situation.",
            "Notice and write down the automatic negative thought.",
            "Rate the intensity of the associated emotion (0-100%).",
            "List evidence supporting the thought.",
            "List evidence opposing the thought.",
            "Develop a balanced, realistic alternative thought.",
            "Re-rate your emotion intensity."
        ],
        "duration_minutes": 15
    },
    {
        "id": "cbt-behavioral-activation",
        "title": "Behavioral Activation Scheduler",
        "description": "Schedule positive, meaningful activities to disrupt patterns of avoidance and improve mood.",
        "type": "behavioral",
        "steps": [
            "List activities that previously brought joy or sense of achievement.",
            "Choose one low-barrier activity to complete this week.",
            "Schedule a specific day, time, and duration for the activity.",
            "Perform the activity as scheduled.",
            "Reflect and note your mood before and after."
        ],
        "duration_minutes": 10
    },
    {
        "id": "cbt-box-breathing",
        "title": "Box Breathing (4-4-4-4)",
        "description": "Regulate your nervous system and reduce physical symptoms of anxiety.",
        "type": "somatic",
        "steps": [
            "Exhale all air from your lungs.",
            "Inhale slowly through your nose for 4 seconds.",
            "Hold your breath for 4 seconds.",
            "Exhale slowly through your mouth for 4 seconds.",
            "Hold your lungs empty for 4 seconds.",
            "Repeat the loop 4 to 5 times."
        ],
        "duration_minutes": 5
    },
    {
        "id": "cbt-worry-time",
        "title": "Worry Time Postponement",
        "description": "Contain your worry by scheduling a specific, dedicated block of time for it.",
        "type": "cognitive",
        "steps": [
            "Set aside a dedicated 15-minute 'Worry Time' window daily.",
            "When worries arise during the day, write them down and postpone them.",
            "Refocus on your current task or surroundings.",
            "During Worry Time, review the list and focus only on solvable issues."
        ],
        "duration_minutes": 15
    },
    {
        "id": "cbt-decatastrophizing",
        "title": "Decatastrophizing (What-If Analysis)",
        "description": "Address cognitive distortion by evaluating the realistic likelihood of your worst fears.",
        "type": "cognitive",
        "steps": [
            "Identify the worst-case scenario you are worrying about.",
            "Rate the realistic probability of it actually happening.",
            "Identify the best-case scenario.",
            "Identify the most likely or realistic outcome.",
            "Write down how you would cope if the worst did happen."
        ],
        "duration_minutes": 10
    },
    {
        "id": "cbt-grounding-54321",
        "title": "5-4-3-2-1 Grounding Exercise",
        "description": "Use your five senses to ground yourself in the present moment during high stress or anxiety.",
        "type": "somatic",
        "steps": [
            "Acknowledge 5 things you can see around you.",
            "Acknowledge 4 things you can touch or feel.",
            "Acknowledge 3 things you can hear.",
            "Acknowledge 2 things you can smell.",
            "Acknowledge 1 thing you can taste."
        ],
        "duration_minutes": 5
    },
    {
        "id": "cbt-gratitude-journaling",
        "title": "Gratitude Journaling",
        "description": "Shift focus to positive aspects of life by reflecting on things you appreciate.",
        "type": "behavioral",
        "steps": [
            "Think back over the last 24 hours.",
            "Identify and write down 3 things you are grateful for.",
            "Explain briefly why each of these brought you joy or comfort.",
            "Allow yourself to sit with the positive feeling for a minute."
        ],
        "duration_minutes": 5
    },
    {
        "id": "cbt-pmr",
        "title": "Progressive Muscle Relaxation (PMR)",
        "description": "Relieve physical tension by systematically tensing and relaxing muscle groups.",
        "type": "somatic",
        "steps": [
            "Find a quiet space to sit or lie down comfortably.",
            "Tense muscle groups (feet/legs) for 5 seconds, then release completely.",
            "Notice the feeling of relaxation vs tension.",
            "Repeat for torso, arms, shoulders, neck, and face.",
            "Breathe deeply and enjoy the state of relaxation."
        ],
        "duration_minutes": 15
    },
    {
        "id": "cbt-problem-solving",
        "title": "Problem Solving (SOLVE)",
        "description": "Break down overwhelming problems into actionable and logical steps.",
        "type": "behavioral",
        "steps": [
            "Specify the problem in clear, concrete terms.",
            "Brainstorm at least 3 potential solutions without judging them.",
            "Identify pros and cons for each proposed solution.",
            "Select the most feasible solution.",
            "Create a step-by-step action plan to implement it."
        ],
        "duration_minutes": 15
    },
    {
        "id": "cbt-core-beliefs",
        "title": "Core Beliefs Worksheet",
        "description": "Uncover and re-evaluate deep-seated negative assumptions about yourself.",
        "type": "cognitive",
        "steps": [
            "Write down a recurring negative self-evaluation.",
            "Ask 'What does this say about me?' to identify the core belief.",
            "List life experiences that contradict this negative core belief.",
            "Draft a new, realistic, and compassionate core belief.",
            "Rate how strongly you believe the new belief."
        ],
        "duration_minutes": 20
    }
]


def seed():
    print(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    try:
        client = MongoClient(settings.MONGODB_URL)
        db = client[settings.DATABASE_NAME]
        collection = db["exercises"]

        seeded_count = 0
        for exercise in EXERCISES:
            # Check if exercise with this ID already exists
            existing = collection.find_one({"id": exercise["id"]})
            if not existing:
                collection.insert_one(exercise)
                seeded_count += 1
                print(f"Seeded: {exercise['title']}")
            else:
                print(f"Skipped (already exists): {exercise['title']}")

        print(f"Seeding completed successfully! Seeded {seeded_count} new exercises.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    seed()
