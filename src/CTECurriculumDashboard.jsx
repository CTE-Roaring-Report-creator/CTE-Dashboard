import { useState, useEffect, useCallback, useRef, Component } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2, GripVertical, Search, X, ExternalLink, BookOpen, RotateCcw, Edit3, AlertTriangle, Clock, Layers, Copy, Download, Settings, Check, FileText } from "lucide-react";
import {
  initGoogleAuth,
  signIn,
  signOut,
  isSignedIn,
  loadCurriculum,
  saveCurriculum,
  loadSettings,
  saveSettings,
  loadStandards,
  saveStandards,
} from './driveStorage';

console.log("[CTE] Module loading...");

// ─── SEED DATA ──────────────────────────────────────────────────────────────

const PATHWAYS = [
  {
    id: "tech",
    name: "Intro to Technology & Digital Innovation",
    shortName: "Tech & Innovation",
    color: "#1a56c4",
    colorLight: "#eff6ff",
    colorMid: "#bfdbfe",
    courses: [
      { id: "intro-tech", name: "Intro to Technology", grades: "6/7", color: "#1a56c4", description: "Students build foundational technology literacy through digital citizenship, image editing, digital portfolios, and block-based programming with Scratch." },
      { id: "digital-innovation", name: "Digital Innovation", grades: "7/8", color: "#0d9488", description: "Students advance to HTML web development, interactive programming in Game Lab, data science, Arduino physical computing, and a Shark Tank entrepreneurship capstone." },
    ],
  },
  {
    id: "media",
    name: "Digital Media",
    shortName: "Digital Media",
    color: "#7c22d4",
    colorLight: "#faf5ff",
    colorMid: "#e9d5ff",
    courses: [
      { id: "media-a", name: "Digital Media A", grades: "7/8", description: "First-year students build the foundational vocabulary of cinematography and production — shot types, editing, scriptwriting, interviewing, music in film, and the Hero's Journey." },
      { id: "media-b", name: "Digital Media B", grades: "8/9", description: "Returning Action Crew students take on production leadership roles and tackle deeper creative challenges — advanced editing, personal narrative filmmaking, and the Film Festival capstone." },
    ],
  },
];

const DEFAULT_STANDARDS = [
  "ICT C1.0 – Systems Development Process",
  "ICT C2.0 – Systems & Software Requirements",
  "ICT C3.0 – Human-Technology Interfaces",
  "ICT C5.0 – Software Development",
  "ICT C5.1 – Logic & Data Representation",
  "ICT C5.2 – Programming Methods",
  "ICT C5.3 – Testing & Debugging",
  "ICT C7.0 – Web & Online Projects",
  "ICT C8.0 – Databases",
  "ICT C9.1 – Hardware Assembly",
  "ICT C9.2 – Hardware I/O",
  "ICT C9.3 – Input/Processing/Output",
  "ICT C9.5 – Microcontroller Programming",
  "ICT C10.0 – Intelligent Computing",
  "ICT C10.1 – AI Models",
  "ICT C10.2 – Machine Learning",
  "ICT Anchor 2.0 – Communication",
  "ICT Anchor 3.0 – Career Planning",
  "ICT Anchor 4.0 – Technology",
  "ICT Anchor 5.0 – Problem Solving",
  "ICT Anchor 8.0 – Ethics & Legal",
  "ICT Anchor 9.0 – Leadership & Teamwork",
  "ICT Anchor 11.0 – Demonstration",
  "ISTE 1.1 – Empowered Learner",
  "ISTE 1.2 – Digital Citizen",
  "ISTE 1.3 – Knowledge Constructor",
  "ISTE 1.4 – Innovative Designer",
  "ISTE 1.5 – Computational Thinker",
  "ISTE 1.6 – Creative Communicator",
  "ISTE 1.7 – Global Collaborator",
  "AME 1.0 – Careers",
  "AME 3.0 – Technical Skills",
  "AME 4.0 – Leadership",
  "AME 7.0 – Communication",
  "AME 9.0 – Technology",
  "CCSS ELA – Writing",
  "CCSS ELA – Speaking & Listening",
  "NGSS – Engineering Design",
];

const RESOURCE_TYPES = [
  { id: "slide-deck", label: "Slide Deck", icon: "📊", color: "#1a56c4" },
  { id: "handout", label: "Handout", icon: "📄", color: "#16a34a" },
  { id: "project-brief", label: "Project Brief", icon: "📋", color: "#7c22d4" },
  { id: "rubric", label: "Rubric", icon: "✅", color: "#ea580c" },
  { id: "template", label: "Template", icon: "📁", color: "#0891b2" },
  { id: "external-tool", label: "External Tool", icon: "🔗", color: "#dc2626" },
  { id: "teacher-reference", label: "Teacher Reference", icon: "📖", color: "#854d0e" },
];

