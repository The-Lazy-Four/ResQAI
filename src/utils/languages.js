// ============================================
// Language Translation & Multilingual Support
// ============================================

// Supported languages
export const LANGUAGES = {
    EN: 'en',
    HI: 'hi',
    BN: 'bn'
};

// Language metadata
export const LANGUAGE_NAMES = {
    en: 'English',
    hi: 'हिन्दी (Hindi)',
    bn: 'বাংলা (Bengali)'
};

// Emergency contact translations
export const EMERGENCY_CONTACTS = {
    en: {
        title: '📞 Emergency Contacts (India):',
        national: '112 - National Emergency',
        fire: '101 - Fire Services',
        ambulance: '108 - Ambulance',
        police: '100 - Police',
        note: 'Save these numbers in your phone'
    },
    hi: {
        title: '📞 आपातकालीन संपर्क (भारत):',
        national: '112 - राष्ट्रीय आपातकाल',
        fire: '101 - अग्निशमन सेवा',
        ambulance: '108 - एम्बुलेंस',
        police: '100 - पुलिस',
        note: 'इन नंबरों को अपने फोन में सहेजें'
    },
    bn: {
        title: '📞 জরুরি যোগাযোগ (ভারত):',
        national: '112 - জাতীয় জরুরি',
        fire: '101 - অগ্নিনিয়ন্ত্রণ সেবা',
        ambulance: '108 - অ্যাম্বুলেন্স',
        police: '100 - পুলিস',
        note: 'এই নম্বরগুলি আপনার ফোনে সংরক্ষণ করুন'
    }
};

// UI Translations
export const UI_TRANSLATIONS = {
    en: {
        'emergency-type': 'Emergency Type',
        'steps': 'Steps',
        'actions': 'Immediate Actions',
        'contacts': 'Emergency Contacts',
        'prevention': 'Prevention Tips',
        'select-language': 'Select Language',
        'voice-input': 'Voice Input',
        'text-input': 'Text Input',
        'nearby-alerts': 'Nearby Alerts',
        'incident-map': 'Incident Map',
        'dashboard': 'Dashboard',
        'chat': 'AI Assistant',
        'report': 'Report Emergency'
    },
    hi: {
        'emergency-type': 'आपातकाल का प्रकार',
        'steps': 'चरण',
        'actions': 'तत्काल कार्य',
        'contacts': 'आपातकालीन संपर्क',
        'prevention': 'रोकथाम के सुझाव',
        'select-language': 'भाषा चुनें',
        'voice-input': 'आवाज इनपुट',
        'text-input': 'पाठ इनपुट',
        'nearby-alerts': 'पास की चेतावनियां',
        'incident-map': 'घटना मानचित्र',
        'dashboard': 'डैशबोर्ड',
        'chat': 'कृत्रिम बुद्धिमत्ता सहायक',
        'report': 'आपातकाल की रिपोर्ट करें'
    },
    bn: {
        'emergency-type': 'জরুরি ধরন',
        'steps': 'ধাপসমূহ',
        'actions': 'তাৎক্ষণিক পদক্ষেপ',
        'contacts': 'জরুরি যোগাযোগ',
        'prevention': 'প্রতিরোধমূলক পরামর্শ',
        'select-language': 'ভাষা নির্বাচন করুন',
        'voice-input': 'ভয়েস ইনপুট',
        'text-input': 'পাঠ ইনপুট',
        'nearby-alerts': 'কাছাকাছি সতর্কতা',
        'incident-map': 'ঘটনা মানচিত্র',
        'dashboard': 'ড্যাশবোর্ড',
        'chat': 'কৃত্রিম বুদ্ধিমত্তা সহায়ক',
        'report': 'জরুরি অবস্থার রিপোর্ট করুন'
    }
};

// System prompts for different languages
export const getSystemPrompt = (language = 'en') => {
    const prompts = {
        en: `You are ResQAI, an Indian crisis intelligence and emergency response assistant.

RESPONSE FORMAT - MUST FOLLOW EXACTLY:
🚨 [EMERGENCY TYPE]

**Immediate Actions:**
1. Action 1
2. Action 2
3. Action 3

**Step-by-Step Instructions:**
1. Step 1 with details
2. Step 2 with details
3. Step 3 with details

**Prevention & Safety:**
- Tip 1
- Tip 2

📞 **Emergency Contacts (India):**
- 112 - National Emergency
- 101 - Fire Services
- 108 - Ambulance
- 100 - Police

⚠️ If multiple people injured or life-threatening, always call 108 or 112 FIRST.`,

        hi: `आप ResQAI हैं, भारतीय संकट बुद्धিमत्ता और आपातकालीन प्रतिक्रिया सहायक।

प्रतिक्रिया प्रारूप - बिल्कुल पालन करें:
🚨 [आपातकाल का प्रकार]

**तत्काल कार्य:**
1. कार्य 1
2. कार्य 2
3. कार्य 3

**चरण-दर-चरण निर्देश:**
1. चरण 1 विवरण के साथ
2. चरण 2 विवरण के साथ
3. चरण 3 विवरण के साथ

**रोकथाम और सुरक्षा:**
- सुझाव 1
- सुझाव 2

📞 **आपातकालीन संपर्क (भारत):**
- 112 - राष्ट्रीय आपातकाल
- 101 - अग्निशमन सेवा
- 108 - एम्बुलेंस
- 100 - पुलिस

⚠️ यदि कई लोग घायल हैं या जीवन खतरे में है, तो हमेशा पहले 108 या 112 को कॉल करें।`,

        bn: `আপনি ResQAI, একটি ভারতীয় সংকট বুদ্ধিমত্তা এবং জরুরি প্রতিক্রিয়া সহায়ক।

প্রতিক্রিয়া বিন্যাস - ঠিক অনুসরণ করুন:
🚨 [জরুরি ধরন]

**তাৎক্ষণিক পদক্ষেপ:**
1. পদক্ষেপ 1
2. পদক্ষেপ 2
3. পদক্ষেপ 3

**ধাপে ধাপে নির্দেশাবলী:**
1. ধাপ 1 বিস্তারিত সহ
2. ধাপ 2 বিস্তারিত সহ
3. ধাপ 3 বিস্তারিত সহ

**প্রতিরোধ এবং সুরক্ষা:**
- পরামর্শ 1
- পরামর্শ 2

📞 **জরুরি যোগাযোগ (ভারত):**
- 112 - জাতীয় জরুরি
- 101 - অগ্নিনিয়ন্ত্রণ সেবা
- 108 - অ্যাম্বুলেন্স
- 100 - পুলিস

⚠️ যদি একাধিক ব্যক্তি আহত হন বা জীবন বিপন্ন হয়, সর্বদা প্রথমে 108 বা 112 কে কল করুন।`
    };

    return prompts[language] || prompts.en;
};

// Validate language
export const isValidLanguage = (lang) => {
    return Object.values(LANGUAGES).includes(lang);
};

export default { LANGUAGES, LANGUAGE_NAMES, EMERGENCY_CONTACTS, UI_TRANSLATIONS, getSystemPrompt, isValidLanguage };
