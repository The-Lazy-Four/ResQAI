// =====================================================
// RESCUE BUILDER - TEMPLATE DEFINITIONS
// =====================================================

const ORGANIZATION_TEMPLATES = {
    school: {
        name: "School",
        description: "Primary, secondary, or higher education",
        icon: "🏫",
        defaultFloors: 3,
        defaultRooms: 40,
        defaultBuildings: 1,
        riskTypes: ["fire", "intruder", "medical"],
        roles: [
            { name: "Principal", role: "commander" },
            { name: "Security Head", role: "warden" },
            { name: "School Nurse", role: "medical" }
        ],
        evacuationSteps: [
            "Alert all classrooms via PA system",
            "Teachers lead students to assembly point",
            "Check attendance in designated zones",
            "Wait for all-clear from commander",
            "Return to building when safe"
        ],
        safetyTips: [
            "Know your evacuation assembly point",
            "Stay with your class and teacher",
            "Do not use elevators during emergency",
            "Keep phones charged and on silent",
            "Report suspicious activity immediately"
        ],
        emergencyContacts: [
            { name: "Local Fire Department", phone: "911" },
            { name: "Police Department", phone: "911" },
            { name: "Hospital Emergency", phone: "911" }
        ]
    },

    hospital: {
        name: "Hospital",
        description: "Medical facility with multi-department",
        icon: "🏥",
        defaultFloors: 5,
        defaultRooms: 150,
        defaultBuildings: 2,
        riskTypes: ["fire", "medical", "chemical"],
        roles: [
            { name: "Hospital Administrator", role: "commander" },
            { name: "Chief Nurse", role: "warden" },
            { name: "Chief Medical Officer", role: "medical" },
            { name: "Security Chief", role: "responder" }
        ],
        evacuationSteps: [
            "Activate hospital emergency alert system",
            "Nurses prepare patients for evacuation",
            "Move critical patients to designated areas",
            "Account for all staff and patients",
            "Coordinate with external emergency services"
        ],
        safetyTips: [
            "Know emergency exits on your floor",
            "Attend mandatory safety drills",
            "Report hazards to administration",
            "Keep emergency contact numbers accessible",
            "Practice proper lift and transfer techniques"
        ],
        emergencyContacts: [
            { name: "Fire Department", phone: "911" },
            { name: "Ambulance Service", phone: "911" },
            { name: "Police", phone: "911" },
            { name: "Poison Control", phone: "1-800-222-1222" }
        ]
    },

    hostel: {
        name: "Hostel",
        description: "Student or employee accommodation",
        icon: "🏢",
        defaultFloors: 4,
        defaultRooms: 80,
        defaultBuildings: 1,
        riskTypes: ["fire", "intruder", "medical"],
        roles: [
            { name: "Hostel Warden", role: "commander" },
            { name: "Security Guard", role: "warden" },
            { name: "Wardens (Female)", role: "coordinator" },
            { name: "First Aider", role: "medical" }
        ],
        evacuationSteps: [
            "Sound the alarm or bell continuously",
            "Evacuate all residents immediately",
            "Assemble at the designated parade ground",
            "Wardens account for all residents",
            "Report any missing persons to commander"
        ],
        safetyTips: [
            "Know the evacuation assembly area",
            "Keep room doors unlocked during night",
            "Report unusual persons to security",
            "Maintain emergency fund for help",
            "Share contact info with roommates"
        ],
        emergencyContacts: [
            { name: "Warden Contact", phone: "Extension provided" },
            { name: "Hospital Nearby", phone: "Local hospital" },
            { name: "Police Station", phone: "Emergency: 911" }
        ]
    },

    college: {
        name: "College",
        description: "University or higher education campus",
        icon: "🎓",
        defaultFloors: 6,
        defaultRooms: 200,
        defaultBuildings: 5,
        riskTypes: ["fire", "intruder", "medical", "earthquake"],
        roles: [
            { name: "Dean / Principal", role: "commander" },
            { name: "Chief Warden", role: "warden" },
            { name: "Campus Security Chief", role: "responder" },
            { name: "Medical Officer", role: "medical" }
        ],
        evacuationSteps: [
            "Activate campus-wide emergency alert",
            "Evacuate all buildings simultaneously",
            "Gather at designated assembly zones",
            "Department heads conduct headcount",
            "Central command coordinates response"
        ],
        safetyTips: [
            "Register with campus emergency system",
            "Know multiple evacuation routes",
            "Attend annual safety orientation",
            "Keep emergency kit in dorm/office",
            "Practice fire drills regularly"
        ],
        emergencyContacts: [
            { name: "Campus Security", phone: "Campus extension" },
            { name: "Emergency Hotline", phone: "911" },
            { name: "Campus Health Center", phone: "Provided" }
        ]
    },

    restaurant: {
        name: "Restaurant",
        description: "Dining or hospitality venue",
        icon: "🍽️",
        defaultFloors: 2,
        defaultRooms: 20,
        defaultBuildings: 1,
        riskTypes: ["fire", "medical"],
        roles: [
            { name: "Manager", role: "commander" },
            { name: "Head Chef", role: "warden" },
            { name: "Server Lead", role: "coordinator" },
            { name: "First Aider", role: "medical" }
        ],
        evacuationSteps: [
            "Alert all staff and customers immediately",
            "Guide customers to nearest exit",
            "Assist elderly and children first",
            "Account for all persons outside",
            "Contact emergency services"
        ],
        safetyTips: [
            "Know location of all exits",
            "Be familiar with fire extinguisher use",
            "Report equipment malfunctions immediately",
            "Maintain clear emergency exits",
            "Train all staff on safety procedures"
        ],
        emergencyContacts: [
            { name: "Fire Department", phone: "911" },
            { name: "Ambulance", phone: "911" },
            { name: "Police", phone: "911" }
        ]
    },

    other: {
        name: "Custom Organization",
        description: "Define your own organization type",
        icon: "⚙️",
        defaultFloors: 2,
        defaultRooms: 10,
        defaultBuildings: 1,
        riskTypes: ["fire", "medical"],
        roles: [
            { name: "Emergency Commander", role: "commander" },
            { name: "Safety Coordinator", role: "coordinator" },
            { name: "First Responder", role: "responder" }
        ],
        evacuationSteps: [
            "Sound alarm or evacuation signal",
            "Evacuate all persons safely",
            "Assemble at designated area",
            "Conduct headcount and report",
            "Await further instructions"
        ],
        safetyTips: [
            "Know your evacuation assembly point",
            "Familiarize yourself with exits",
            "Keep emergency numbers handy",
            "Report hazards immediately",
            "Participate in safety drills"
        ],
        emergencyContacts: [
            { name: "Emergency Services", phone: "911" },
            { name: "Local Police", phone: "911" },
            { name: "Local Hospital", phone: "911" }
        ]
    }
};