const LESSON_TYPES = [
  { id: "instruction",   label: "Instruction",   color: "#1a56c4", bg: "#eef3fd" },
  { id: "classwork",     label: "Classwork",     color: "#d97706", bg: "#fefce8" },
  { id: "group-project", label: "Group Project", color: "#16a34a", bg: "#f0fdf4" },
  { id: "project",       label: "Project",       color: "#7c22d4", bg: "#f7f0fe" },
  { id: "assessment",    label: "Assessment",    color: "#c2410c", bg: "#fff4eb" },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

// ─── SEED CURRICULUM ────────────────────────────────────────────────────────

const SEED_DATA = {
  "intro-tech": {
    units: [
      {
        id: uid(), title: "Digital Citizenship & Online Identity", semester: "Fall",
        essentialQuestion: "How does your digital footprint define who you are online and in the future?",
        description: "Students explore responsible digital citizenship, online safety, and personal branding. They learn to evaluate online content critically and create a professional digital identity.",
        lessons: [
          { id: uid(), title: "Course Introduction & Expectations", type: "instruction", objective: "Recall course expectations, class procedures, and technology lab safety rules.", estimatedDays: 1, standards: ["ICT Anchor 3.0 – Career Planning","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
          { id: uid(), title: "Amazon Warehouse Virtual Tour", type: "instruction", objective: "Describe how technology is used in modern logistics and identify ICT career pathways.", estimatedDays: 2, standards: ["ICT Anchor 4.0 – Technology","ISTE 1.3 – Knowledge Constructor"], links: [], notes: "" },
          { id: uid(), title: "Syllabus & Course Overview", type: "instruction", objective: "Summarize the course pathway, grading policies, and expectations for the two-year CTE program.", estimatedDays: 1, standards: ["ICT Anchor 3.0 – Career Planning","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
          { id: uid(), title: "Google Interland – Digital Safety", type: "group-project", objective: "Apply strategies for staying safe online by navigating interactive scenarios about phishing, oversharing, and password security.", estimatedDays: 2, standards: ["ICT Anchor 8.0 – Ethics & Legal","ISTE 1.2 – Digital Citizen"], links: [], notes: "" },
          { id: uid(), title: "Fake Instagram Profile Analysis", type: "instruction", objective: "Evaluate fake social media profiles to distinguish credible from deceptive online identities.", estimatedDays: 2, standards: ["ICT Anchor 8.0 – Ethics & Legal","ISTE 1.2 – Digital Citizen"], links: [], notes: "" },
          { id: uid(), title: "Social Sleuth Investigation", type: "group-project", objective: "Analyze digital footprints to determine what personal information is publicly accessible.", estimatedDays: 2, standards: ["ICT Anchor 8.0 – Ethics & Legal","ISTE 1.2 – Digital Citizen"], links: [], notes: "" },
          { id: uid(), title: "Google Header Design", type: "project", objective: "Design a personalized Google Classroom header representing identity using basic graphic design principles.", estimatedDays: 1, standards: ["ICT Anchor 4.0 – Technology","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Digital Portfolios & Personal Branding", semester: "Fall",
        essentialQuestion: "How do you communicate your skills, identity, and goals to an authentic audience?",
        description: "Students build and maintain a digital portfolio using Canva and Google Sites to document their learning journey. They set SMART goals and learn to present their work professionally.",
        lessons: [
          { id: uid(), title: "Canva Header Design", type: "project", objective: "Create a professional-quality portfolio header using Canva, applying color theory and typography principles.", estimatedDays: 2, standards: ["ICT Anchor 4.0 – Technology","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Digital Portfolio Setup", type: "project", objective: "Construct a digital portfolio site that organizes work samples, bio, and learning reflections.", estimatedDays: 2, standards: ["ICT Anchor 4.0 – Technology","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Choose Your Own Adventure – Planning & Creation", type: "project", objective: "Design and develop an interactive choose-your-own-adventure story using hyperlinks and branching logic.", estimatedDays: 5, standards: ["ICT C1.0 – Systems Development Process","ICT C5.0 – Software Development","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Digital Portfolio Goals (SMART Goals)", type: "assessment", objective: "Formulate SMART goals for the semester and articulate them within the digital portfolio.", estimatedDays: 2, standards: ["ICT Anchor 3.0 – Career Planning","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Digital Image Editing with Photoshop", semester: "Fall",
        essentialQuestion: "How do digital tools empower us to construct and communicate meaning through images?",
        description: "Students develop proficiency in Adobe Photoshop, progressing from basic layer manipulation to advanced compositing techniques.",
        lessons: [
          { id: uid(), title: "Photoshop Introduction & Interface", type: "instruction", objective: "Identify the key tools, panels, and workspace elements of the Photoshop interface.", estimatedDays: 1, standards: ["ICT Anchor 4.0 – Technology","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
          { id: uid(), title: "Layers Assignment", type: "group-project", objective: "Demonstrate how layers function by composing a multi-layer image with proper ordering and opacity.", estimatedDays: 3, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Lasso Tool Tracing & Assignment", type: "group-project", objective: "Apply selection tools to isolate and manipulate image elements with precision.", estimatedDays: 3, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Digital Collage", type: "project", objective: "Create a digital collage by combining multiple image sources, demonstrating layer management and composition.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Lasso Leaves Project", type: "project", objective: "Apply lasso and selection tools to create a nature-themed composition with extracted elements.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Digital Filters & Effects", type: "group-project", objective: "Experiment with Photoshop filters to transform images and explain how filters modify pixel data.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Combining Images – Meme Creation", type: "project", objective: "Combine text and images to create original memes, applying typography and composition skills.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Digital Citizenship Meme", type: "project", objective: "Design a meme that communicates a digital citizenship concept.", estimatedDays: 2, standards: ["ICT Anchor 8.0 – Ethics & Legal","ISTE 1.2 – Digital Citizen"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Animated GIFs & Digital Media", semester: "Fall",
        essentialQuestion: "How does motion and timing change how we communicate a message?",
        description: "Students create animated GIFs using Photoshop's timeline feature, exploring motion, looping, and digital media concepts.",
        lessons: [
          { id: uid(), title: "Animated GIF Introduction", type: "instruction", objective: "Explain how frame-based animation creates the illusion of motion in digital media.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "GIF Creation Project", type: "project", objective: "Create an original animated GIF using Photoshop timeline, applying principles of motion and looping.", estimatedDays: 3, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Game Design Project (Semester 1 Capstone)", semester: "Fall",
        essentialQuestion: "What makes a game engaging, fair, and worth playing?",
        description: "Students apply the full design process to create an original board or digital game, culminating in a class showcase.",
        lessons: [
          { id: uid(), title: "Game Design Introduction & Process", type: "instruction", objective: "Identify the stages of the game design process and understand what makes a game engaging.", estimatedDays: 2, standards: ["ICT C1.0 – Systems Development Process","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Game Design Document Creation", type: "project", objective: "Develop a comprehensive game design document outlining rules, mechanics, and player experience.", estimatedDays: 3, standards: ["ICT C2.0 – Systems & Software Requirements","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Game Prototype Development", type: "project", objective: "Build a playable prototype of the designed game and conduct initial playtesting.", estimatedDays: 5, standards: ["ICT C1.0 – Systems Development Process","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Playtest & Revise", type: "group-project", objective: "Conduct structured playtesting sessions, collect feedback, and implement design revisions.", estimatedDays: 3, standards: ["ICT C1.0 – Systems Development Process","ICT C5.3 – Testing & Debugging","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Game Showcase & Reflection", type: "assessment", objective: "Present the completed game to peers, articulate design decisions, and reflect on the design process.", estimatedDays: 2, standards: ["ICT Anchor 11.0 – Demonstration","ICT Anchor 9.0 – Leadership & Teamwork"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Introduction to Programming with Scratch", semester: "Spring",
        essentialQuestion: "How can sequencing and logic allow us to create something from nothing?",
        description: "Students learn foundational programming concepts through Scratch: sequences, loops, events, and basic animation.",
        lessons: [
          { id: uid(), title: "Scratch Interface & First Program", type: "instruction", objective: "Navigate the Scratch interface and create a simple program using sequences and events.", estimatedDays: 2, standards: ["ICT C5.0 – Software Development","ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Loops & Repetition", type: "group-project", objective: "Implement loops in Scratch programs to create repetitive patterns and efficient code.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Events & Interactivity", type: "group-project", objective: "Use event-based programming to create interactive Scratch projects that respond to user input.", estimatedDays: 3, standards: ["ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Scratch Animation Project", type: "project", objective: "Create an animated story in Scratch demonstrating sequences, loops, and event handling.", estimatedDays: 5, standards: ["ICT C5.0 – Software Development","ISTE 1.6 – Creative Communicator","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Animation & Storytelling with Scratch", semester: "Spring",
        essentialQuestion: "How do we use code to tell a story that moves an audience?",
        description: "Students combine programming skills with narrative thinking to create animated stories in Scratch, developing both technical and creative abilities.",
        lessons: [
          { id: uid(), title: "Sprite Costumes & Animation", type: "instruction", objective: "Use sprite costumes and timing to create smooth character animations in Scratch.", estimatedDays: 2, standards: ["ICT C5.2 – Programming Methods","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Scene Design & Backgrounds", type: "group-project", objective: "Design multi-scene Scratch projects with background transitions and environment changes.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Animated Story Project", type: "project", objective: "Develop a multi-scene animated story in Scratch with a clear beginning, middle, and end.", estimatedDays: 8, standards: ["ICT C5.0 – Software Development","ICT C1.0 – Systems Development Process","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Conditionals & Logic in Scratch", semester: "Spring",
        essentialQuestion: "How does a computer make decisions, and how do those decisions shape what a program can do?",
        description: "Students explore conditional logic and boolean expressions, applying them to create programs that make decisions and respond to conditions.",
        lessons: [
          { id: uid(), title: "If/Then & Boolean Logic", type: "instruction", objective: "Explain how conditional statements allow programs to make decisions based on conditions.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Keyboard & Mouse Conditionals", type: "group-project", objective: "Implement keyboard and mouse input handlers using conditional logic in Scratch.", estimatedDays: 3, standards: ["ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Conditional Mini-Project", type: "project", objective: "Create an interactive Scratch project that uses conditionals to create meaningful decision points.", estimatedDays: 4, standards: ["ICT C5.0 – Software Development","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Advanced Scratch: Variables & Game Design", semester: "Spring",
        essentialQuestion: "How do variables transform a program from static to dynamic?",
        description: "Students learn variables, score tracking, and advanced game mechanics, culminating in original game designs.",
        lessons: [
          { id: uid(), title: "Variables Introduction", type: "instruction", objective: "Define variables and demonstrate how they store and change data within a program.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Score & Lives Systems", type: "group-project", objective: "Implement score and lives tracking systems using variables in a Scratch game.", estimatedDays: 3, standards: ["ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Advanced Game Development", type: "project", objective: "Design and develop a complete arcade-style game in Scratch with variables, conditionals, and collision detection.", estimatedDays: 8, standards: ["ICT C5.0 – Software Development","ICT C1.0 – Systems Development Process","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Semester 2 Capstone & Portfolio Showcase", semester: "Spring",
        essentialQuestion: "What have you learned, created, and become this year?",
        description: "Students compile their best work, reflect on growth across the year, and showcase their digital portfolio to an authentic audience.",
        lessons: [
          { id: uid(), title: "Portfolio Curation & Selection", type: "project", objective: "Curate a digital portfolio by selecting and organizing best work samples with written reflections.", estimatedDays: 3, standards: ["ICT Anchor 11.0 – Demonstration","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
          { id: uid(), title: "Portfolio Presentation Preparation", type: "project", objective: "Prepare a structured presentation of the digital portfolio for an authentic audience.", estimatedDays: 3, standards: ["ICT Anchor 2.0 – Communication","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Portfolio Showcase Event", type: "assessment", objective: "Present the completed digital portfolio to peers, family, and community members, articulating learning growth.", estimatedDays: 2, standards: ["ICT Anchor 11.0 – Demonstration","ICT Anchor 9.0 – Leadership & Teamwork"], links: [], notes: "" },
          { id: uid(), title: "Year-End Reflection", type: "assessment", objective: "Write a comprehensive reflection on learning growth, challenges overcome, and goals for next year.", estimatedDays: 2, standards: ["ICT Anchor 3.0 – Career Planning","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
        ]
      },
    ]
  },
  "digital-innovation": {
    units: [
      {
        id: uid(), title: "Problem Solving & Web Development (HTML)", semester: "Fall",
        essentialQuestion: "How does the structure of a webpage reflect the logic of how computers communicate?",
        description: "Students transition from Scratch to text-based coding, learning HTML to build structured web pages. They connect prior knowledge of algorithms to web development.",
        lessons: [
          { id: uid(), title: "Problem Solving Review & Computational Thinking", type: "instruction", objective: "Apply decomposition, pattern recognition, abstraction, and algorithmic thinking to solve problems.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "HTML Introduction & Structure", type: "instruction", objective: "Explain the structure of an HTML document using tags, elements, and the DOM hierarchy.", estimatedDays: 3, standards: ["ICT C7.0 – Web & Online Projects","ICT C3.0 – Human-Technology Interfaces","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "HTML Content Elements", type: "group-project", objective: "Create web pages using headings, paragraphs, lists, links, and images.", estimatedDays: 4, standards: ["ICT C7.0 – Web & Online Projects","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "HTML Web Page Project", type: "project", objective: "Design and build a multi-page website on a topic of choice using semantic HTML.", estimatedDays: 5, standards: ["ICT C7.0 – Web & Online Projects","ICT C1.0 – Systems Development Process","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Interactive Programming with Game Lab (Part 1)", semester: "Fall",
        essentialQuestion: "How do coordinates, shapes, and variables create the building blocks of interactive programs?",
        description: "Students transition from HTML to interactive programming in Code.org's Game Lab, learning drawing, variables, random numbers, sprites, and text.",
        lessons: [
          { id: uid(), title: "Plotting Shapes & Drawing in Game Lab", type: "group-project", objective: "Use coordinates and shape functions to draw geometric compositions on the Game Lab canvas.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Shapes and Parameters", type: "instruction", objective: "Explain how parameters modify function behavior and adjust shape properties through experimentation.", estimatedDays: 1, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Variables & Random Numbers", type: "group-project", objective: "Implement variables and random number generation to create dynamic, non-repetitive program outputs.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Mini-Project: Robot Faces", type: "project", objective: "Create a program that generates unique robot face compositions using variables and randomization.", estimatedDays: 1, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Sprites & Sprite Properties", type: "group-project", objective: "Create and manipulate sprite objects, modifying properties like position, size, rotation, and visibility.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Text & Mini-Project: Captioned Scenes", type: "project", objective: "Integrate text display with sprite compositions to create captioned digital scenes that tell a story.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Draw Loop & Sprite Movement", type: "group-project", objective: "Explain the draw loop concept and implement continuous sprite movement using velocity and position updates.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Interactive Programming with Game Lab (Part 2)", semester: "Fall",
        essentialQuestion: "How do conditionals and user input transform a program into a truly interactive experience?",
        description: "Students advance to conditionals, user input handling, collision detection, and complex sprite movement, building toward full interactive applications.",
        lessons: [
          { id: uid(), title: "Mini-Project: Animation", type: "project", objective: "Create a sprite-based animation using the draw loop, costume changes, and timed sequences.", estimatedDays: 1, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "Conditionals & Keyboard Input", type: "group-project", objective: "Implement conditional statements that respond to keyboard input to control sprite behavior.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Mouse Input & Interactive Card", type: "project", objective: "Design an interactive greeting card that responds to both mouse and keyboard events using conditional logic.", estimatedDays: 3, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Velocity & Collision Detection", type: "group-project", objective: "Implement velocity-based movement and collision detection between sprites to create realistic interactions.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Mini-Project: Side Scroller", type: "project", objective: "Build a side-scrolling game incorporating sprite movement, collision detection, and scoring.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Complex Sprite Movement & Collisions", type: "group-project", objective: "Implement advanced movement patterns including acceleration, deceleration, and multi-object collision handling.", estimatedDays: 1, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Mini-Project: Flyer Game", type: "project", objective: "Design and develop a top-down flyer game integrating all Game Lab skills: sprites, conditionals, collisions, and scoring.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C5.2 – Programming Methods","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Game Design Project (Semester 1 Capstone)", semester: "Fall",
        essentialQuestion: "What separates a game that's technically functional from one that's genuinely fun?",
        description: "Students apply the full game design process to plan, develop, playtest, refine, and present an original game in Game Lab.",
        lessons: [
          { id: uid(), title: "Functions Introduction", type: "instruction", objective: "Define functions and explain how they promote code organization and reusability.", estimatedDays: 1, standards: ["ICT C5.0 – Software Development","ICT C5.2 – Programming Methods","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Game Design Process Introduction", type: "instruction", objective: "Describe the stages of the game design process and develop a comprehensive game design document.", estimatedDays: 2, standards: ["ICT C1.0 – Systems Development Process","ICT C2.0 – Systems & Software Requirements","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Project Game Design – Development Sprint", type: "project", objective: "Independently develop a complete game in Game Lab applying functions, conditionals, collisions, and variables through iterative development.", estimatedDays: 8, standards: ["ICT C5.0 – Software Development","ICT C5.2 – Programming Methods","ICT C5.3 – Testing & Debugging","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Peer Review & Revision", type: "assessment", objective: "Conduct structured peer reviews using established criteria and implement revisions based on feedback.", estimatedDays: 2, standards: ["ICT C1.0 – Systems Development Process","ICT Anchor 9.0 – Leadership & Teamwork","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Game Share Lab & Voting", type: "assessment", objective: "Present completed games, articulate design decisions, and evaluate peer games using criteria-based assessment.", estimatedDays: 2, standards: ["ICT Anchor 11.0 – Demonstration","ICT Anchor 9.0 – Leadership & Teamwork"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Data Representation & Information Systems", semester: "Spring",
        essentialQuestion: "How does a computer see the world — and what gets lost in translation?",
        description: "Students explore how computers represent and process information through binary, ASCII, images, and numbers.",
        lessons: [
          { id: uid(), title: "Semester Reflection & Representation Matters", type: "instruction", objective: "Evaluate Semester 1 growth and explain why digital representation systems matter in computing.", estimatedDays: 2, standards: ["ICT Anchor 3.0 – Career Planning","ISTE 1.1 – Empowered Learner"], links: [], notes: "" },
          { id: uid(), title: "Patterns and Representation", type: "instruction", objective: "Identify patterns in data and explain how patterns enable efficient representation of information.", estimatedDays: 1, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "ASCII and Binary Representation", type: "group-project", objective: "Convert between binary, decimal, and ASCII to demonstrate how computers encode text and numbers.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Representing Images", type: "group-project", objective: "Explain how digital images are represented using pixels and binary data, and create a pixel art composition.", estimatedDays: 1, standards: ["ICT C5.1 – Logic & Data Representation","ICT C3.0 – Human-Technology Interfaces","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Representing Numbers & Combining Representations", type: "instruction", objective: "Analyze how different data types are combined in computing systems and explain overflow/precision limitations.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Keeping Data Secret", type: "instruction", objective: "Describe basic encryption concepts and demonstrate a simple cipher to encode and decode messages.", estimatedDays: 1, standards: ["ICT Anchor 8.0 – Ethics & Legal","ISTE 1.2 – Digital Citizen"], links: [], notes: "" },
          { id: uid(), title: "Create a Representation", type: "project", objective: "Design an original representation system for a specific type of information and justify design choices.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Problem Solving with Data & Structuring Data", type: "group-project", objective: "Organize raw data into structured formats and use data to solve a defined problem.", estimatedDays: 2, standards: ["ICT C5.1 – Logic & Data Representation","ICT C8.0 – Databases","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Interpreting Data", type: "assessment", objective: "Interpret data visualizations to draw evidence-based conclusions and identify potential biases.", estimatedDays: 1, standards: ["ICT Anchor 5.0 – Problem Solving","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Data, AI & Machine Learning", semester: "Spring",
        essentialQuestion: "When a machine learns from data, who is responsible for what it decides?",
        description: "Students explore how data drives decisions, learn about automation and machine learning concepts, and complete a recommendation system project.",
        lessons: [
          { id: uid(), title: "Making Decisions with Data", type: "instruction", objective: "Analyze a dataset to make an evidence-based decision and explain their reasoning.", estimatedDays: 1, standards: ["ICT C10.0 – Intelligent Computing","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Automating Data Decisions", type: "instruction", objective: "Explain how algorithms automate decision-making processes and identify advantages and limitations.", estimatedDays: 1, standards: ["ICT C10.0 – Intelligent Computing","ICT C10.1 – AI Models","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Problem Solving with Big Data", type: "instruction", objective: "Describe how large datasets are used to identify trends and solve complex problems across industries.", estimatedDays: 1, standards: ["ICT C10.0 – Intelligent Computing","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Data and Machine Learning", type: "instruction", objective: "Explain how machine learning systems use training data to make predictions and classifications.", estimatedDays: 1, standards: ["ICT C10.0 – Intelligent Computing","ICT C10.1 – AI Models","ICT C10.2 – Machine Learning","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Make a Recommendation Project", type: "project", objective: "Design and develop a data-driven recommendation system that collects, analyzes, and presents personalized suggestions.", estimatedDays: 6, standards: ["ICT C10.0 – Intelligent Computing","ICT C10.2 – Machine Learning","ICT C5.1 – Logic & Data Representation","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "AI & Machine Learning – Ethical Considerations", type: "assessment", objective: "Evaluate the ethical implications of AI and machine learning, including bias, privacy, and societal impact.", estimatedDays: 1, standards: ["ICT C10.0 – Intelligent Computing","ICT Anchor 8.0 – Ethics & Legal","ISTE 1.2 – Digital Citizen"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Electricity, Circuits & Physical Computing", semester: "Spring",
        essentialQuestion: "What happens when code meets the physical world — and a light actually turns on?",
        description: "Students transition to physical computing, learning electrical fundamentals, circuit design, Ohm's Law, and Arduino programming.",
        lessons: [
          { id: uid(), title: "Introduction to Electricity & What is a Circuit?", type: "instruction", objective: "Define voltage, current, and resistance and explain how a closed circuit allows electricity to flow.", estimatedDays: 2, standards: ["ICT C9.1 – Hardware Assembly","ICT C9.3 – Input/Processing/Output","ISTE 1.3 – Knowledge Constructor"], links: [], notes: "" },
          { id: uid(), title: "Ohm's Law & PhET Simulation", type: "group-project", objective: "Apply Ohm's Law (V=IR) to calculate voltage, current, and resistance using the PhET circuit simulator.", estimatedDays: 2, standards: ["ICT C9.1 – Hardware Assembly","ICT C9.3 – Input/Processing/Output","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Circuit Research & Circuit Lab", type: "group-project", objective: "Research circuit types (series/parallel) and construct physical circuits to verify theoretical predictions.", estimatedDays: 4, standards: ["ICT C9.1 – Hardware Assembly","ICT C9.2 – Hardware I/O","ISTE 1.3 – Knowledge Constructor"], links: [], notes: "" },
          { id: uid(), title: "Voltage Relationships & Ohm's Law Quiz", type: "assessment", objective: "Analyze voltage relationships in series and parallel circuits and demonstrate mastery of Ohm's Law.", estimatedDays: 2, standards: ["ICT C9.1 – Hardware Assembly","ICT C9.3 – Input/Processing/Output","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Arduino Research & LED/Breadboard Introduction", type: "instruction", objective: "Research Arduino microcontrollers, identify hardware components, and construct basic LED circuits on a breadboard.", estimatedDays: 5, standards: ["ICT C9.1 – Hardware Assembly","ICT C9.2 – Hardware I/O","ICT C9.5 – Microcontroller Programming","ISTE 1.3 – Knowledge Constructor"], links: [], notes: "" },
          { id: uid(), title: "Paper Circuit Project", type: "project", objective: "Design and build a paper circuit that demonstrates understanding of circuit fundamentals.", estimatedDays: 1, standards: ["ICT C9.1 – Hardware Assembly","ICT C9.2 – Hardware I/O","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Intro to Arduino Programming & Blink Projects", type: "group-project", objective: "Write Arduino code to control LED blinking patterns, applying programming concepts to physical hardware.", estimatedDays: 3, standards: ["ICT C9.5 – Microcontroller Programming","ICT C5.0 – Software Development","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Micro Servo & Big Servo", type: "group-project", objective: "Program servo motors to specific angles using Arduino, demonstrating control of mechanical output through code.", estimatedDays: 2, standards: ["ICT C9.5 – Microcontroller Programming","ICT C9.3 – Input/Processing/Output","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Photoresistor & Arduino Quiz", type: "assessment", objective: "Implement a photoresistor sensor to create a light-reactive system and demonstrate understanding of sensor input.", estimatedDays: 2, standards: ["ICT C9.5 – Microcontroller Programming","ICT C9.3 – Input/Processing/Output","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "TinkerCAD Circuit Simulations (RGB LED, Light Show)", type: "group-project", objective: "Design and simulate advanced Arduino circuits in TinkerCAD, programming RGB LEDs and multi-component systems.", estimatedDays: 4, standards: ["ICT C9.5 – Microcontroller Programming","ICT C5.1 – Logic & Data Representation","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "3D Design & Shark Tank Capstone", semester: "Spring",
        essentialQuestion: "How do you turn a problem you care about into a product someone would actually buy?",
        description: "Students learn 3D modeling in TinkerCAD and apply it to an entrepreneurial Shark Tank project — designing products, calculating costs, surveying markets, and pitching to judges.",
        lessons: [
          { id: uid(), title: "TinkerCAD 3D Design Introduction", type: "instruction", objective: "Navigate the TinkerCAD 3D workspace and create basic 3D models using primitive shapes and grouping.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Pobble 3D Design Project", type: "project", objective: "Design a 3D character model applying advanced TinkerCAD techniques including alignment, holes, and custom shapes.", estimatedDays: 2, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Shark Tank Introduction & Planning", type: "instruction", objective: "Identify a problem worth solving and develop an initial product concept using the design thinking process.", estimatedDays: 2, standards: ["ICT C2.0 – Systems & Software Requirements","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Target Market Research", type: "group-project", objective: "Research and define target market using demographic data and consumer analysis techniques.", estimatedDays: 2, standards: ["ICT C2.0 – Systems & Software Requirements","ISTE 1.3 – Knowledge Constructor"], links: [], notes: "" },
          { id: uid(), title: "Benefits, Features & Production Costs", type: "instruction", objective: "Differentiate product features from benefits and calculate production costs to determine pricing strategy.", estimatedDays: 2, standards: ["ICT Anchor 3.0 – Career Planning","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Market Survey", type: "group-project", objective: "Design and conduct a market survey, then analyze results to validate product-market fit.", estimatedDays: 1, standards: ["ICT C2.0 – Systems & Software Requirements","ISTE 1.5 – Computational Thinker"], links: [], notes: "" },
          { id: uid(), title: "Presentation Slides & Website Creation", type: "project", objective: "Create a professional pitch deck and product website that communicate value proposition to potential investors.", estimatedDays: 2, standards: ["ICT C7.0 – Web & Online Projects","ICT Anchor 2.0 – Communication","ISTE 1.6 – Creative Communicator"], links: [], notes: "" },
          { id: uid(), title: "3D Product Prototype Design", type: "project", objective: "Design a 3D-printable product prototype in TinkerCAD that demonstrates the product concept.", estimatedDays: 1, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Shark Tank Prototypes & Refinement", type: "project", objective: "Develop, test, and refine physical and digital prototypes through iterative design cycles.", estimatedDays: 4, standards: ["ICT C1.0 – Systems Development Process","ICT C5.3 – Testing & Debugging","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
          { id: uid(), title: "Shark Tank Presentations", type: "assessment", objective: "Deliver a persuasive product pitch to a panel of judges, defending design, market research, and business model.", estimatedDays: 3, standards: ["ICT Anchor 11.0 – Demonstration","ICT Anchor 2.0 – Communication","ISTE 1.7 – Global Collaborator"], links: [], notes: "" },
          { id: uid(), title: "TinkerCAD Dreamhouse Project", type: "project", objective: "Design a detailed 3D architectural model in TinkerCAD applying advanced modeling techniques and spatial reasoning.", estimatedDays: 5, standards: ["ICT C3.0 – Human-Technology Interfaces","ISTE 1.4 – Innovative Designer"], links: [], notes: "" },
        ]
      },
    ]
  },
  "media-a": {
    units: [
      {
        id: uid(), title: "Visual Language", semester: "Fall",
        essentialQuestion: "How does the choice of shot type, angle, and camera movement shape what an audience feels?",
        description: "Core focus: Shot types, camera angles, camera movement. Students build the foundational vocabulary of cinematography while immediately applying it in production.",
        lessons: [
          { id: uid(), title: "Orientation, WeVideo & Premiere Setup, Syllabus", type: "instruction", objective: "Set up production tools, understand course expectations, and form project groups.", estimatedDays: 2, standards: ["AME 1.0 – Careers","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "Shot Types (ELS, LS, MS, CU, ECU)", type: "instruction", objective: "Identify and demonstrate the five primary shot types and explain how each affects viewer emotion.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "Use final scene from The Good, the Bad & the Ugly. Three-way gunfight shows ELS→ECU progression perfectly." },
          { id: uid(), title: "Camera Angles (Eye Level, Low, High, Dutch Tilt)", type: "instruction", objective: "Explain how camera angle conveys power, vulnerability, and tension in film.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "Stranger Things (eye level), Avengers (low/high), Iron Man (Dutch tilt), Lion King (low angle)." },
          { id: uid(), title: "Camera Movements (Static, Pan, Tilt, Dolly, Truck)", type: "instruction", objective: "Demonstrate five camera movements and explain the emotional effect of each.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "Moonrise Kingdom for truck, Inception for Dutch tilt. Connect to NxNW crop duster for dolly examples." },
          { id: uid(), title: "Review & Assessment – Shots/Angles/Movements Quiz", type: "assessment", objective: "Demonstrate mastery of shot types, angles, and camera movements through written and visual assessment.", estimatedDays: 1, standards: ["AME 3.0 – Technical Skills"], links: [], notes: "" },
          { id: uid(), title: "Intro Video Project", type: "project", objective: "Create a short personal introduction video using WeVideo, practicing basic editing techniques.", estimatedDays: 3, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "Storytelling Through Shots Project (Group)", type: "project", objective: "Create a 1–2 minute short film using all five shot types to tell a story without dialogue.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership"], links: [], notes: "Shot list worksheet required. Reflection required. No dialogue required." },
        ]
      },
      {
        id: uid(), title: "Production Fundamentals", semester: "Fall",
        essentialQuestion: "How does every production decision — from script to final cut — serve the story's purpose?",
        description: "Core focus: Scriptwriting, storyboarding, interviewing, editing, audio, lighting. Students apply visual language skills to structured production work while deepening their technical toolkit.",
        lessons: [
          { id: uid(), title: "Editing Techniques – Cuts, Transitions, Pacing", type: "instruction", objective: "Explain how different editing techniques (cuts, transitions, pacing) shape viewer emotion and narrative flow.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "Needs slides created. Priority to create. Use NxNW crop duster scene as primary example." },
          { id: uid(), title: "B-Roll Competition", type: "project", objective: "Capture 10+ B-roll shots on campus demonstrating variety of angles and movements, then edit into a 1-minute video.", estimatedDays: 4, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "No faces rule. Variety of angles/movements required. Class vote for best videos." },
          { id: uid(), title: "Scriptwriting & Teleprompter Writing", type: "instruction", objective: "Write broadcast-ready scripts using teleprompter formatting and conversational language.", estimatedDays: 2, standards: ["AME 7.0 – Communication","CCSS ELA – Writing"], links: [], notes: "" },
          { id: uid(), title: "Audio & Sound Design", type: "instruction", objective: "Apply proper microphone technique, audio level standards, and ambient sound principles to video production.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "Storyboarding", type: "instruction", objective: "Create a professional storyboard using panel notation and shot descriptions for pre-production planning.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Rule of Thirds & Interview Framing", type: "instruction", objective: "Apply the rule of thirds to on-camera interview framing and explain why long-sided interviews are standard.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills"], links: [], notes: "" },
          { id: uid(), title: "Interviewing Techniques", type: "instruction", objective: "Demonstrate open-ended questioning, active listening, and follow-up techniques in a video interview context.", estimatedDays: 2, standards: ["AME 7.0 – Communication","CCSS ELA – Speaking & Listening"], links: [], notes: "" },
          { id: uid(), title: "Peer & Teacher Interview Projects", type: "project", objective: "Produce professional 2–3 minute interviews with both on-camera and long-sided framing, including B-roll.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "6–7 questions required. 1 follow-up required. B-roll required. Transitions required." },
          { id: uid(), title: "Lighting Basics – Three-Point Lighting", type: "instruction", objective: "Explain and set up three-point lighting, comparing natural and artificial light for mood and shadow.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "Genre Study – Introduction to Genre Conventions", type: "instruction", objective: "Identify genre conventions in film and explain how genre sets audience expectations.", estimatedDays: 2, standards: ["AME 7.0 – Communication"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Music, Narrative & Story", semester: "Fall",
        essentialQuestion: "How does a composer's score become as powerful as the images on screen?",
        description: "Core focus: Music in film, Hero's Journey structure, narrative planning. Students move from visual technique to full storytelling, culminating in two major projects before winter break.",
        lessons: [
          { id: uid(), title: "Music in Film – Score vs. Source Music", type: "instruction", objective: "Distinguish between score and source music and analyze how Danny Elfman's score in Nightmare Before Christmas creates emotional tone.", estimatedDays: 2, standards: ["AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Hero's Journey – 12 Stages", type: "instruction", objective: "Identify all 12 stages of the Hero's Journey using Star Wars, How to Train Your Dragon, and Bluey examples.", estimatedDays: 3, standards: ["AME 7.0 – Communication","CCSS ELA – Speaking & Listening"], links: [], notes: "" },
          { id: uid(), title: "Music Driven Story Project", type: "project", objective: "Create a silent short film driven entirely by music and visuals, with no dialogue. Storyboard required.", estimatedDays: 8, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "No dialogue. Instrumental music only. Storyboard required before filming." },
          { id: uid(), title: "Pre-Production Review & Storyboard Peer Feedback", type: "instruction", objective: "Apply peer review criteria to evaluate storyboards and provide structured, actionable feedback.", estimatedDays: 2, standards: ["AME 4.0 – Leadership","CCSS ELA – Speaking & Listening"], links: [], notes: "" },
          { id: uid(), title: "Hero's Journey Group Project", type: "project", objective: "Produce a group film OR slide analysis of an existing film demonstrating all 12 Hero's Journey stages.", estimatedDays: 6, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership"], links: [], notes: "On-screen text labels required. All cinematography techniques required." },
          { id: uid(), title: "Traditions Video Project", type: "project", objective: "Create a 2–3 minute video about a family holiday tradition using green screen and all camera techniques.", estimatedDays: 4, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "Green screen required. Storyboard + script approval required before filming." },
          { id: uid(), title: "End of Semester Review & Film Festival", type: "assessment", objective: "Screen final semester projects, reflect on growth, and celebrate class work at the Film Festival.", estimatedDays: 2, standards: ["AME 1.0 – Careers","AME 7.0 – Communication"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Cultural Awareness & Documentary", semester: "Spring",
        essentialQuestion: "Whose stories aren't being told — and how do we use film to change that?",
        description: "Core focus: Research-driven video production, documentary structure, voice-over narration, cultural storytelling. Students produce real content that airs on the school news broadcast.",
        lessons: [
          { id: uid(), title: "Documentary Structure & Voice-Over Narration", type: "instruction", objective: "Explain documentary structure and demonstrate professional voice-over narration technique with visual support.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Visual Research – Archival Images & Citation", type: "instruction", objective: "Apply methods for finding, selecting, and properly citing archival images and footage in documentary work.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","ICT Anchor 8.0 – Ethics & Legal"], links: [], notes: "" },
          { id: uid(), title: "Lower-Thirds & On-Screen Graphics", type: "instruction", objective: "Design and implement lower-thirds, title cards, and on-screen text following broadcast best practices.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "Black History Month Tribute Video", type: "project", objective: "Create a video tribute to a chosen historical figure. Top videos air on the Roaring Report news broadcast.", estimatedDays: 6, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","CCSS ELA – Speaking & Listening"], links: [], notes: "Student choice from provided list. Top videos air on Roaring Report." },
          { id: uid(), title: "Women's History Month Video", type: "project", objective: "Produce a 1:30–2:00 min structured documentary about an influential woman. Top videos air on broadcast.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "Structured outline provided: background, impact, challenges, inspiration." },
          { id: uid(), title: "Epic Movie Trailer (Group Project)", type: "project", objective: "Create a shot-for-shot recreation of a real movie trailer using all original footage and green screen.", estimatedDays: 8, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology","AME 4.0 – Leadership"], links: [], notes: "All original footage required. Own props/costumes required. Studio title card required." },
          { id: uid(), title: "Tension & Conflict – How Editing Builds Pressure", type: "instruction", objective: "Analyze how pacing and editing techniques create tension in non-action scenes.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Story of Television Documentary (Group Project, Year A)", type: "project", objective: "Produce a 4–6 minute documentary about an assigned influential TV show including voice-over, lower-thirds, and original graphics.", estimatedDays: 10, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership"], links: [], notes: "Lower-thirds required. 1 original graphic required. Voice-over required. 3 visual support types required." },
        ]
      },
      {
        id: uid(), title: "Genre, Creative Voice & Capstone", semester: "Spring",
        essentialQuestion: "What is your voice as a filmmaker — and what story can only you tell?",
        description: "Core focus: Genre awareness, creative autonomy, capstone production. Students bring together everything from the year in their most ambitious work.",
        lessons: [
          { id: uid(), title: "Short Film Structure – Studying Pixar Shorts", type: "instruction", objective: "Identify elements of a complete short film structure and analyze Pixar shorts as models.", estimatedDays: 2, standards: ["AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Green Screen Advanced Techniques & Chroma Key", type: "instruction", objective: "Apply advanced chroma key troubleshooting and creative uses of green screen in production.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "How-To Video Project", type: "project", objective: "Create a 1–3 minute tutorial video with voice-over narration and time-lapse on any topic of choice.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "Voice-over narration required. Time-lapse required." },
          { id: uid(), title: "Commercial Swede (Group Project, Year A)", type: "project", objective: "Create a shot-for-shot low-budget recreation of a commercial or TV intro with own props and storyboard approval.", estimatedDays: 8, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology","AME 4.0 – Leadership"], links: [], notes: "45 sec–1 min. Own props required. Storyboard approval required. Green screen required." },
          { id: uid(), title: "Film Festival Planning – Audience Awareness", type: "instruction", objective: "Develop a film festival planning strategy considering audience awareness and production timeline.", estimatedDays: 2, standards: ["AME 1.0 – Careers","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Film Festival Short Film (Group Project)", type: "project", objective: "Produce a 5–6 minute original short film with authentic creative vision for whole-school screening and vote.", estimatedDays: 12, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership","AME 9.0 – Technology"], links: [], notes: "No instructions — authentic creative vision. Whole school screening. Student vote. 4 weeks production time." },
          { id: uid(), title: "End-of-Year Reflection Podcast", type: "project", objective: "Create a 7–10 minute edited podcast video reflecting on the full year of learning and production.", estimatedDays: 5, standards: ["AME 7.0 – Communication","AME 1.0 – Careers"], links: [], notes: "Raw recording, no advance questions. B-roll from past projects required." },
          { id: uid(), title: "Film Festival Week – Whole School Screening", type: "assessment", objective: "Screen the Film Festival short films for the whole school, conduct student vote, and celebrate the year.", estimatedDays: 2, standards: ["AME 1.0 – Careers","AME 4.0 – Leadership"], links: [], notes: "" },
        ]
      },
    ]
  },
  "media-b": {
    units: [
      {
        id: uid(), title: "Visual Language – Advanced", semester: "Fall",
        essentialQuestion: "How does intentional use of shots, angles, and movement reveal a director's unique vision?",
        description: "Action Crew (returning Year B students) step immediately into production leadership roles while studying advanced cinematography. Year B differentiation: Expanded Shot/Angle/Movement Scene with director's statement.",
        lessons: [
          { id: uid(), title: "Action Crew Orientation & Leadership Roles", type: "instruction", objective: "Understand Action Crew leadership roles (Director, Producer, Editor, Production Engineer) and responsibilities.", estimatedDays: 2, standards: ["AME 1.0 – Careers","AME 4.0 – Leadership"], links: [], notes: "Action Crew students step into production leadership immediately. Groups formed with at least one Action Crew member." },
          { id: uid(), title: "Shot Types Review & Advanced Application", type: "instruction", objective: "Apply shot type knowledge to analyze professional films and justify cinematic choices.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Camera Angles – Advanced Analysis", type: "instruction", objective: "Analyze how directors use camera angles to convey directorial intent and subtext.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Camera Movement – Directorial Intent", type: "instruction", objective: "Analyze how specific camera movements communicate meaning and justify movement choices in planning.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Expanded Shot/Angle/Movement Scene (Year B Group Project)", type: "project", objective: "Create a scene using all three techniques with intentional directorial choices, supported by a written director's statement.", estimatedDays: 6, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership"], links: [], notes: "Director's statement required explaining every choice. Deeper analysis than Year A project." },
        ]
      },
      {
        id: uid(), title: "Production Fundamentals – Advanced", semester: "Fall",
        essentialQuestion: "When you can see every technique clearly, how do you choose which one serves the story best?",
        description: "Year B students deepen production skills, focusing on intentional application of all techniques learned in Year A. Action Crew duties run continuously.",
        lessons: [
          { id: uid(), title: "Advanced Editing – Rhythm, Continuity & Match Cuts", type: "instruction", objective: "Apply advanced editing principles including rhythmic editing, continuity cutting, and match cuts.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "B-Roll Competition (Advanced)", type: "project", objective: "Capture 10+ B-roll shots demonstrating advanced compositional choices, then edit into a 1-minute video.", estimatedDays: 4, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "No faces rule. More advanced compositional choices expected from Year B students." },
          { id: uid(), title: "Advanced Audio – Layering & Sound Design", type: "instruction", objective: "Layer multiple audio tracks, design sound effects, and create professional audio mixes.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology"], links: [], notes: "" },
          { id: uid(), title: "Advanced Interviewing & Documentary Technique", type: "instruction", objective: "Apply professional documentary interviewing techniques including response framing and emotional storytelling.", estimatedDays: 2, standards: ["AME 7.0 – Communication","CCSS ELA – Speaking & Listening"], links: [], notes: "" },
          { id: uid(), title: "Peer & Teacher Interview Projects", type: "project", objective: "Produce professional interviews at an advanced level with sophisticated B-roll coverage and audio mixing.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "Higher expectations for shot variety and audio quality than Year A." },
        ]
      },
      {
        id: uid(), title: "Music, Narrative & Story – Year B", semester: "Fall",
        essentialQuestion: "What makes a film score feel inevitable — like it could only ever fit that exact moment?",
        description: "Year B students study music and narrative at a deeper analytical level, with Year B-specific films and projects.",
        lessons: [
          { id: uid(), title: "Music in Film – Advanced Analysis (Bruno Coulais & Coraline)", type: "instruction", objective: "Analyze how Bruno Coulais' score in Coraline shifts between the real world and Other World, distinguishing sound design from score.", estimatedDays: 2, standards: ["AME 7.0 – Communication"], links: [], notes: "Year B uses Coraline instead of Nightmare Before Christmas." },
          { id: uid(), title: "Hero's Journey – Comparative Analysis", type: "instruction", objective: "Compare Hero's Journey structures across multiple films and episodes, identifying structural variations.", estimatedDays: 3, standards: ["AME 7.0 – Communication","CCSS ELA – Speaking & Listening"], links: [], notes: "Year B uses The Iron Giant + Bluey different episodes + Pixar Shorts." },
          { id: uid(), title: "Music Driven Story Project", type: "project", objective: "Create a silent short film driven entirely by music and visuals, with deliberate musical selection and justification.", estimatedDays: 8, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "No dialogue. More sophisticated musical choices expected from Year B." },
          { id: uid(), title: "Hero's Journey Group Project", type: "project", objective: "Produce a group film OR comparative slide analysis across multiple films demonstrating advanced Hero's Journey understanding.", estimatedDays: 6, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership"], links: [], notes: "Year B can choose to compare arc structure across two short examples." },
          { id: uid(), title: "Holiday Video Project", type: "project", objective: "Create a holiday-themed video demonstrating mastery of all production techniques at Year B level.", estimatedDays: 4, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "Green screen required. All techniques expected at a higher level of intentionality." },
        ]
      },
      {
        id: uid(), title: "Cultural Awareness & Personal Documentary", semester: "Spring",
        essentialQuestion: "What does it mean to make something that only you could make?",
        description: "Year B students undertake personal narrative filmmaking in their documentary slot. The Moment That Matters project is an individual silent short film unique to Year B.",
        lessons: [
          { id: uid(), title: "Personal Narrative Filmmaking", type: "instruction", objective: "Analyze what makes a personal moment cinematically significant and plan a personal narrative film.", estimatedDays: 2, standards: ["AME 7.0 – Communication","AME 3.0 – Technical Skills"], links: [], notes: "Year B lesson: What makes a moment matter?" },
          { id: uid(), title: "Storyboard Development & Peer Review", type: "instruction", objective: "Develop a detailed storyboard for a personal narrative film and give/receive structured peer feedback.", estimatedDays: 3, standards: ["AME 3.0 – Technical Skills","AME 4.0 – Leadership"], links: [], notes: "Storyboard peer review required. Teacher approval required before filming." },
          { id: uid(), title: "Black History Month Tribute Video", type: "project", objective: "Create a video tribute at an advanced production level. Top videos air on the Roaring Report.", estimatedDays: 6, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Women's History Month Video", type: "project", objective: "Produce a structured documentary about an influential woman at an advanced production level.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "" },
          { id: uid(), title: "Moment That Matters – Personal Short Film (Year B)", type: "project", objective: "Create a 5–6 min silent short film capturing a character's significant moment. No dialogue. Storyboard peer review required.", estimatedDays: 12, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "Year B exclusive project. No dialogue. 5–6 weeks. Storyboard peer review required before filming." },
          { id: uid(), title: "Epic Movie Trailer (Group Project)", type: "project", objective: "Create a shot-for-shot recreation of a movie trailer using all original footage and green screen at Year B level.", estimatedDays: 8, standards: ["AME 3.0 – Technical Skills","AME 9.0 – Technology","AME 4.0 – Leadership"], links: [], notes: "" },
        ]
      },
      {
        id: uid(), title: "Genre, Creative Voice & Capstone – Year B", semester: "Spring",
        essentialQuestion: "Looking back on two years of filmmaking — what have you learned to see?",
        description: "Year B students complete their most ambitious and autonomous work, culminating in the Film Festival and End-of-Year Reflection Podcast.",
        lessons: [
          { id: uid(), title: "Genre Subversion & Creative Voice", type: "instruction", objective: "Analyze how The Princess Bride subverts genre conventions and apply genre subversion to original work.", estimatedDays: 2, standards: ["AME 7.0 – Communication"], links: [], notes: "Year B uses The Princess Bride as primary text." },
          { id: uid(), title: "Found Footage & Personal Visual Storytelling", type: "instruction", objective: "Analyze how Earth to Echo uses found footage style and discuss when breaking camera rules becomes intentional.", estimatedDays: 2, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication"], links: [], notes: "Year B uses Earth to Echo instead of E.T." },
          { id: uid(), title: "How-To Video Project", type: "project", objective: "Create a 1–3 minute tutorial video at Year B production quality standards.", estimatedDays: 5, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 9.0 – Technology"], links: [], notes: "Voice-over narration required. Time-lapse required. Higher production quality expected." },
          { id: uid(), title: "The Homage – Scene Recreation (Year B Group Project)", type: "project", objective: "Recreate a scene from a course film matching shots, angles, and movement with a required director's statement.", estimatedDays: 8, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership"], links: [], notes: "Must choose from course films studied. Director's statement required. Year B exclusive project." },
          { id: uid(), title: "Film Festival Short Film (Group Project)", type: "project", objective: "Produce a 5–6 minute original short film with authentic creative vision for whole-school screening and vote.", estimatedDays: 12, standards: ["AME 3.0 – Technical Skills","AME 7.0 – Communication","AME 4.0 – Leadership","AME 9.0 – Technology"], links: [], notes: "No instructions — authentic creative vision. Whole school screening. Student vote." },
          { id: uid(), title: "End-of-Year Reflection Podcast", type: "project", objective: "Create a 7–10 minute edited podcast video reflecting on two full years of production and growth.", estimatedDays: 5, standards: ["AME 7.0 – Communication","AME 1.0 – Careers"], links: [], notes: "Raw recording, no advance questions. B-roll from two years of projects." },
          { id: uid(), title: "Film Festival Week – Whole School Screening", type: "assessment", objective: "Screen the Film Festival short films for the whole school, conduct student vote, and celebrate two years of filmmaking.", estimatedDays: 2, standards: ["AME 1.0 – Careers","AME 4.0 – Leadership"], links: [], notes: "" },
        ]
      },
    ]
  }
};
// ─── UTILITY ─────────────────────────────────────────────────────────────────

function getLessonTypeMeta(type) {
  return LESSON_TYPES.find(t => t.id === type) || LESSON_TYPES[0];
}

function getResourceTypeMeta(type) {
  return RESOURCE_TYPES.find(r => r.id === type) || RESOURCE_TYPES[0];
}

function countDays(units, semester) {
  return units.filter(u => !semester || u.semester === semester)
    .reduce((sum, u) => sum + u.lessons.reduce((s, l) => s + (l.estimatedDays || 1), 0), 0);
}

function getPathwayForCourse(courseId) {
  return PATHWAYS.find(p => p.courses.some(c => c.id === courseId));
}

function getCourse(courseId) {
  for (const p of PATHWAYS) {
    const c = p.courses.find(c => c.id === courseId);
    if (c) return { ...c, pathway: p };
  }
  return null;
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Badge({ type }) {
  const tb = LESSON_TYPE_BG[type] || LESSON_TYPE_BG.instruction;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
      padding: "3px 9px", borderRadius: 5,
      background: tb.bg, color: tb.accent,
      textTransform: "uppercase", whiteSpace: "nowrap", flexShrink: 0,
      border: `1px solid ${tb.border}`
    }}>{type}</span>
  );
}

function ResourceBadge({ type }) {
  const meta = getResourceTypeMeta(type);
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
      background: meta.color + "18", color: meta.color,
      border: `1px solid ${meta.color}30`, whiteSpace: "nowrap"
    }}>{meta.icon} {meta.label}</span>
  );
}

function DayPill({ days, label, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, padding: "3px 10px",
      borderRadius: 20, background: color + "22", color: color,
      border: `1px solid ${color}50`
    }}>
      <Clock size={11} /> {days} {label || "days"}
    </span>
  );
}

// ─── MODAL OVERLAY (iframe-safe, in-flow) ────────────────────────────────────

function Modal({ children, onClose }) {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "40px 16px 60px", boxSizing: "border-box",
      backgroundColor: "rgba(5,7,15,0.80)",
      overflowY: "auto",
      backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#161b27",
        borderRadius: 16,
        border: "1.5px solid #2a3050",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
        width: "100%", maxWidth: 680,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        marginTop: 0,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── LESSON EDITOR MODAL ─────────────────────────────────────────────────────

function LessonEditor({ lesson, onSave, onClose, standards }) {
  const [form, setForm] = useState({ ...lesson, links: lesson.links ? [...lesson.links.map(l => ({ ...l }))] : [] });
  const [newLink, setNewLink] = useState({ label: "", url: "", type: "slide-deck" });
  const [showStdPicker, setShowStdPicker] = useState(false);
  const [stdSearch, setStdSearch] = useState("");

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addLink = () => {
    if (!newLink.label || !newLink.url) return;
    update("links", [...(form.links || []), { ...newLink, id: uid() }]);
    setNewLink({ label: "", url: "", type: "slide-deck" });
  };

  const removeLink = (id) => update("links", form.links.filter(l => l.id !== id));

  const toggleStd = (std) => {
    const curr = form.standards || [];
    update("standards", curr.includes(std) ? curr.filter(s => s !== std) : [...curr, std]);
  };

  const filteredStds = standards.filter(s => s.toLowerCase().includes(stdSearch.toLowerCase()));

  const modalHeader = { padding: "20px 26px 16px", borderBottom: "1.5px solid #2a3050", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e2436" };
  const modalBody = { padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", maxHeight: "65vh", background: "#161b27" };
  const modalFooter = { padding: "16px 26px", borderTop: "1.5px solid #2a3050", display: "flex", justifyContent: "flex-end", gap: 12, background: "#1e2436" };

  return (
    <Modal onClose={onClose}>
      <div style={modalHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#1a56c4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Edit3 size={14} color="white" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f0ede8" }}>Edit Lesson</h3>
        </div>
        <button onClick={onClose} style={{ background: "#252b40", border: "1px solid #2a3050", borderRadius: 6, cursor: "pointer", color: "#9ca3b8", padding: "4px 8px", display: "flex", alignItems: "center" }}><X size={16} /></button>
      </div>

      <div style={modalBody}>
        <div>
          <label style={modalLabelStyle}>Title *</label>
          <input value={form.title} onChange={e => update("title", e.target.value)} style={modalInputStyle} placeholder="Lesson title" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={modalLabelStyle}>Type *</label>
            <select value={form.type} onChange={e => update("type", e.target.value)} style={modalInputStyle}>
              {LESSON_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={modalLabelStyle}>Estimated Days *</label>
            <input type="number" min={1} max={30} value={form.estimatedDays} onChange={e => update("estimatedDays", parseInt(e.target.value) || 1)} style={modalInputStyle} />
          </div>
        </div>

        <div>
          <label style={modalLabelStyle}>Learning Objective</label>
          <textarea value={form.objective || ""} onChange={e => update("objective", e.target.value)} style={{ ...modalInputStyle, minHeight: 64, resize: "vertical" }} placeholder="One-sentence learning objective or student outcome" />
        </div>

        <div>
          <label style={modalLabelStyle}>Bell Ringers</label>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#5a6380" }}>
            One per day — set in Learning Objective above. Add a check-in question for each day this lesson runs.
          </p>
          {Array.from({ length: form.estimatedDays || 1 }, (_, i) => {
            // Migrate legacy single bellRinger string to array slot 0
            const legacy = typeof form.bellRinger === "string" ? form.bellRinger : "";
            const currentVal = Array.isArray(form.bellRingers)
              ? (form.bellRingers[i] ?? "")
              : (i === 0 ? legacy : "");
            const updateDay = (val) => {
              const arr = Array.isArray(form.bellRingers)
                ? [...form.bellRingers]
                : Array.from({ length: form.estimatedDays || 1 }, (_, j) =>
                    j === 0 && typeof form.bellRinger === "string" ? form.bellRinger : ""
                  );
              arr[i] = val;
              update("bellRingers", arr);
            };
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                {(form.estimatedDays || 1) > 1 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#5a6380", marginBottom: 4, letterSpacing: "0.04em" }}>
                    DAY {i + 1}
                  </div>
                )}
                <textarea
                  value={currentVal}
                  onChange={e => updateDay(e.target.value)}
                  style={{ ...modalInputStyle, minHeight: 56, resize: "vertical" }}
                  placeholder={`Bell ringer for day ${i + 1}...`}
                />
              </div>
            );
          })}
        </div>

        <div>
          <label style={modalLabelStyle}>Standards</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {(form.standards || []).map(s => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "3px 8px 3px 10px", borderRadius: 20, background: "#0d1f3d", border: "1px solid #1a3a6b", color: "#93c5fd" }}>
                {s.split("–")[0].trim()}
                <button onClick={() => toggleStd(s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#6b7280", display: "flex" }}><X size={11} /></button>
              </span>
            ))}
            <button onClick={() => setShowStdPicker(!showStdPicker)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "none", border: "1px dashed #2a3050", cursor: "pointer", color: "#5a6380" }}>+ Add standard</button>
          </div>
          {showStdPicker && (
            <div style={{ border: "1.5px solid #2a3050", borderRadius: 8, overflow: "hidden", background: "#1e2436" }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid #2a3050", background: "#252b40" }}>
                <input value={stdSearch} onChange={e => setStdSearch(e.target.value)} style={{ ...modalInputStyle, margin: 0 }} placeholder="Search standards..." />
              </div>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {filteredStds.map(s => (
                  <div key={s} onClick={() => toggleStd(s)} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#f0ede8", background: (form.standards || []).includes(s) ? "#0d1f3d" : "#1e2436", borderBottom: "0.5px solid #1e2436" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: "1.5px solid #d1d5db", background: (form.standards || []).includes(s) ? "#1a56c4" : "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {(form.standards || []).includes(s) && <span style={{ color: "white", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label style={modalLabelStyle}>Resource Links</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(form.links || []).map(link => (
              <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#252b40", borderRadius: 8, border: "1px solid #2a3050" }}>
                <ResourceBadge type={link.type} />
                <span style={{ flex: 1, fontSize: 13, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.label}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1a56c4", display: "flex" }}><ExternalLink size={14} /></a>
                <button onClick={() => removeLink(link.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><X size={14} /></button>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr auto", gap: 8, alignItems: "end", padding: "10px 12px", background: "#252b40", borderRadius: 8, border: "1px solid #2a3050" }}>
              <div>
                <label style={{ ...modalLabelStyle, fontSize: 11 }}>Type</label>
                <select value={newLink.type} onChange={e => setNewLink(l => ({ ...l, type: e.target.value }))} style={{ ...modalInputStyle, fontSize: 12 }}>
                  {RESOURCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...modalLabelStyle, fontSize: 11 }}>Label</label>
                <input value={newLink.label} onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))} style={{ ...modalInputStyle, fontSize: 12 }} placeholder="e.g. Lesson Slides" />
              </div>
              <div>
                <label style={{ ...modalLabelStyle, fontSize: 11 }}>URL</label>
                <input value={newLink.url} onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))} style={{ ...modalInputStyle, fontSize: 12 }} placeholder="https://..." />
              </div>
              <button onClick={addLink} style={{ ...solidBtnStyle, height: 36, alignSelf: "end", fontSize: 12 }}><Plus size={13} /> Add</button>
            </div>
          </div>
        </div>

        <div>
          <label style={modalLabelStyle}>Notes / Reflections</label>
          <textarea value={form.notes || ""} onChange={e => update("notes", e.target.value)} style={{ ...modalInputStyle, minHeight: 80, resize: "vertical" }} placeholder="Teaching notes, what worked, what to change next year..." />
        </div>
      </div>

      <div style={modalFooter}>
        <button onClick={onClose} style={{ ...solidBtnStyle, background: "#ffffff", color: "#374151", borderColor: "#d1d5db" }}>Cancel</button>
        <button onClick={() => onSave(form)} style={{ ...solidBtnStyle, background: "#1a56c4", color: "#ffffff", borderColor: "#1a56c4" }}>Save Lesson</button>
      </div>
    </Modal>
  );
}

// ─── UNIT EDITOR ─────────────────────────────────────────────────────────────

function UnitEditor({ unit, onSave, onClose }) {
  const [form, setForm] = useState({ ...unit });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: "18px 24px 14px", borderBottom: "1.5px solid #2a3050", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e2436" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={14} color="white" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f0ede8" }}>Edit Unit</h3>
        </div>
        <button onClick={onClose} style={{ background: "#252b40", border: "1px solid #2a3050", borderRadius: 6, cursor: "pointer", color: "#9ca3b8", padding: "4px 8px", display: "flex", alignItems: "center" }}><X size={16} /></button>
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, background: "#161b27" }}>
        <div>
          <label style={modalLabelStyle}>Unit Title *</label>
          <input value={form.title} onChange={e => update("title", e.target.value)} style={modalInputStyle} />
        </div>
        <div>
          <label style={modalLabelStyle}>Semester</label>
          <select value={form.semester} onChange={e => update("semester", e.target.value)} style={modalInputStyle}>
            <option value="Fall">Fall</option>
            <option value="Spring">Spring</option>
          </select>
        </div>
        <div>
          <label style={modalLabelStyle}>Essential Question</label>
          <textarea value={form.essentialQuestion || ""} onChange={e => update("essentialQuestion", e.target.value)} style={{ ...modalInputStyle, minHeight: 60, resize: "vertical" }} />
        </div>
        <div>
          <label style={modalLabelStyle}>Unit Description</label>
          <textarea value={form.description || ""} onChange={e => update("description", e.target.value)} style={{ ...modalInputStyle, minHeight: 80, resize: "vertical" }} />
        </div>
      </div>
      <div style={{ padding: "14px 24px", borderTop: "1.5px solid #2a3050", display: "flex", justifyContent: "flex-end", gap: 10, background: "#1e2436" }}>
        <button onClick={onClose} style={{ ...solidBtnStyle, background: "#ffffff", color: "#374151", borderColor: "#d1d5db" }}>Cancel</button>
        <button onClick={() => onSave(form)} style={{ ...solidBtnStyle, background: "#7c3aed", color: "#ffffff", borderColor: "#7c3aed" }}>Save Unit</button>
      </div>
    </Modal>
  );
}

// ─── LESSON ROW ──────────────────────────────────────────────────────────────

function LessonRow({ lesson, index, unitId, onUpdate, onDelete, onDuplicate, onReorder, totalLessons, pathwayColor, dragState, setDragState }) {
  const isDragging = dragState?.dragging === `${unitId}:${lesson.id}`;
  const isOver = dragState?.over === `${unitId}:${lesson.id}`;

  return (
    <div
      id={`lesson-row-${lesson.id}`}
      draggable
      onDragStart={e => { e.stopPropagation(); setDragState({ dragging: `${unitId}:${lesson.id}`, unitId }); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragState(s => ({ ...s, over: `${unitId}:${lesson.id}` })); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragState(s => ({ ...s, over: null })); }}
      onDrop={e => { e.stopPropagation(); if (dragState?.unitId === unitId) onReorder(dragState.dragging.split(":")[1], lesson.id); setDragState(null); }}
      onDragEnd={e => { e.stopPropagation(); setDragState(null); }}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
        borderRadius: 10,
        background: isDragging
          ? (LESSON_TYPE_BG[lesson.type]?.bg || "#1e2436")
          : isOver
            ? (pathwayColor + "22")
            : (LESSON_TYPE_BG[lesson.type]?.bg || "#1e2436"),
        border: `1.5px solid ${isOver ? pathwayColor : isDragging ? pathwayColor + "80" : (LESSON_TYPE_BG[lesson.type]?.border || "#2a3050")}`,
        borderLeft: `4px solid ${LESSON_TYPE_BG[lesson.type]?.accent || pathwayColor}`,
        marginBottom: 6, cursor: "default",
        transition: "border-color 0.12s, box-shadow 0.12s, background 0.12s",
        opacity: isDragging ? 0.80 : 1,
        boxShadow: isOver ? `0 0 0 3px ${pathwayColor}30` : isDragging ? "0 6px 20px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{ color: "#3a4468", cursor: "grab", marginTop: 3, flexShrink: 0 }}><GripVertical size={14} /></div>
      <div style={{
        color: "#ffffff", backgroundColor: LESSON_TYPE_BG[lesson.type]?.accent || pathwayColor,
        fontSize: 10, fontWeight: 700, minWidth: 20, height: 20,
        borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 2, flexShrink: 0
      }}>{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#f0ede8" }}>{lesson.title}</span>
          <Badge type={lesson.type} />
          <DayPill days={lesson.estimatedDays} color={pathwayColor} />
        </div>
        {lesson.objective && <p style={{ margin: "5px 0 0", fontSize: 14, color: "#9ca3b8", lineHeight: 1.55, textAlign: "left" }}>{lesson.objective}</p>}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
          {(lesson.standards || []).slice(0, 3).map(s => (
            <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 10, background: "#252b40", color: "#9ca3b8", border: "1px solid #2a3050" }}>{s.split("–")[0].trim()}</span>
          ))}
          {(lesson.standards || []).length > 3 && <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", alignSelf: "center" }}>+{lesson.standards.length - 3} more</span>}
          {(lesson.links || []).length > 0 && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#0d1f3d", color: "#93c5fd", border: "1px solid #1a3a6b" }}>
              🔗 {lesson.links.length} resource{lesson.links.length !== 1 ? "s" : ""}
            </span>
          )}
          {lesson.notes && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#2d1a0d", color: "#fb923c", border: "1px solid #6b3a1a" }}>📝 notes</span>
          )}
          {((lesson.bellRingers && lesson.bellRingers.some(b => b)) || lesson.bellRinger) && (
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#0d2d1a", color: "#22c55e", border: "1px solid #1a5433" }}>🔔 bell ringer</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 1 }}>
        <button onClick={() => onUpdate(lesson)} style={{ ...iconBtn, background: "#252b40", border: "1px solid #2a3050", borderRadius: 6 }} title="Edit lesson"><Edit3 size={13} /></button>
        <button onClick={() => onDuplicate(lesson.id)} style={{ ...iconBtn, background: "#252b40", border: "1px solid #2a3050", borderRadius: 6 }} title="Duplicate lesson"><Copy size={13} /></button>
        <button onClick={() => onDelete(lesson.id)} style={{ ...iconBtn, color: "#f87171", background: "#2d0f0f", border: "1px solid #6b1a1a", borderRadius: 6 }} title="Delete lesson"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ─── UNIT CARD ───────────────────────────────────────────────────────────────

function UnitCard({ unit, index, totalUnits, courseId, onUpdateUnit, onDeleteUnit, onReorderUnit, onDuplicateUnit, onUpdateLesson, onDeleteLesson, onReorderLesson, onDuplicateLesson, onAddLesson, pathwayColor, dragState, setDragState, standards: propStandards, focusedLessonId }) {
  const [expanded, setExpanded] = useState(false);
  const [editingUnit, setEditingUnit] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [quickEntry, setQuickEntry] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [quickType, setQuickType] = useState("instruction");
  const standards = propStandards || DEFAULT_STANDARDS;

  // Auto-expand if the focused lesson belongs to this unit
  useEffect(() => {
    if (focusedLessonId && unit.lessons.some(l => l.id === focusedLessonId)) {
      setExpanded(true);
    }
  }, [focusedLessonId]);

  const totalDays = unit.lessons.reduce((s, l) => s + (l.estimatedDays || 1), 0);
  const isDragging = dragState?.unitDragging === unit.id;
  const isOver = dragState?.unitOver === unit.id;

  const handleQuickAdd = () => {
    const titles = quickText.split("\n").map(t => t.trim()).filter(Boolean);
    if (!titles.length) return;
    const newLessons = titles.map(title => ({ id: uid(), title, type: quickType, estimatedDays: 1, standards: [], links: [], notes: "", objective: "" }));
    onAddLesson(unit.id, newLessons);
    setQuickText("");
    setQuickEntry(false);
  };

  const semesterBg = unit.semester === "Fall" ? "#2d1a0d" : "#0d1f3d";
  const semesterColor = unit.semester === "Fall" ? "#fb923c" : "#93c5fd";
  const semesterBorder = unit.semester === "Fall" ? "#6b3a1a" : "#1a3a6b";

  return (
    <>
      {editingUnit && (
        <UnitEditor unit={unit} onClose={() => setEditingUnit(false)} onSave={updated => { onUpdateUnit(updated); setEditingUnit(false); }} />
      )}
      {editingLesson && (
        <LessonEditor lesson={editingLesson} standards={standards} onClose={() => setEditingLesson(null)} onSave={updated => { onUpdateLesson(unit.id, updated); setEditingLesson(null); }} />
      )}
      <div
        draggable
        onDragStart={e => { e.stopPropagation(); setDragState({ unitDragging: unit.id }); }}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragState(s => ({ ...s, unitOver: unit.id })); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragState(s => ({ ...s, unitOver: null })); }}
        onDrop={e => { e.stopPropagation(); if (dragState?.unitDragging && dragState.unitDragging !== unit.id) onReorderUnit(dragState.unitDragging, unit.id); setDragState(null); }}
        onDragEnd={e => { e.stopPropagation(); setDragState(null); }}
        style={{
          borderRadius: 12,
          border: `1.5px solid ${isOver ? pathwayColor : isDragging ? pathwayColor + "70" : "#2a3050"}`,
          background: isDragging ? "#1e2436" : "#161b27",
          overflow: "hidden", marginBottom: 16, opacity: isDragging ? 0.80 : 1,
          boxShadow: isOver ? `0 0 0 4px ${pathwayColor}30` : isDragging ? `0 8px 32px rgba(0,0,0,0.5)` : "0 2px 12px rgba(0,0,0,0.4)"
        }}
      >
        {/* Unit Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderLeft: `5px solid ${pathwayColor}`, background: `linear-gradient(to right, ${pathwayColor}20, #161b27)`, borderBottom: "1.5px solid #1e2436" }}>
          <div style={{ color: "#3a4468", cursor: "grab" }}><GripVertical size={15} /></div>
          <button onClick={() => setExpanded(e => !e)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5a6380", display: "flex", padding: 2 }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 600, color: "#f0ede8", letterSpacing: "-0.01em" }}>Unit {index + 1}: {unit.title}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: semesterBg, color: semesterColor, border: `1px solid ${semesterBorder}` }}>{unit.semester}</span>
              <DayPill days={totalDays} color={pathwayColor} />
            </div>
            {unit.essentialQuestion && (
              <p style={{ margin: "5px 0 0", fontSize: 14, color: "#7a8099", fontStyle: "italic", lineHeight: 1.5, textAlign: "left" }}>"{unit.essentialQuestion}"</p>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button onClick={() => setEditingUnit(true)} style={{ ...iconBtn, background: "#252b40", border: "1px solid #2a3050", borderRadius: 6 }} title="Edit unit"><Edit3 size={13} /></button>
            <button onClick={() => onDuplicateUnit(unit.id)} style={{ ...iconBtn, background: "#252b40", border: "1px solid #2a3050", borderRadius: 6 }} title="Duplicate unit"><Copy size={13} /></button>
            <button onClick={() => onDeleteUnit(unit.id)} style={{ ...iconBtn, color: "#f87171", background: "#2d0f0f", border: "1px solid #6b1a1a", borderRadius: 6 }} title="Delete unit"><Trash2 size={13} /></button>
          </div>
        </div>

        {/* Lessons */}
        {expanded && (
          <div style={{ padding: "14px 16px 16px", background: "#0f1117", borderTop: "none" }}>
            {unit.lessons.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#3a4468", fontSize: 13, borderRadius: 8, border: "1.5px dashed #2a3050", background: "#161b27" }}>
                No lessons yet — use Add Lesson or Quick Entry below.
              </div>
            )}
            {unit.lessons.map((lesson, i) => (
              <LessonRow
                key={lesson.id} lesson={lesson} index={i} unitId={unit.id}
                totalLessons={unit.lessons.length} pathwayColor={pathwayColor}
                onUpdate={(l) => setEditingLesson(l)}
                onDelete={(id) => onDeleteLesson(unit.id, id)}
                onDuplicate={(id) => onDuplicateLesson(unit.id, id)}
                onReorder={(fromId, toId) => onReorderLesson(unit.id, fromId, toId)}
                dragState={dragState} setDragState={setDragState}
              />
            ))}

            {/* Quick Entry */}
            {quickEntry ? (
              <div style={{ marginTop: 12, padding: 14, background: "#1e2436", borderRadius: 10, border: "1px solid #2a3050" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#f0ede8" }}>Quick Entry — one lesson title per line</span>
                  <button onClick={() => setQuickEntry(false)} style={{ ...iconBtn, color: "var(--color-text-secondary)" }}><X size={14} /></button>
                </div>
                <textarea
                  value={quickText}
                  onChange={e => setQuickText(e.target.value)}
                  style={{ ...inputStyle, minHeight: 100, fontSize: 13, resize: "vertical", marginBottom: 10 }}
                  placeholder={"Intro to HTML Structure\nBuilding Your First Webpage\nLinks and Navigation\nImages and Media"}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <select value={quickType} onChange={e => setQuickType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
                    {LESSON_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <button onClick={handleQuickAdd} style={{ ...btnStyle, background: pathwayColor, color: "white", borderColor: pathwayColor }}>
                    Add {quickText.split("\n").filter(Boolean).length || 0} lessons
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => { const l = { id: uid(), title: "New Lesson", type: "instruction", estimatedDays: 1, standards: [], links: [], notes: "", objective: "" }; onAddLesson(unit.id, [l]); setEditingLesson(l); }} style={{ ...btnStyle, flex: 1, justifyContent: "center" }}>
                  <Plus size={13} /> Add Lesson
                </button>
                <button onClick={() => setQuickEntry(true)} style={{ ...btnStyle, flex: 1, justifyContent: "center" }}>
                  <Layers size={13} /> Quick Entry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── SEARCH & FILTER PANEL ───────────────────────────────────────────────────

function SearchPanel({ units, pathwayColor, onClose }) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");

  const results = units.flatMap(u =>
    u.lessons
      .filter(l => {
        const q = query.toLowerCase();
        const matchSearch = !q ||
          l.title.toLowerCase().includes(q) ||
          u.title.toLowerCase().includes(q) ||
          (l.objective || "").toLowerCase().includes(q) ||
          (l.standards || []).some(s => s.toLowerCase().includes(q)) ||
          (l.links || []).some(lk => lk.label.toLowerCase().includes(q) || lk.type.toLowerCase().includes(q));
        const matchType = filterType === "all" || l.type === filterType;
        const matchSem = filterSemester === "all" || u.semester === filterSemester;
        return matchSearch && matchType && matchSem;
      })
      .map(l => ({ ...l, unitTitle: u.title, semester: u.semester }))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
          <input value={query} onChange={e => setQuery(e.target.value)} style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Search lessons, standards, resources..." autoFocus />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">All Types</option>
          {LESSON_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
          <option value="all">Both Semesters</option>
          <option value="Fall">Fall</option>
          <option value="Spring">Spring</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: "#3a4468" }}>{results.length} result{results.length !== 1 ? "s" : ""}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map(l => (
          <div key={l.id} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #2a3050", background: "#1e2436" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#f0ede8" }}>{l.title}</span>
              <Badge type={l.type} />
              <DayPill days={l.estimatedDays} color={pathwayColor} />
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
              {l.unitTitle} · {l.semester}
            </div>
            {l.objective && <div style={{ fontSize: 14, color: "#7a8099", marginTop: 3, lineHeight: 1.5, textAlign: "left" }}>{l.objective}</div>}
            {(l.standards || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                {l.standards.slice(0, 4).map(s => <span key={s} style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#252b40", color: "#5a6380", border: "1px solid #2a3050" }}>{s.split("–")[0].trim()}</span>)}
              </div>
            )}
          </div>
        ))}
        {results.length === 0 && query && (
          <div style={{ textAlign: "center", padding: 32, color: "#3a4468", fontSize: 13 }}>No lessons match your search.</div>
        )}
      </div>
    </div>
  );
}

// ─── STANDARDS MANAGER MODAL ─────────────────────────────────────────────────

function StandardsManager({ standards, onSave, onClose }) {
  const [list, setList] = useState([...standards]);
  const [newStd, setNewStd] = useState("");
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const add = () => {
    const val = newStd.trim();
    if (!val || list.includes(val)) return;
    setList(l => [...l, val]);
    setNewStd("");
  };

  const remove = (i) => setList(l => l.filter((_, idx) => idx !== i));

  const handleDrop = (toIdx) => {
    if (dragIdx === null || dragIdx === toIdx) return;
    const arr = [...list];
    const [item] = arr.splice(dragIdx, 1);
    arr.splice(toIdx, 0, item);
    setList(arr);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding: "20px 26px 16px", borderBottom: "2px solid #e8e0d8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#faf7f4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#475569", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={14} color="white" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f0ede8" }}>Manage Standards</h3>
        </div>
        <button onClick={onClose} style={{ background: "#252b40", border: "1px solid #2a3050", borderRadius: 6, cursor: "pointer", color: "#9ca3b8", padding: "4px 8px", display: "flex" }}><X size={16} /></button>
      </div>

      <div style={{ padding: "20px 26px", background: "#161b27", maxHeight: "55vh", overflowY: "auto" }}>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#7a8099", lineHeight: 1.5 }}>
          Add, remove, or reorder standards. These appear in the standards picker on every lesson. Drag to reorder.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={newStd}
            onChange={e => setNewStd(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            style={{ ...modalInputStyle, flex: 1 }}
            placeholder="e.g. CCSS Math – Statistics & Probability"
          />
          <button onClick={add} style={{ ...solidBtnStyle, background: "#1a56c4", color: "#fff", borderColor: "#1a56c4", whiteSpace: "nowrap" }}>
            <Plus size={14} /> Add
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {list.map((std, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8,
                border: `1.5px solid ${overIdx === i ? "#1a56c4" : "#e8e0d8"}`,
                background: dragIdx === i ? "#0d1f3d" : overIdx === i ? "#1a3050" : "#1e2436",
                cursor: "grab", transition: "border-color 0.1s, background 0.1s"
              }}
            >
              <GripVertical size={14} style={{ color: "#3a4468", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, color: "#f0ede8" }}>{std}</span>
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", display: "flex", padding: 3, borderRadius: 4, flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 26px", borderTop: "1.5px solid #2a3050", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1e2436" }}>
        <span style={{ fontSize: 13, color: "#5a6380" }}>{list.length} standards</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ ...solidBtnStyle, background: "#252b40", color: "#e0ddd8", borderColor: "#2a3050" }}>Cancel</button>
          <button onClick={() => onSave(list)} style={{ ...solidBtnStyle, background: "#1a56c4", color: "#ffffff", borderColor: "#1a56c4" }}>Save Standards</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────

function exportCurriculumJSON(course, pathway, units) {
  const data = {
    exportedAt: new Date().toISOString(),
    course: course.name,
    pathway: pathway.name,
    grades: course.grades,
    units: units.map(u => ({
      title: u.title,
      semester: u.semester,
      essentialQuestion: u.essentialQuestion || "",
      description: u.description || "",
      totalDays: u.lessons.reduce((s, l) => s + (l.estimatedDays || 1), 0),
      lessons: u.lessons.map(l => ({
        title: l.title,
        type: l.type,
        estimatedDays: l.estimatedDays,
        objective: l.objective || "",
        standards: l.standards || [],
        links: (l.links || []).map(lk => ({ label: lk.label, url: lk.url, type: lk.type })),
        notes: l.notes || "",
      }))
    }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${course.id}-curriculum.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCurriculumText(course, pathway, units) {
  const lines = [];
  lines.push(`${course.name} — ${pathway.name}`);
  lines.push(`Grades: ${course.grades}`);
  lines.push(`Exported: ${new Date().toLocaleDateString()}`);
  lines.push("=".repeat(60));

  ["Fall", "Spring"].forEach(sem => {
    const semUnits = units.filter(u => u.semester === sem);
    if (!semUnits.length) return;
    const semDays = semUnits.reduce((s, u) => s + u.lessons.reduce((ss, l) => ss + (l.estimatedDays || 1), 0), 0);
    lines.push("\n" + "─".repeat(60));
    lines.push(`${sem.toUpperCase()} SEMESTER  (${semDays} days)`);
    lines.push("─".repeat(60));

    semUnits.forEach((u, ui) => {
      const unitDays = u.lessons.reduce((s, l) => s + (l.estimatedDays || 1), 0);
      lines.push("\nUnit " + (ui + 1) + ": " + u.title + "  [" + unitDays + " days]");
      if (u.essentialQuestion) lines.push(`  Essential Question: ${u.essentialQuestion}`);
      if (u.description) lines.push(`  ${u.description}`);
      lines.push("");
      u.lessons.forEach((l, li) => {
        lines.push(`  ${li + 1}. [${l.type.toUpperCase()}] ${l.title}  (${l.estimatedDays}d)`);
        if (l.objective) lines.push(`     Objective: ${l.objective}`);
        if ((l.standards || []).length) lines.push(`     Standards: ${l.standards.join(", ")}`);
        if ((l.links || []).length) lines.push(`     Resources: ${l.links.map(lk => `${lk.label} (${lk.type})`).join(", ")}`);
        if (l.notes) lines.push(`     Notes: ${l.notes}`);
      });
    });
  });

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${course.id}-curriculum.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

// ── DARK THEME PALETTE ──────────────────────────────────────────────────────
const D = {
  bg0:     "#0f1117",   // page background
  bg1:     "#161b27",   // card background
  bg2:     "#1e2436",   // elevated / secondary surface
  bg3:     "#252b40",   // input / hover surface
  border0: "#1e2436",   // subtle border
  border1: "#2a3050",   // default border
  border2: "#3a4468",   // active / hover border
  text0:   "#f0ede8",   // primary text
  text1:   "#9ca3b8",   // secondary text
  text2:   "#5a6380",   // tertiary / placeholder
};

// Lesson type colors — dark-optimized
const LESSON_TYPE_BG = {
  instruction:     { bg: "#0d1f3d", border: "#1a3a6b", accent: "#4d8ef0" },
  classwork:       { bg: "#2d2000", border: "#6b4a00", accent: "#f59e0b" },
  "group-project": { bg: "#0d2d1a", border: "#1a5433", accent: "#22c55e" },
  project:         { bg: "#1a0d3d", border: "#381a6b", accent: "#a855f7" },
  assessment:      { bg: "#2d1a0d", border: "#6b3a1a", accent: "#f97316" },
};

// Styles used throughout the main UI
const labelStyle = { display: "block", fontSize: 14, fontWeight: 600, color: D.text0, marginBottom: 6 };
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px",
  border: `1.5px solid ${D.border1}`, borderRadius: 9,
  fontSize: 15, background: D.bg3, color: D.text0,
  outline: "none", fontFamily: "inherit", margin: 0
};
const btnStyle = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500,
  border: `1.5px solid ${D.border1}`, cursor: "pointer",
  background: D.bg2, color: D.text1,
  fontFamily: "inherit", whiteSpace: "nowrap"
};
const iconBtn = {
  background: "none", border: "none", cursor: "pointer",
  color: D.text1, display: "flex", padding: 6, borderRadius: 7
};

// Styles used inside modals — dark theme
const modalLabelStyle = { display: "block", fontSize: 14, fontWeight: 600, color: "#f0ede8", marginBottom: 6 };
const modalInputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px",
  border: "1.5px solid #2a3050", borderRadius: 9,
  fontSize: 15, background: "#252b40", color: "#f0ede8",
  outline: "none", fontFamily: "inherit", margin: 0
};
const solidBtnStyle = {
  display: "inline-flex", alignItems: "center", gap: 7,
  padding: "9px 20px", borderRadius: 9, fontSize: 14, fontWeight: 600,
  border: "1.5px solid #2a3050", cursor: "pointer",
  background: "#1e2436", color: "#f0ede8",
  fontFamily: "inherit", whiteSpace: "nowrap"
};

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  componentDidCatch(error, info) {
    console.error("=== APP CRASH ===", error, info);
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace", background: "#fff1f2", border: "2px solid #dc2626", borderRadius: 12, margin: 20 }}>
          <h2 style={{ color: "#dc2626", marginTop: 0 }}>Render Error</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#f0ede8" }}>{this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#57534e", marginTop: 12 }}>{this.state.info?.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner({ focusedLesson, onLessonFocused, isActive }) {
  console.log("[CTE] AppInner rendering...");

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "100%";
    document.body.style.boxSizing = "border-box";
    document.body.style.background = "#0f1117";
    document.body.style.color = "#e8e6e1";
    document.documentElement.style.width = "100%";
    document.documentElement.style.background = "#0f1117";
    const root = document.getElementById("root");
    if (root) { root.style.width = "100%"; root.style.maxWidth = "none"; root.style.background = "#0f1117"; }
    // Inject global dark CSS
    const style = document.createElement("style");
    style.id = "cte-dark-theme";
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      body { background: #0f1117 !important; color: #e8e6e1 !important; }
      input, select, textarea { background: #1e2130 !important; color: #e8e6e1 !important; border-color: #2e3350 !important; }
      input::placeholder, textarea::placeholder { color: #4a5070 !important; }
      select option { background: #1e2130; color: #e8e6e1; }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: #0f1117; }
      ::-webkit-scrollbar-thumb { background: #2e3350; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #3d4466; }
    `;
    if (!document.getElementById("cte-dark-theme")) document.head.appendChild(style);
  }, []);
  const [selectedCourse, setSelectedCourse] = useState("intro-tech");
  const [curricula, setCurricula] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [filter, setFilter] = useState("all"); // all | Fall | Spring
  const [addingUnit, setAddingUnit] = useState(false);
  const [showStandardsMgr, setShowStandardsMgr] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [standards, setStandards] = useState(DEFAULT_STANDARDS);
  const [mediaYear, setMediaYear] = useState("media-a");
  const saveTimer = useRef(null);
  const focusedLessonRowRef = useRef(null); // ref attached to the highlighted lesson row
  const [driveReady, setDriveReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  
  // When navigated here from Phase 3, switch course and scroll to the lesson
  useEffect(() => {
    if (!focusedLesson) return;
    const { courseId, lessonId } = focusedLesson;

    // Switch to the right course first
    if (courseId !== selectedCourse) {
      setSelectedCourse(courseId);
    }

    // Wait for render then scroll and highlight
    const tid = setTimeout(() => {
      const el = document.getElementById(`lesson-row-${lessonId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "box-shadow 0.2s";
        el.style.boxShadow = "0 0 0 3px #f59e0b, 0 0 0 6px #f59e0b44";
        setTimeout(() => { el.style.boxShadow = ""; }, 2000);
      }
      if (onLessonFocused) onLessonFocused();
    }, 300);

    return () => clearTimeout(tid);
  }, [focusedLesson]);

  const pathway = getPathwayForCourse(selectedCourse);
  const courseObj = getCourse(selectedCourse);
  const pathwayColor = courseObj?.color || pathway?.color || "#1a56c4";
  const course = getCourse(selectedCourse);

  // Load all curricula on mount
useEffect(() => {
  async function init() {
    try {
      await initGoogleAuth();
      const silentOk = await signIn();
      if (silentOk) {
        setDriveReady(true);
        await loadAllCurricula();
      }
    } catch(e) {
      console.error('[CTE] init failed:', e);
    } finally {
      setLoading(false);
    }
  }
  init();
}, []);

async function loadAllCurricula() {
  const settings = await loadSettings();
  if (settings.selectedCourse) setSelectedCourse(settings.selectedCourse);
  if (settings.mediaYear) setMediaYear(settings.mediaYear);
  const loaded = {};
  for (const p of PATHWAYS) {
    for (const c of p.courses) {
      const data = await loadCurriculum(c.id);
      if (!data && SEED_DATA[c.id]) {
        await saveCurriculum(c.id, SEED_DATA[c.id]);
      }
      loaded[c.id] = data || SEED_DATA[c.id] || { units: [] };
    }
  }
  setCurricula(loaded);
  // Load custom standards
  const std = await loadStandards();
  if (std) setStandards(std);
}

  // Re-read all curricula from localStorage whenever Phase 1 becomes active
  // This picks up any bell ringer edits made in Phase 2
  useEffect(() => {
    if (!isActive) return;
    async function reload() {
      const reloaded = {};
      for (const p of PATHWAYS) {
        for (const c of p.courses) {
          const data = await loadCurriculum(c.id);
          reloaded[c.id] = data || SEED_DATA[c.id] || { units: [] };
        }
      }
      setCurricula(reloaded);
    }
    reload();
  }, [isActive]);

  // Auto-save with debounce
  const debounceSave = useCallback((courseId, data) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCurriculum(courseId, data), 600);
  }, []);

  useEffect(() => {
  if (!loading) saveSettings({ selectedCourse, mediaYear });
  }, [selectedCourse, mediaYear, loading]);

async function handleSaveStandards(list) {
  setStandards(list);
  await saveStandards(list);
  setShowStandardsMgr(false);
}

  const currentData = curricula[selectedCourse] || { units: [] };
  const units = currentData.units || [];
  const filteredUnits = filter === "all" ? units : units.filter(u => u.semester === filter);

  function updateCurriculum(courseId, newUnits) {
    const updated = { units: newUnits };
    setCurricula(c => ({ ...c, [courseId]: updated }));
    debounceSave(courseId, updated);
  }

  function updateUnit(updated) {
    updateCurriculum(selectedCourse, units.map(u => u.id === updated.id ? { ...u, ...updated } : u));
  }

  function deleteUnit(id) {
    if (!confirm("Delete this unit and all its lessons?")) return;
    updateCurriculum(selectedCourse, units.filter(u => u.id !== id));
  }

  function reorderUnit(fromId, toId) {
    const arr = [...units];
    const fi = arr.findIndex(u => u.id === fromId);
    const ti = arr.findIndex(u => u.id === toId);
    if (fi === -1 || ti === -1) return;
    const [item] = arr.splice(fi, 1);
    arr.splice(ti, 0, item);
    updateCurriculum(selectedCourse, arr);
  }

  function addUnit() {
    const u = { id: uid(), title: "New Unit", semester: "Fall", essentialQuestion: "", description: "", lessons: [] };
    updateCurriculum(selectedCourse, [...units, u]);
  }

  function updateLesson(unitId, updated) {
    updateCurriculum(selectedCourse, units.map(u => u.id === unitId ? { ...u, lessons: u.lessons.map(l => l.id === updated.id ? updated : l) } : u));
  }

  function deleteLesson(unitId, lessonId) {
    updateCurriculum(selectedCourse, units.map(u => u.id === unitId ? { ...u, lessons: u.lessons.filter(l => l.id !== lessonId) } : u));
  }

  function addLessons(unitId, newLessons) {
    updateCurriculum(selectedCourse, units.map(u => u.id === unitId ? { ...u, lessons: [...u.lessons, ...newLessons] } : u));
  }

  function reorderLesson(unitId, fromId, toId) {
    updateCurriculum(selectedCourse, units.map(u => {
      if (u.id !== unitId) return u;
      const arr = [...u.lessons];
      const fi = arr.findIndex(l => l.id === fromId);
      const ti = arr.findIndex(l => l.id === toId);
      if (fi === -1 || ti === -1) return u;
      const [item] = arr.splice(fi, 1);
      arr.splice(ti, 0, item);
      return { ...u, lessons: arr };
    }));
  }

  function duplicateUnit(unitId) {
    const src = units.find(u => u.id === unitId);
    if (!src) return;
    const clone = {
      ...src,
      id: uid(),
      title: "Copy of " + src.title,
      lessons: src.lessons.map(l => ({ ...l, id: uid(), links: (l.links || []).map(lk => ({ ...lk, id: uid() })) }))
    };
    const idx = units.findIndex(u => u.id === unitId);
    const arr = [...units];
    arr.splice(idx + 1, 0, clone);
    updateCurriculum(selectedCourse, arr);
  }

  function duplicateLesson(unitId, lessonId) {
    updateCurriculum(selectedCourse, units.map(u => {
      if (u.id !== unitId) return u;
      const idx = u.lessons.findIndex(l => l.id === lessonId);
      if (idx === -1) return u;
      const src = u.lessons[idx];
      const clone = { ...src, id: uid(), title: "Copy of " + src.title, links: (src.links || []).map(lk => ({ ...lk, id: uid() })) };
      const arr = [...u.lessons];
      arr.splice(idx + 1, 0, clone);
      return { ...u, lessons: arr };
    }));
  }

  function resetCourse() {
    const seed = SEED_DATA[selectedCourse] || { units: [] };
    setCurricula(c => ({ ...c, [selectedCourse]: seed }));
    saveCurriculum(selectedCourse, seed);
    setShowResetConfirm(false);
  }
if (!driveReady && !loading) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', 
                  justifyContent: 'center', height: '100vh', background: '#0f1117', gap: 20 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f0ede8' }}>CTE Curriculum Dashboard</div>
      <div style={{ fontSize: 15, color: '#9ca3b8' }}>Sign in with Google to load your curriculum</div>
      <button
        onClick={async () => {
          setSigningIn(true);
          const ok = await signIn();
          if (ok) {
            setDriveReady(true);
            setLoading(true);
            await loadAllCurricula();
            setLoading(false);
          }
          setSigningIn(false);
        }}
        style={{ padding: '12px 28px', borderRadius: 10, background: '#1a56c4', 
                 color: '#fff', border: 'none', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
      >
        {signingIn ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </div>
  );
}
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0f1117", color: "#5a6380", fontSize: 14 }}>
        Loading curriculum...
      </div>
    );
  }

  const fallDays = countDays(units, "Fall");
  const springDays = countDays(units, "Spring");
  const totalDays = fallDays + springDays;

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "#e8e6e1", width: "100%", maxWidth: 1280, margin: "0 auto", boxSizing: "border-box", padding: "0 32px 60px", background: "#0f1117", minHeight: "100vh" }}>
      {showStandardsMgr && <StandardsManager standards={standards} onSave={handleSaveStandards} onClose={() => setShowStandardsMgr(false)} />}

      {/* Sticky Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: "#161b27",
        borderBottom: "1.5px solid #2a3050",
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        marginBottom: 20,
        isolation: "isolate",
      }}>
        {/* Top row: logo + course selector + action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 32px", flexWrap: "wrap", maxWidth: 1280, margin: "0 auto", background: "#161b27" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: pathwayColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BookOpen size={16} color="white" />
            </div>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f0ede8", letterSpacing: "-0.01em" }}>CTE Curriculum</div>
              <div style={{ fontSize: 11, color: "#5a6380" }}>Master Builder · Phase 1</div>
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: "#2a3050", flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 5, flexWrap: "nowrap", flex: 1, overflowX: "auto" }}>
            {PATHWAYS.map(p => (
              <div key={p.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {p.id === "media" ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button onClick={() => setSelectedCourse(mediaYear)} style={{
                      padding: "7px 14px", borderRadius: 8, fontSize: 13,
                      fontWeight: selectedCourse === "media-a" || selectedCourse === "media-b" ? 600 : 400,
                      border: selectedCourse === "media-a" || selectedCourse === "media-b"
                        ? `1.5px solid ${p.color}` : "1px solid var(--color-border-secondary)",
                      background: selectedCourse === "media-a" || selectedCourse === "media-b"
                        ? p.color + "18" : "var(--color-background-secondary)",
                      color: selectedCourse === "media-a" || selectedCourse === "media-b"
                        ? p.color : "var(--color-text-secondary)",
                      cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap"
                    }}>
                      Digital Media
                      <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.6 }}>7/8</span>
                    </button>
                    {(selectedCourse === "media-a" || selectedCourse === "media-b") && (
                      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: `1px solid ${p.color}40` }}>
                        {["media-a", "media-b"].map(yr => (
                          <button key={yr} onClick={() => { setMediaYear(yr); setSelectedCourse(yr); }} style={{
                            padding: "4px 10px", fontSize: 11, fontWeight: mediaYear === yr ? 700 : 400,
                            border: "none", cursor: "pointer", fontFamily: "inherit",
                            background: mediaYear === yr ? p.color : p.color + "18",
                            color: mediaYear === yr ? "white" : p.color,
                          }}>
                            {yr === "media-a" ? "Yr A" : "Yr B"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  p.courses.map(c => {
                    const active = selectedCourse === c.id;
                    const cc = c.color || p.color;
                    return (
                      <button key={c.id} onClick={() => setSelectedCourse(c.id)} style={{
                        padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400,
                        border: active ? `1.5px solid ${cc}` : "1px solid var(--color-border-secondary)",
                        background: active ? cc + "18" : "var(--color-background-secondary)",
                        color: active ? cc : "var(--color-text-secondary)",
                        cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap"
                      }}>
                        {c.name}
                        <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.6 }}>{c.grades}</span>
                      </button>
                    );
                  })
                )}
                {p.id !== PATHWAYS[PATHWAYS.length - 1].id && (
                  <div style={{ width: 1, background: "#2a3050", margin: "0 2px" }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ width: 1, height: 36, background: "#2a3050", flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => setShowSearch(s => !s)} style={{ ...btnStyle, padding: "7px 14px", fontSize: 13, background: showSearch ? pathwayColor + "18" : undefined, color: showSearch ? pathwayColor : undefined, borderColor: showSearch ? pathwayColor : undefined }}>
              <Search size={13} /> Search
            </button>
            <button onClick={() => setShowStandardsMgr(true)} style={{ ...btnStyle, padding: "7px 14px", fontSize: 13 }}>
              <Settings size={13} /> Standards
            </button>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowExportMenu(e => !e)} onBlur={e => { if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setShowExportMenu(false); }} style={{ ...btnStyle, padding: "7px 14px", fontSize: 13, background: showExportMenu ? pathwayColor + "18" : undefined, color: showExportMenu ? pathwayColor : undefined, borderColor: showExportMenu ? pathwayColor : undefined }}>
                <Download size={13} /> Export
              </button>
              {showExportMenu && (
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#1e2436", border: "1.5px solid #2a3050", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 200, minWidth: 200, overflow: "hidden" }}>
                  <button onClick={() => { exportCurriculumJSON(course, pathway, units); setShowExportMenu(false); }} onMouseEnter={e => e.currentTarget.style.background="#252b40"} onMouseLeave={e => e.currentTarget.style.background="none"} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#f0ede8", borderBottom: "1px solid #2a3050", textAlign: "left" }}>
                    <Download size={14} color="#1a56c4" /> Export as JSON
                  </button>
                  <button onClick={() => { exportCurriculumText(course, pathway, units); setShowExportMenu(false); }} onMouseEnter={e => e.currentTarget.style.background="#252b40"} onMouseLeave={e => e.currentTarget.style.background="none"} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#f0ede8", textAlign: "left" }}>
                    <FileText size={14} color="#166534" /> Export as Text Outline
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setShowResetConfirm(true)} style={{ ...btnStyle, padding: "7px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Stats + semester filter row */}
        <div style={{ borderTop: "1px solid #1e2436", background: "#0f1117" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 32px 8px", maxWidth: 1280, margin: "0 auto", background: "#161b27" }}>
          <span style={{ fontSize: 13, color: "#5a6380" }}>Units: <strong style={{ color: "#f0ede8", fontWeight: 600 }}>{units.length}</strong></span>
          <span style={{ fontSize: 13, color: "#5a6380" }}>Days: <strong style={{ color: pathwayColor, fontWeight: 700 }}>{totalDays}</strong></span>
          <div style={{ width: 1, height: 14, background: "#2a3050" }} />
          <DayPill days={fallDays} label="Fall" color="#ea580c" />
          <DayPill days={springDays} label="Spring" color="#1a56c4" />
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 5 }}>
            {["all", "Fall", "Spring"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: filter === f ? 600 : 400,
                border: filter === f ? `1.5px solid ${pathwayColor}` : "1px solid var(--color-border-secondary)",
                background: filter === f ? pathwayColor + "22" : "#1e2436",
                color: filter === f ? pathwayColor : "#5a6380",
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"
              }}>
                {f === "all" ? "All" : `${f} (${countDays(units, f)}d)`}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>

      {/* Reset Confirm */}
      {showResetConfirm && (
        <div style={{ padding: 16, marginBottom: 16, borderRadius: 10, background: "#2d1a0d", border: "1px solid #6b3a1a", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertTriangle size={16} color="#ea580c" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, flex: 1, color: "#fb923c" }}>Reset this course to the original seed data? All your changes will be lost.</span>
          <button onClick={resetCourse} style={{ ...btnStyle, background: "#ea580c", color: "white", borderColor: "#ea580c" }}>Reset Course</button>
          <button onClick={() => setShowResetConfirm(false)} style={{ ...btnStyle }}>Cancel</button>
        </div>
      )}

      {/* One-time migration: fix lab → group-project in localStorage */}
      {(() => {
        const COURSE_IDS = ["intro-tech", "digital-innovation", "media-a", "media-b"];
        const needsMigration = COURSE_IDS.some(id => {
          try {
            const data = JSON.parse(localStorage.getItem(`master-curriculum:${id}`) || "{}");
            return (data.units || []).some(u => (u.lessons || []).some(l => l.type === "lab"));
          } catch (_) { return false; }
        });
        if (!needsMigration) return null;
        const runMigration = () => {
          let total = 0;
          COURSE_IDS.forEach(id => {
            try {
              const data = JSON.parse(localStorage.getItem(`master-curriculum:${id}`) || "{}");
              let changed = false;
              (data.units || []).forEach(u => {
                (u.lessons || []).forEach(l => {
                  if (l.type === "lab") { l.type = "group-project"; changed = true; total++; }
                });
              });
              if (changed) localStorage.setItem(`master-curriculum:${id}`, JSON.stringify(data));
            } catch (_) {}
          });
          alert(`Migration complete — ${total} lesson${total !== 1 ? "s" : ""} updated from Lab to Group Project. The page will now reload.`);
          window.location.reload();
        };
        return (
          <div style={{ padding: "10px 16px", marginBottom: 12, borderRadius: 8, background: "#0d1f3d", border: "1px solid #1a3a6b", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, flex: 1, color: "#7aabf0" }}>
              🔧 Old "Lab" lesson types detected in saved data — click to migrate to "Group Project".
            </span>
            <button
              onClick={runMigration}
              style={{ ...btnStyle, background: "#1a56c4", color: "white", borderColor: "#1a56c4", fontWeight: 600, whiteSpace: "nowrap" }}
            >
              Fix Now
            </button>
          </div>
        );
      })()}

      {/* Search Panel */}
      {showSearch && (
        <div style={{ padding: 20, marginBottom: 20, borderRadius: 12, border: "1.5px solid #2a3050", background: "#161b27" }}>
          <SearchPanel units={units} pathwayColor={pathwayColor} onClose={() => setShowSearch(false)} />
        </div>
      )}


      {/* Course Header */}
      <div style={{
        marginBottom: 24, padding: "20px 24px",
        borderRadius: 12,
        background: "#161b27",
        border: `1.5px solid ${pathwayColor}40`,
        borderLeft: `5px solid ${pathwayColor}`,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#f0ede8", letterSpacing: "-0.02em" }}>
            {course?.name}
          </h2>
          <span style={{ fontSize: 13, fontWeight: 500, padding: "2px 10px", borderRadius: 20, background: pathwayColor + "18", color: pathwayColor, border: `1px solid ${pathwayColor}30` }}>
            {pathway?.shortName}
          </span>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Grades {course?.grades}</span>
        </div>
        {course?.description && (
          <p style={{ margin: 0, fontSize: 15, color: "#7a8099", lineHeight: 1.6, maxWidth: 860 }}>
            {course.description}
          </p>
        )}
      </div>

      {/* Units */}
      {filteredUnits.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#3a4468", fontSize: 14, borderRadius: 12, border: "1.5px dashed #2a3050", background: "#161b27" }}>
          No units yet. Add your first unit below.
        </div>
      )}

      {filteredUnits.map((unit, i) => (
        <UnitCard
          key={unit.id} unit={unit} index={units.indexOf(unit)} totalUnits={units.length}
          courseId={selectedCourse} pathwayColor={pathwayColor}
          onUpdateUnit={updateUnit} onDeleteUnit={deleteUnit} onReorderUnit={reorderUnit}
          onDuplicateUnit={duplicateUnit}
          onUpdateLesson={updateLesson} onDeleteLesson={deleteLesson} onReorderLesson={reorderLesson}
          onDuplicateLesson={duplicateLesson}
          onAddLesson={addLessons} dragState={dragState} setDragState={setDragState}
          standards={standards}
          focusedLessonId={focusedLesson?.lessonId}
        />
      ))}

      {/* Add Unit */}
      <button onClick={addUnit} style={{
        ...btnStyle, width: "100%", justifyContent: "center",
        padding: "12px 20px", borderRadius: 10, fontSize: 13,
        border: `1.5px dashed ${pathwayColor}40`, color: pathwayColor, fontSize: 15,
        background: "#161b27", marginTop: 12
      }}>
        <Plus size={15} /> Add Unit
      </button>

      {/* Footer */}
      <div style={{ marginTop: 32, padding: "12px 0", borderTop: "1px solid #1e2436", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#3a4468" }}>
          {course?.name} · {pathway?.name} · Auto-saved
        </span>
        <span style={{ fontSize: 13, color: "#3a4468" }}>
          {units.reduce((s, u) => s + u.lessons.length, 0)} lessons across {units.length} units
        </span>
      </div>
    </div>
  );
}

export default function App({ focusedLesson, onLessonFocused, isActive }) {
  return (
    <ErrorBoundary>
      <AppInner focusedLesson={focusedLesson} onLessonFocused={onLessonFocused} isActive={isActive} />
    </ErrorBoundary>
  );
}