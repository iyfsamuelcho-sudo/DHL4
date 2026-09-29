/* ==========================================================================
   DHL – Diaspora Hub for Leaders
   content.js — SITE CONFIGURATION + section content.
   Everything you normally change is in this file or in /data.
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. CONFIGURATION — edit these values
   -------------------------------------------------------------------------- */

/* YouTube Data API v3. Use a BROWSER key restricted to your website
   (see README section 6). Leave empty to use the manual list in
   content/videos.json. */
const YOUTUBE_API_KEY = "";
const YOUTUBE_CHANNEL_ID = "UCy-688NReUqpEgWUziM2n8A";   // DHL channel

/* Your public Facebook Page address. */
/* Share links (facebook.com/share/...) work for buttons, but the embedded
   post feed on the Media page needs the Page's real address, e.g.
   "https://www.facebook.com/YourPageName". See README section 7. */
const FACEBOOK_PAGE_URL = "https://www.facebook.com/share/1CPwX6C7Hv/";

/* AI Ministry Assistant.
   enabled:false  -> demo mode (answers come from DHL content on this site)
   enabled:true   -> questions are sent to YOUR backend at `endpoint`.
   Never put an AI provider's secret key here. See README section 13. */
const AI_CONFIG = {
  enabled: false,
  endpoint: "",                         // e.g. "https://api.your-dhl-backend.org/ai/ask"
  assistantName: "DHL AI Assistant",
  maxQuestionLength: 600
};

const CONFIG = {
  name: "DHL – Diaspora Hub for Leaders",
  shortName: "DHL",
  tagline: "From Connection to Commission",
  description: "Helping foreigners in Korea move from connection to discipleship, leadership, and mission.",
  logo: "assets/logo/dhl-logo.png",

  /* Community photo behind the top of the home page.
     Put your photo in assets/images/ with this exact name (landscape,
     about 1600 x 900 px). If the file is missing, the plain navy
     background is used. heroImagePosition keeps faces in view when the
     photo is cropped: "center", "top", "bottom", or e.g. "center 30%". */
  heroImage: "assets/images/community.jpg",
  heroImageAlt: "The DHL community together, making finger-heart signs",
  heroImagePosition: "center 40%",

  /* Section photos. Save your photos in assets/images/ with these names
     (landscape, about 1200 x 800 px, under 400 KB). Until a photo is
     added, a designed placeholder is shown. "alt" describes the photo for
     people using screen readers; update it to match your real photo. */
  photos: {
    contents:      { src: "assets/images/contents.jpg",      alt: "DHL members learning together", placeholder: "contents" },
    bibleJourney:  { src: "assets/images/bible-journey.jpg", alt: "A small group studying the Bible together", placeholder: "bible" },
    gospel:        { src: "assets/images/gospel-class.jpg",  alt: "A Gospel class in session", placeholder: "gospel" },
    discipleship:  { src: "assets/images/discipleship.jpg",  alt: "A mentor and a younger believer reading the Bible", placeholder: "discipleship" },
    mindEducation: { src: "assets/images/mind-education.jpg", alt: "A large audience listening to speakers at a Mind Education seminar", placeholder: "mind" },
    liveInKorea:   { src: "assets/images/live-in-korea.jpg", alt: "Traditional hanok rooftops in Seoul, with N Seoul Tower in the distance", placeholder: "korea" },
    certificates:  { src: "assets/images/certificates.jpg",  alt: "Course graduates holding their DHL certificates", placeholder: "cert" }
  },
  location: "",
  /* Bible links open on BibleGateway in this version (e.g. "NIV", "ESV" or "KJV"; Tagalog versions are available there too). */
  bibleVersion: "NIV",
  email: "",

  /* Show "Sample" badges on demo posts, events and groups.
     Set to false once all demo content is replaced. */
  showDemoLabels: true,

  youtube: { apiKey: YOUTUBE_API_KEY, channelId: YOUTUBE_CHANNEL_ID, maxResults: 12, cacheMinutes: 60 },
  facebookPageUrl: FACEBOOK_PAGE_URL,

  /* Forms, social links, email and location are edited in
     content/site-settings.json (or with Pages CMS: "Site settings"). */
  forms: {},
  social: {},

  /* News Admin (admin.html). Set endpoint to your News Admin Worker's
     address after deploying it (README section 18). No secrets here. */
  admin: { endpoint: "" },

  /* Future backend. While enabled is false, the site uses the local
     files in /data. See README section 13. */
  backend: { enabled: false, baseUrl: "" }
};

/* --------------------------------------------------------------------------
   2. THE MINISTRY JOURNEY (home page route map)
   -------------------------------------------------------------------------- */