// =====================================================
// AI RESPONSE TEMPLATES
// =====================================================

const AI_RESPONSES = {
    evacuationGuidance: {
        fire: "In case of fire: 1. Alert everyone nearby, 2. Activate alarm if safe, 3. Evacuate using nearest exit, 4. Close doors behind you, 5. Assemble at designated point, 6. Do not use elevators",
        medical: "Medical emergency protocol: 1. Call for medical personnel, 2. Ensure area is safe, 3. Do not move injured person unnecessarily, 4. Provide basic first aid if trained, 5. Keep airways clear, 6. Monitor vital signs",
        intruder: "Active threat response: 1. If safe, evacuate immediately, 2. If trapped, lockdown in secure area, 3. Silence phone, 4. Do not confront threat, 5. Wait for all-clear from authorities",
        flood: "Flood response: 1. Move to higher ground immediately, 2. Do not attempt to cross flooded areas, 3. Shut off utilities if possible, 4. Await rescue teams if trapped, 5. Document damage for insurance",
        earthquake: "Earthquake response: 1. Drop, Cover, Hold On immediately, 2. Stay where you are until shaking stops, 3. Exit building carefully, 4. Check for injuries, 5. Move to open area away from structures",
        chemical: "Chemical hazard response: 1. Evacuate area immediately, 2. Move upwind/upstream if possible, 3. Seek medical attention, 4. Remove contaminated clothing, 5. Rinse with water if exposed"
    },

    roleInstructions: {
        commander: "As Emergency Commander, coordinate all emergency response. Ensure evacuation, account for all persons, communicate with external services, make critical decisions.",
        warden: "As Floor/Area Warden, guide people to exits, conduct headcount, report status to commander, ensure vulnerable persons are assisted.",
        medical: "As Medical Lead, provide first aid, assess injuries, coordinate with medical professionals, set up triage area if needed.",
        coordinator: "As Coordinator, assist with communication, help organize people, support commander, ensure procedures are followed.",
        responder: "As First Responder, provide assistance during evacuation, help those in need, check for hazards, report to warden/commander."
    },

    safetyTipsByType: {
        school: [
            "Regular evacuation drills strengthen muscle memory for emergencies",
            "Know the location of fire extinguishers and first aid kits in your classroom",
            "Report any blocked emergency exits immediately",
            "Keep a list of student allergies and medical needs accessible",
            "Establish a communication protocol for staff and parents"
        ],
        hospital: [
            "Patient evacuation requires careful planning and professional protocols",
            "Maintain critical patient information and transfer procedures",
            "Staff training must be continuous and mandatory",
            "Equipment should be checked regularly for functionality",
            "Communication between departments is crucial"
        ],
        hostel: [
            "Create a buddy system for evacuation accountability",
            "Keep emergency contact numbers posted in common areas",
            "Maintain clear pathways and unblocked exits at all times",
            "Regular drills ensure residents know procedures",
            "Night wardens should be alert and accessible"
        ],
        college: [
            "Campus-wide coordination is essential for large evacuations",
            "International students may need language assistance",
            "Multiple assembly points help manage large crowds",
            "Department leaders are key communication nodes",
            "Campus safety should be integrated with local services"
        ],
        restaurant: [
            "Train staff on emergency procedures during onboarding",
            "Regularly check and maintain fire suppression systems",
            "Customer safety is the top priority in emergencies",
            "Clear communication prevents panic",
            "Post exit routes and assembly points visibly"
        ]
    }
};

// =====================================================
// UTILITY FUNCTIONS FOR TEMPLATES
// =====================================================

function getTemplate(type) {
    return ORGANIZATION_TEMPLATES[type] || ORGANIZATION_TEMPLATES.other;
}

function getEvacuationGuidance(riskType) {
    return AI_RESPONSES.evacuationGuidance[riskType] || AI_RESPONSES.evacuationGuidance.fire;
}

function getRoleInstructions(role) {
    return AI_RESPONSES.roleInstructions[role] || "Follow your designated role and support the emergency commander";
}

function getSafetyTips(orgType) {
    return AI_RESPONSES.safetyTipsByType[orgType] || AI_RESPONSES.safetyTipsByType.other;
}

function generateSystemID() {
    return 'SYS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}
