export const SCENARIOS = [
  { id:'daily', name:'Daily Conversation', icon:'☕', level:'Beginner',
    blurb:'Talk about your day, your routine.',
    questions:[
      "Tell me about your day. What did you do today?",
      "What time do you usually wake up in the morning?",
      "What do you normally eat for breakfast?"
    ]},
  { id:'intro', name:'Introduce Yourself', icon:'🙋', level:'Beginner',
    blurb:'Practise introductions.',
    questions:[
      "Let's start simple. Tell me your name and where you're from.",
      "What do you do — are you a student or do you work?",
      "What do you enjoy doing in your free time?"
    ]},
  { id:'interview', name:'Job Interview', icon:'💼', level:'Intermediate',
    blurb:'Answer real interview questions.',
    questions:[
      "So, tell me a little about yourself.",
      "Why do you want to work with us?",
      "What would you say is your biggest strength?"
    ]},
  { id:'office', name:'Office Conversation', icon:'🏢', level:'Intermediate',
    blurb:'Small talk with colleagues.',
    questions:[
      "Morning! How's your week going so far?",
      "Did you get a chance to look at the report I sent?",
      "How do you usually handle tight deadlines?"
    ]},
  { id:'shopping', name:'Shopping', icon:'🛍️', level:'Beginner',
    blurb:'Ask about size, price, offers.',
    questions:[
      "Hi there! What are you looking for today?",
      "What size do you usually wear?",
      "Would you like to try it on?"
    ]},
  { id:'restaurant', name:'Restaurant', icon:'🍽️', level:'Elementary',
    blurb:'Order food, ask about the menu.',
    questions:[
      "Good evening! A table for how many?",
      "Can I get you something to drink first?",
      "Are you ready to order?"
    ]},
  { id:'travel', name:'Travel & Airport', icon:'✈️', level:'Elementary',
    blurb:'Check in, ask for directions.',
    questions:[
      "Good morning. May I see your passport and ticket?",
      "How many bags are you checking in today?",
      "Would you prefer a window or an aisle seat?"
    ]},
  { id:'doctor', name:"Doctor's Appointment", icon:'🩺', level:'Intermediate',
    blurb:'Describe symptoms clearly.',
    questions:[
      "What seems to be the problem?",
      "How long have you been feeling this way?",
      "Have you taken any medication so far?"
    ]},
  { id:'free', name:'Free Conversation', icon:'💬', level:'Intermediate',
    blurb:'No script. Just talk.',
    questions:[
      "So, what's on your mind today?",
      "What's something you've been thinking about a lot lately?",
      "Tell me about something you're proud of."
    ]}
];