const journeySteps = [
  { id: "reach", title: "Contact", text: "Meet people through social media and practical help.", href: "live-in-korea.html", icon: "signal" },
  { id: "connect", title: "Relationship", text: "Build real friendships and community.", href: "community.html", icon: "people" },
  { id: "gospel", title: "Gospel", text: "Understand the good news of Jesus Christ.", href: "gospel.html", icon: "cross" },
  { id: "disciple", title: "Discipleship", text: "Grow through Bible study, mentoring and fellowship.", href: "discipleship.html", icon: "book" },
  { id: "train", title: "Leadership", text: "Develop character and skills to lead others.", href: "leadership.html", icon: "cap" },
  { id: "serve", title: "Ministry", text: "Serve others in real ministry.", href: "academy.html#practicum", icon: "hands" },
  { id: "multiply", title: "Multiplication", text: "Help develop new disciples and leaders.", href: "about.html#multiplication", icon: "branch" }
];

/* --------------------------------------------------------------------------
   3. CONTENTS HUB: three main categories
   -------------------------------------------------------------------------- */
const contentCategories = [
  { id: "bible", title: "Bible Journey", href: "bible-journey.html", color: "red", icon: "cross", photo: "bibleJourney",
    tagline: "Grow in faith and become a disciple.",
    text: "Gospel Class, Discipleship Training and Mind Education: a step-by-step path from discovering the Gospel to growing as a leader." },
  { id: "korea", title: "Live in Korea", href: "live-in-korea.html", color: "teal", icon: "map", photo: "liveInKorea",
    tagline: "Learn, work, study, and live confidently in Korea.",
    text: "Korean language, visas, jobs, campus life, daily life and a Q&A corner for foreigners in Korea." },
  { id: "cert", title: "Certificate Course", href: "certificates.html", color: "mango", icon: "cap", photo: "certificates",
    tagline: "Learn structured skills and complete recognized DHL courses.",
    text: "Self-paced courses with lessons, quizzes and a DHL certificate of completion." }
];

/* Bible Journey pathway (bible-journey.html) */
const bibleJourneyPath = [
  { id: "bj-gospel", title: "Gospel", text: "Understand the message of salvation.", href: "gospel.html" },
  { id: "bj-disciple", title: "Discipleship", text: "Grow in faith, the Bible and Christian life.", href: "discipleship.html" },
  { id: "bj-mind", title: "Mind Education", text: "Develop a healthy, disciplined mind.", href: "mind-education.html" },
  { id: "bj-leader", title: "Leadership", text: "Learn to help others grow.", href: "leadership.html" },
  { id: "bj-ministry", title: "Ministry", text: "Serve in real ministry.", href: "academy.html#practicum" }
];

/* Bible Journey programs (the three big cards) */
const bibleJourneyPrograms = [
  { id: "gospel", title: "Gospel Class", href: "gospel.html", level: "Beginner", color: "red", photo: "gospel",
    text: "Learn the Gospel and understand the message of salvation." },
  { id: "discipleship", title: "Discipleship Training", href: "discipleship.html", level: "Beginner to Intermediate", color: "blue", photo: "discipleship",
    text: "Develop a deeper understanding of faith, the Bible, and Christian life." },
  { id: "mind", title: "Mind Education", href: "mind-education.html", level: "Beginner to Intermediate", color: "violet", photo: "mindEducation",
    text: "Learn principles for a healthy and disciplined mind, good relationships, and a wise perspective on life." }
];

/* --------------------------------------------------------------------------
   7. LIVE IN KOREA
   Links go to official sites. Rules change, so the site always tells
   visitors to check the official source. This is general information,
   not legal advice.
   -------------------------------------------------------------------------- */
const koreaPath = [
  { id: "k-learn", title: "Learn Korean", text: "Everyday Korean for real life.", href: "live-in-korea.html#korean" },
  { id: "k-understand", title: "Understand Korea", text: "Visas, culture and how things work.", href: "live-in-korea.html#visa" },
  { id: "k-studywork", title: "Study / Work", text: "Jobs, workplaces and campus life.", href: "live-in-korea.html#job" },
  { id: "k-relationships", title: "Build Relationships", text: "Find friends and community.", href: "community.html" },
  { id: "k-livewell", title: "Live Well in Korea", text: "Housing, health and daily life.", href: "live-in-korea.html#living" }
];

const koreaAreas = [
  { id: "korean", title: "Korean Language Class", icon: "chat", text: "Korean lessons for everyday communication and life in Korea." },
  { id: "visa", title: "Visa", icon: "book", text: "General information about visa types, procedures and requirements." },
  { id: "job", title: "Job", icon: "compass", text: "Employment resources, workplace culture and job preparation." },
  { id: "campus", title: "Campus Life", icon: "cap", text: "Resources for international students and Korean campus culture." },
  { id: "living", title: "Living in Korea", icon: "map", text: "Transportation, housing, banking, healthcare, culture and daily life." },
  { id: "qa", title: "Q&A Corner", icon: "spark", text: "Ask questions and find answers about Korea, faith, work and daily life." }
];



