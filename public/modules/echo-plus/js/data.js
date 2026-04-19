// ============================================================
// ECHO+ DATA MODEL — Hotels, Rooms, Staff, Scenarios
// ============================================================

const ECHO_DATA = {

  hotels: [
    {
      id: "h1",
      name: "The Oberoi Grand",
      city: "Kolkata", country: "India",
      type: "luxury",
      floors: 6,
      emergencyContacts: { fire: "101", police: "100", ambulance: "108", frontDesk: "0" },
      mapLayout: {
        zones: ["Lobby","East Wing","West Wing","Exit A","Exit B","Kitchen","Conference","Rooftop"],
        exits: ["Exit A (Main Entrance)","Exit B (Service Door)","Exit C (Fire Escape East)"],
        assemblyPoint: "Front Lawn, 50m from main gate"
      },
      rooms: [
        { roomNumber:"101", floor:1, guestName:"Arjun Mehta", secretCode:"A1234", status:"occupied", zone:"east" },
        { roomNumber:"102", floor:1, guestName:"Priya Sharma", secretCode:"P5678", status:"occupied", zone:"east" },
        { roomNumber:"103", floor:1, guestName:"", secretCode:"", status:"vacant", zone:"west" },
        { roomNumber:"104", floor:1, guestName:"Rohan Das", secretCode:"R9012", status:"occupied", zone:"west" },
        { roomNumber:"105", floor:1, guestName:"Sneha Roy", secretCode:"S3456", status:"occupied", zone:"corridor" },
        { roomNumber:"201", floor:2, guestName:"Kabir Khan", secretCode:"K7890", status:"occupied", zone:"east" },
        { roomNumber:"202", floor:2, guestName:"Ananya Bose", secretCode:"B1122", status:"occupied", zone:"east" },
        { roomNumber:"203", floor:2, guestName:"Vikram Nair", secretCode:"V3344", status:"occupied", zone:"west" },
        { roomNumber:"204", floor:2, guestName:"Meera Pillai", secretCode:"M5566", status:"occupied", zone:"west" },
        { roomNumber:"205", floor:2, guestName:"", secretCode:"", status:"vacant", zone:"corridor" },
        { roomNumber:"301", floor:3, guestName:"Aditya Singh", secretCode:"AS789", status:"occupied", zone:"east" },
        { roomNumber:"302", floor:3, guestName:"Pooja Verma", secretCode:"PV234", status:"occupied", zone:"west" },
        { roomNumber:"303", floor:3, guestName:"Ravi Kumar", secretCode:"RK567", status:"occupied", zone:"east" },
        { roomNumber:"401", floor:4, guestName:"Nisha Gupta", secretCode:"NG890", status:"occupied", zone:"west" },
        { roomNumber:"402", floor:4, guestName:"", secretCode:"", status:"vacant", zone:"east" },
        { roomNumber:"501", floor:5, guestName:"Suresh Iyer", secretCode:"SI123", status:"occupied", zone:"east" },
        { roomNumber:"601", floor:6, guestName:"Deepa Nair", secretCode:"DN456", status:"occupied", zone:"west" },
      ]
    },
    {
      id: "h2",
      name: "Taj Lake Palace",
      city: "Udaipur", country: "India",
      type: "boutique",
      floors: 4,
      emergencyContacts: { fire: "101", police: "100", ambulance: "108", frontDesk: "0" },
      mapLayout: {
        zones: ["Royal Lobby","North Pavilion","South Pavilion","Garden Exit","Lake Exit","Spa Wing"],
        exits: ["Garden Exit (East)","Lake Exit (West)","Emergency Stairwell"],
        assemblyPoint: "Royal Courtyard"
      },
      rooms: [
        { roomNumber:"111", floor:1, guestName:"Rahul Chopra", secretCode:"RC111", status:"occupied", zone:"east" },
        { roomNumber:"112", floor:1, guestName:"Simran Kaur", secretCode:"SK222", status:"occupied", zone:"west" },
        { roomNumber:"113", floor:1, guestName:"", secretCode:"", status:"vacant", zone:"east" },
        { roomNumber:"211", floor:2, guestName:"Akash Patel", secretCode:"AP333", status:"occupied", zone:"east" },
        { roomNumber:"212", floor:2, guestName:"Rhea Malhotra", secretCode:"RM444", status:"occupied", zone:"west" },
        { roomNumber:"311", floor:3, guestName:"Ishaan Bahl", secretCode:"IB555", status:"occupied", zone:"east" },
        { roomNumber:"312", floor:3, guestName:"Kavya Joshi", secretCode:"KJ666", status:"occupied", zone:"west" },
        { roomNumber:"411", floor:4, guestName:"Aryan Sethi", secretCode:"AS777", status:"occupied", zone:"east" },
      ]
    },
    {
      id: "h3",
      name: "ITC Maurya",
      city: "New Delhi", country: "India",
      type: "business",
      floors: 5,
      emergencyContacts: { fire: "101", police: "100", ambulance: "108", frontDesk: "0" },
      mapLayout: {
        zones: ["Executive Lobby","Business Wing","Leisure Wing","Conference Level","Exit Alpha","Exit Beta"],
        exits: ["Exit Alpha (Main)","Exit Beta (Rear)","Service Exit"],
        assemblyPoint: "Car Park Level B1, Bay 10"
      },
      rooms: [
        { roomNumber:"121", floor:1, guestName:"Rajeev Menon", secretCode:"RM121", status:"occupied", zone:"east" },
        { roomNumber:"122", floor:1, guestName:"Amrita Saxena", secretCode:"AS122", status:"occupied", zone:"west" },
        { roomNumber:"221", floor:2, guestName:"Farhan Qureshi", secretCode:"FQ221", status:"occupied", zone:"east" },
        { roomNumber:"222", floor:2, guestName:"Tanvi Shah", secretCode:"TS222", status:"occupied", zone:"west" },
        { roomNumber:"321", floor:3, guestName:"Nikhil Rao", secretCode:"NR321", status:"occupied", zone:"east" },
        { roomNumber:"421", floor:4, guestName:"Divya Menon", secretCode:"DM421", status:"occupied", zone:"west" },
        { roomNumber:"521", floor:5, guestName:"Harsh Vardhan", secretCode:"HV521", status:"occupied", zone:"east" },
      ]
    },
    {
      id: "h4",
      name: "The Leela Palace",
      city: "Bengaluru", country: "India",
      type: "luxury",
      floors: 5,
      emergencyContacts: { fire: "101", police: "100", ambulance: "108", frontDesk: "0" },
      mapLayout: {
        zones: ["Grand Foyer","Heritage Wing","Modern Wing","Garden Wing","Exit North","Exit South"],
        exits: ["Exit North","Exit South","Emergency Stairs"],
        assemblyPoint: "Leela Gardens, East Lawn"
      },
      rooms: [
        { roomNumber:"131", floor:1, guestName:"Gautam Reddy", secretCode:"GR131", status:"occupied", zone:"east" },
        { roomNumber:"132", floor:1, guestName:"Lakshmi Iyer", secretCode:"LI132", status:"occupied", zone:"west" },
        { roomNumber:"231", floor:2, guestName:"Suraj Bhatt", secretCode:"SB231", status:"occupied", zone:"east" },
        { roomNumber:"232", floor:2, guestName:"Manya Kapoor", secretCode:"MK232", status:"occupied", zone:"west" },
        { roomNumber:"331", floor:3, guestName:"Rohit Nanda", secretCode:"RN331", status:"occupied", zone:"east" },
        { roomNumber:"431", floor:4, guestName:"Preeti Walia", secretCode:"PW431", status:"occupied", zone:"west" },
        { roomNumber:"531", floor:5, guestName:"Varun Ahuja", secretCode:"VA531", status:"occupied", zone:"east" },
      ]
    },
    {
      id: "h5",
      name: "Hyatt Regency",
      city: "Mumbai", country: "India",
      type: "business",
      floors: 6,
      emergencyContacts: { fire: "101", police: "100", ambulance: "108", frontDesk: "0" },
      mapLayout: {
        zones: ["Atrium Lobby","Tower A","Tower B","Pool Deck","Exit East","Exit West"],
        exits: ["Exit East (Lobby)","Exit West (Poolside)","Fire Exit Staircase"],
        assemblyPoint: "Driveway, 30m from entrance"
      },
      rooms: [
        { roomNumber:"141", floor:1, guestName:"Ankit Verma", secretCode:"AV141", status:"occupied", zone:"east" },
        { roomNumber:"142", floor:1, guestName:"Swati Jain", secretCode:"SJ142", status:"occupied", zone:"west" },
        { roomNumber:"241", floor:2, guestName:"Sameer Sinha", secretCode:"SS241", status:"occupied", zone:"east" },
        { roomNumber:"341", floor:3, guestName:"Jaya Pillai", secretCode:"JP341", status:"occupied", zone:"west" },
        { roomNumber:"441", floor:4, guestName:"Kunal Mehra", secretCode:"KM441", status:"occupied", zone:"east" },
        { roomNumber:"541", floor:5, guestName:"Sonal Desai", secretCode:"SD541", status:"occupied", zone:"west" },
        { roomNumber:"641", floor:6, guestName:"Tarun Sharma", secretCode:"TS641", status:"occupied", zone:"east" },
      ]
    }
  ],

  staff: [
    { id:"s1", name:"Capt. Ramesh Singh", role:"security", assignedZone:"Lobby", avatar:"RS", status:"active" },
    { id:"s2", name:"Dr. Priya Nambiar", role:"medical", assignedZone:"Medical Bay", avatar:"PN", status:"active" },
    { id:"s3", name:"Neha Kulkarni", role:"manager", assignedZone:"Front Desk", avatar:"NK", status:"active" },
    { id:"s4", name:"Suresh Babu", role:"security", assignedZone:"East Wing", avatar:"SB", status:"active" },
    { id:"s5", name:"Dr. Arif Khan", role:"medical", assignedZone:"Floor 2", avatar:"AK", status:"standby" },
    { id:"s6", name:"Ritu Sharma", role:"manager", assignedZone:"Conference", avatar:"RS2", status:"active" },
  ],

  scenarios: [
    {
      id: "sc1",
      name: "Fire in Room 203",
      type: "fire",
      floor: 2,
      roomNumber: "203",
      zone: "west",
      severity: "critical",
      description: "Smoke detected in Room 203, West Wing, Floor 2. Fire spreading to corridor.",
      recommendedAction: "Evacuate floors 2–4 via East stairwell. Guests in rooms 201–205 use Exit A.",
      affectedZones: ["West Wing", "Corridor B"],
      evacuationRoute: ["Room → Corridor → East Stairs → Ground → Exit A → Assembly Point"]
    },
    {
      id: "sc2",
      name: "Medical Emergency in Lobby",
      type: "medical",
      floor: 1,
      roomNumber: "Lobby",
      zone: "lobby",
      severity: "high",
      description: "Guest collapsed in main lobby. Cardiac event suspected.",
      recommendedAction: "Clear the lobby. Medical officer to proceed immediately. Call 108.",
      affectedZones: ["Lobby"],
      evacuationRoute: ["Medical team → Lobby → Guest → Stabilize → Ambulance Bay"]
    },
    {
      id: "sc3",
      name: "Earthquake — Floor 2",
      type: "earthquake",
      floor: 2,
      roomNumber: "All",
      zone: "all",
      severity: "critical",
      description: "Seismic activity detected. Magnitude 5.2. Structural assessment required.",
      recommendedAction: "All guests drop and take cover. Avoid elevators. Use stairs only after shaking stops.",
      affectedZones: ["All Floors"],
      evacuationRoute: ["Drop → Cover → Hold → Wait → Stairs → Assembly Point"]
    },
    {
      id: "sc4",
      name: "Suspicious Person — Exit B",
      type: "suspicious",
      floor: 1,
      roomNumber: "Exit B",
      zone: "west",
      severity: "medium",
      description: "Unidentified individual loitering near Exit B. Suspicious behavior reported.",
      recommendedAction: "Lock down Exit B. Security to respond. Guests avoid West Wing.",
      affectedZones: ["West Wing", "Exit B"],
      evacuationRoute: ["Avoid West Wing → Stay in Room → Use East Corridor if needed"]
    },
    {
      id: "sc5",
      name: "Fire in Kitchen",
      type: "fire",
      floor: 1,
      roomNumber: "Kitchen",
      zone: "lobby",
      severity: "high",
      description: "Grease fire in main kitchen. Smoke spreading to dining area.",
      recommendedAction: "Evacuate dining area. Activate suppression system. Alert all floor 1 guests.",
      affectedZones: ["Kitchen", "Dining Area", "Lobby"],
      evacuationRoute: ["Dining → Lobby → Exit A → Assembly Point"]
    }
  ],

  translations: {
    en: {
      fire: {
        near: "Fire detected nearby. Stay in your room. Block the door gap with wet cloth. Call reception at 0.",
        far: "Fire on another floor. Proceed calmly to the nearest exit. Use stairs only. Do not use elevator.",
        general: "Fire emergency activated. Follow staff instructions. Move to assembly point."
      },
      medical: {
        general: "Medical emergency in progress. Please remain calm. Clear the area for medical staff.",
        nearby: "Medical team is on the way. Do not move the guest. Keep them comfortable."
      },
      earthquake: {
        general: "Earthquake detected. Drop to floor immediately. Take cover under a table. Hold on until shaking stops.",
        after: "Shaking has stopped. Wait for all-clear. Use stairs only. Watch for falling debris."
      },
      suspicious: {
        general: "Security alert. Return to your room immediately. Lock your door. Do not open for strangers.",
        nearby: "Suspicious activity near your zone. Stay inside. Call reception at 0 if you see anything."
      }
    },
    hi: {
      fire: {
        near: "आग आपके पास है। कमरे में रहें। गीले कपड़े से दरवाजा बंद करें।",
        far: "दूसरी मंजिल पर आग है। शांति से सीढ़ियों से बाहर जाएं।",
        general: "आग की आपात स्थिति। कर्मचारियों का पालन करें।"
      },
      medical: {
        general: "चिकित्सा आपात। शांत रहें। क्षेत्र खाली करें।",
        nearby: "चिकित्सा दल आ रहा है।"
      },
      earthquake: {
        general: "भूकंप आया है। नीचे झुकें, मेज के नीचे छुपें।",
        after: "झटके रुक गए। सीढ़ियों का उपयोग करें।"
      },
      suspicious: {
        general: "सुरक्षा चेतावनी। कमरे में जाएं। दरवाजा बंद करें।",
        nearby: "अपने क्षेत्र में संदिग्ध गतिविधि। अंदर रहें।"
      }
    },
    bn: {
      fire: {
        near: "কাছে আগুন লেগেছে। ঘরে থাকুন। ভেজা কাপড় দিয়ে দরজা বন্ধ করুন।",
        far: "অন্য তলায় আগুন। শান্তভাবে সিঁড়ি দিয়ে বের হন।",
        general: "আগুনের জরুরি অবস্থা। কর্মীদের অনুসরণ করুন।"
      },
      medical: {
        general: "চিকিৎসা জরুরি। শান্ত থাকুন। এলাকা খালি করুন।",
        nearby: "চিকিৎসা দল আসছে।"
      },
      earthquake: {
        general: "ভূমিকম্প হয়েছে। মেঝেতে শুয়ে পড়ুন। টেবিলের নিচে আশ্রয় নিন।",
        after: "কম্পন থেমেছে। সিঁড়ি ব্যবহার করুন।"
      },
      suspicious: {
        general: "নিরাপত্তা সতর্কতা। ঘরে ফিরুন। দরজা বন্ধ করুন।",
        nearby: "আপনার এলাকায় সন্দেহজনক কার্যকলাপ।"
      }
    }
  }
};