/* Emergency numbers shown by the AI assistant and the Live in Korea page. */
const koreaHelpNumbers = [
  { label: "Police", number: "112" },
  { label: "Fire and ambulance", number: "119" },
  { label: "Suicide prevention counseling", number: "109" },
  { label: "Immigration Contact Center (multilingual)", number: "1345" },
  { label: "Danuri multicultural helpline", number: "1577-1366" }
];

/* --------------------------------------------------------------------------
   9. PATHWAYS (drawn as metro lines on pathways.html)
   -------------------------------------------------------------------------- */
const pathways = [
  { id: "visitor", name: "New Visitor", line: "teal", who: "New to Korea or new to DHL",
    stations: [
      { id: "v1", title: "Welcome", text: "Learn what DHL is and who we serve.", href: "about.html" },
      { id: "v2", title: "Live in Korea", text: "Find practical help for language, work and daily life.", href: "live-in-korea.html" },
      { id: "v3", title: "Join Community", text: "Join our group chat or a fellowship meeting.", href: "community.html" },
      { id: "v4", title: "Meet a Mentor", text: "Get to know someone who can walk with you.", form: "mentor" }
    ] },
  { id: "seeker", name: "Gospel Seeker", line: "red", who: "Curious about Jesus and the Bible",
    stations: [
      { id: "s1", title: "Gospel Introduction", text: "Read the good news in simple words.", href: "gospel.html#intro" },
      { id: "s2", title: "Gospel Course", text: "Six short lessons you can do at your own pace.", href: "gospel.html#course" },
      { id: "s3", title: "Personal Bible Study", text: "Study a passage with a guide.", href: "gospel.html#studies" },
      { id: "s4", title: "Faith & Salvation", text: "Understand what it means to trust Christ.", href: "gospel.html#topics" }
    ] },
  { id: "disciple", name: "Growing Disciple", line: "blue", who: "A believer who wants to grow",
    stations: [
      { id: "g1", title: "Discipleship Course", text: "Walk through the seven discipleship steps.", href: "discipleship.html#path" },
      { id: "g2", title: "Small Group", text: "Join a Bible study group.", form: "bibleStudy" },
      { id: "g3", title: "Mentoring", text: "Meet regularly with a mentor.", form: "mentor" },
      { id: "g4", title: "Service", text: "Find a place to serve.", href: "leadership.html" }
    ] },
  { id: "leader", name: "Future Leader", line: "mango", who: "Ready to lead and train others",
    stations: [
      { id: "l1", title: "Leadership Training", text: "Enroll in the DHL Leadership Academy.", href: "academy.html" },
      { id: "l2", title: "Practical Ministry", text: "Lead a study, care for people, create content.", href: "academy.html#practicum" },
      { id: "l3", title: "Mentoring", text: "Be mentored and begin mentoring others.", form: "mentor" },
      { id: "l4", title: "Evaluation", text: "Review your growth with your mentor.", href: "academy.html#recognition" },
      { id: "l5", title: "Commissioning", text: "Be recognized and sent to lead.", href: "academy.html#certificates" }
    ] }
];

/* --------------------------------------------------------------------------
   13. CERTIFICATE CATEGORIES and VIDEO KEYWORDS
   -------------------------------------------------------------------------- */
const certificateCategories = ["Bible & Gospel", "Discipleship", "Mind Education", "Korean Language", "Living in Korea", "Leadership", "Ministry & Service"];

/* Words used to sort YouTube videos into Media page categories. */
const VIDEO_CATEGORY_KEYWORDS = {
  korea: ["korean", "korea", "topik", "life in korea"],
  testimony: ["testimony", "my story"],
  leadership: ["leader", "leadership", "academy", "mentor"],
  study: ["bible study", "study", "lesson", "course"],
  message: ["message", "sermon", "preaching"]
};

/* --------------------------------------------------------------------------
   EDITABLE CONTENT lives in the content/ folder (JSON files), not here:
   news posts, events, videos, Gospel topics and course, Bible studies,
   discipleship, Mind Education, leadership courses, Live in Korea guides,
   Q&A, Korean expressions, certificate courses, Academy, community groups,
   daily verses, digital ministry, AI assistant knowledge and site settings.
   Edit them with Pages CMS (README section 19) or directly on GitHub.
   js/data-loader.js reads them when a page opens.
   -------------------------------------------------------------------------- */