// ============================================================
// CORE ENGINE FUNCTIONS
// ============================================================

function broadcastEmergency(event, allGuests) {
  const notifications = [];
  allGuests.forEach(guest => {
    const isNear = guest.floor === event.floor || guest.zone === event.zone;
    const instruction = generateInstruction(guest, event);
    notifications.push({
      guestName: guest.guestName,
      roomNumber: guest.roomNumber,
      floor: guest.floor,
      isNear,
      alert: `🚨 EMERGENCY: ${event.type.toUpperCase()} — ${event.description}`,
      instruction: instruction.text,
      voiceCommand: instruction.voice,
      priority: isNear ? "CRITICAL" : "HIGH"
    });
  });
  return notifications;
}

function generateInstruction(guest, event) {
  const isNear = guest.floor === event.floor;
  const lang = window.currentLang || 'en';
  const t = ECHO_DATA.translations[lang];
  let text = '', voice = '';
  switch(event.type) {
    case 'fire':
      text = isNear ? t.fire.near : t.fire.far;
      voice = isNear ? "Stay in room. Block the door." : "Move to nearest exit. Use stairs only.";
      break;
    case 'medical':
      text = t.medical.general;
      voice = "Clear the area. Medical team is responding.";
      break;
    case 'earthquake':
      text = t.earthquake.general;
      voice = "Drop. Take cover. Hold on.";
      break;
    case 'suspicious':
      text = isNear ? t.suspicious.nearby : t.suspicious.general;
      voice = "Return to room. Lock door. Stay inside.";
      break;
  }
  return { text, voice, spatial: { direction: isNear ? "away" : "forward", pan: isNear ? 0 : 0.5 } };
}

function assignStaff(event) {
  return [
    { staff: ECHO_DATA.staff[0], task: `Respond to ${event.zone} — secure the area`, priority: "CRITICAL" },
    { staff: ECHO_DATA.staff[1], task: `Medical standby — Floor ${event.floor}`, priority: event.type === 'medical' ? "CRITICAL" : "HIGH" },
    { staff: ECHO_DATA.staff[2], task: "Manage lobby — control guest flow", priority: "HIGH" },
    { staff: ECHO_DATA.staff[3], task: `Evacuate ${event.zone} Wing`, priority: "HIGH" },
  ];
}

window.currentLang = 'en';
window.ECHO_DATA = ECHO_DATA;
window.broadcastEmergency = broadcastEmergency;
window.generateInstruction = generateInstruction;
window.assignStaff = assignStaff;
