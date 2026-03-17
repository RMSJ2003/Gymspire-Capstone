/**
 * GymSpire — Step-by-step Tutorial using Driver.js
 * Styled to match GymSpire brand (crimson red + black)
 *
 * HOW TO USE:
 * 1. Add this file to: public/js/tutorial.js
 * 2. Add Driver.js CDN to your base layout (see instructions below)
 * 3. Add data-tour attributes to your HTML elements (see list below)
 * 4. Call initTutorial(userType) on page load — pass 'user', 'coach', or 'admin'
 */

// ─── GymSpire Brand Theme Override ──────────────────────────────────────────
const GYMSPIRE_STYLES = `
  .driver-popover {
    background: #1A1A1A !important;
    color: #FFFFFF !important;
    border-radius: 10px !important;
    border: 2px solid #B52020 !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
    font-family: Arial, sans-serif !important;
    max-width: 320px !important;
    padding: 20px !important;
  }

  .driver-popover-title {
    color: #B52020 !important;
    font-family: Arial, sans-serif !important;
    font-weight: 900 !important;
    font-size: 15px !important;
    letter-spacing: 0.5px !important;
    margin-bottom: 8px !important;
  }

  .driver-popover-description {
    color: #EEEEEE !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
  }

  .driver-popover-progress-text {
    color: #888 !important;
    font-size: 11px !important;
  }

  .driver-popover-next-btn {
    background: #B52020 !important;
    color: #FFFFFF !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 8px 18px !important;
    font-weight: bold !important;
    font-size: 12px !important;
    cursor: pointer !important;
    transition: background 0.2s !important;
  }

  .driver-popover-next-btn:hover {
    background: #8B1010 !important;
  }

  .driver-popover-prev-btn {
    background: transparent !important;
    color: #AAAAAA !important;
    border: 1px solid #444 !important;
    border-radius: 6px !important;
    padding: 8px 18px !important;
    font-size: 12px !important;
    cursor: pointer !important;
  }

  .driver-popover-prev-btn:hover {
    border-color: #B52020 !important;
    color: #FFFFFF !important;
  }

  .driver-popover-close-btn {
    color: #666 !important;
    font-size: 18px !important;
  }

  .driver-popover-close-btn:hover {
    color: #B52020 !important;
  }

  .driver-overlay {
    background: rgba(0, 0, 0, 0.65) !important;
  }

  /* Take Tour Button */
  #gymspire-tour-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #B52020;
    color: #FFFFFF;
    border: none;
    border-radius: 50px;
    padding: 12px 20px;
    font-family: Arial, sans-serif;
    font-weight: bold;
    font-size: 13px;
    cursor: pointer;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 16px rgba(181, 32, 32, 0.4);
    transition: background 0.2s, transform 0.1s;
  }

  #gymspire-tour-btn:hover {
    background: #8B1010;
    transform: scale(1.04);
  }

  #gymspire-tour-btn svg {
    width: 16px;
    height: 16px;
    fill: white;
  }
`;

// ─── Tour Steps Per User Type ────────────────────────────────────────────────

const TOUR_STEPS = {
  // ── STUDENT / USER ────────────────────────────────────────────────────────
  user: [
    {
      element: '[data-tour="dashboard"]',
      popover: {
        title: "🏠 Welcome to GymSpire!",
        description:
          "This is your dashboard — your home base. Here you can see your upcoming workouts, gym congestion, and active challenges at a glance.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="workout-plan"]',
      popover: {
        title: "📋 Workout Plan",
        description:
          "Create and manage your personalized workout plans here. Organize exercises by muscle group and build a routine that fits your goals.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="start-workout"]',
      popover: {
        title: "💪 Start a Workout",
        description:
          "Hit this button to begin a solo workout session. You'll log your sets, reps, and weight as you go — everything is saved automatically.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="workout-log"]',
      popover: {
        title: "📝 Workout Log",
        description:
          "All your past workouts are saved here. Review your history, track consistency, and see how much you've improved over time.",
        side: "left",
        align: "start",
      },
    },
    {
      element: '[data-tour="pr-tracker"]',
      popover: {
        title: "🏆 Personal Records",
        description:
          "GymSpire automatically detects when you beat your own record on any exercise. Your PRs are tracked here — keep pushing!",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="challenges"]',
      popover: {
        title: "⚔️ Challenges",
        description:
          "Join coach-created fitness challenges and compete with other members. Your total volume (weight × reps × sets) determines your rank on the leaderboard.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="leaderboard"]',
      popover: {
        title: "📊 Leaderboard",
        description:
          "See how you rank against other members in active challenges. Stay competitive and motivated!",
        side: "left",
        align: "start",
      },
    },
    {
      element: '[data-tour="congestion"]',
      popover: {
        title: "🗺️ Gym Congestion",
        description:
          "Check how busy the gym is before heading over. GymSpire predicts peak hours so you can plan the best time to train.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="profile"]',
      popover: {
        title: "👤 Your Profile",
        description:
          "Update your profile, change your password, and manage your account settings here. You're all set — let's get training!",
        side: "bottom",
        align: "end",
      },
    },
  ],

  // ── COACH ─────────────────────────────────────────────────────────────────
  coach: [
    {
      element: '[data-tour="dashboard"]',
      popover: {
        title: "🏠 Coach Dashboard",
        description:
          "Welcome, Coach! This is your control center. You can monitor active challenges, pending submissions, and member progress from here.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="create-challenge"]',
      popover: {
        title: "⚔️ Create a Challenge",
        description:
          "Set up a new fitness challenge here. Define the exercise, duration, and scoring rules. Members will join and compete by logging their workouts.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="submissions"]',
      popover: {
        title: "🎥 Review Submissions",
        description:
          "Members upload workout videos for verification. Review them here and approve or reject with feedback. Only verified submissions count on the leaderboard.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="progress-dashboard"]',
      popover: {
        title: "📈 Member Progress",
        description:
          "See which members are improving, stalling, or declining in performance. Use this to identify who needs encouragement or a program adjustment.",
        side: "left",
        align: "start",
      },
    },
    {
      element: '[data-tour="feedback"]',
      popover: {
        title: "💬 Give Feedback",
        description:
          "Leave notes and feedback directly on a member's submission. They'll be notified and can see your comments in their workout log.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="leaderboard"]',
      popover: {
        title: "📊 Challenge Leaderboard",
        description:
          "Monitor the live standings of your active challenges. Rankings update automatically as members log and submit their workouts.",
        side: "left",
        align: "start",
      },
    },
  ],

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  admin: [
    {
      element: '[data-tour="dashboard"]',
      popover: {
        title: "🛠️ Admin Dashboard",
        description:
          "Welcome, Admin! From here you have full visibility over the entire GymSpire system — users, attendance, exercises, and gym analytics.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="manage-accounts"]',
      popover: {
        title: "👥 Manage Accounts",
        description:
          "View, activate, deactivate, and manage all user accounts here — students, coaches, and other admins. You can also assign roles.",
        side: "right",
        align: "start",
      },
    },
    {
      element: '[data-tour="import-exercises"]',
      popover: {
        title: "🏋️ Import Exercises",
        description:
          "Pull exercises from the ExerciseDB API directly into GymSpire's library. Members can then select from these exercises when building their workout plans.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: '[data-tour="attendance"]',
      popover: {
        title: "📍 GPS Attendance",
        description:
          "View GPS-verified gym attendance records for all members. Filter by date, user, or location to generate reports for admin purposes.",
        side: "left",
        align: "start",
      },
    },
    {
      element: '[data-tour="congestion"]',
      popover: {
        title: "📊 Congestion Analytics",
        description:
          "Analyze gym traffic patterns over time. Use these insights to recommend less busy hours to members and optimize gym operations.",
        side: "top",
        align: "center",
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: "⚙️ System Settings",
        description:
          "Configure system-wide settings, email notifications, and other preferences. You're fully set up — welcome to GymSpire Admin!",
        side: "bottom",
        align: "end",
      },
    },
  ],
};

// ─── Core Tutorial Logic ─────────────────────────────────────────────────────

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = GYMSPIRE_STYLES;
  document.head.appendChild(style);
}

function addTourButton(userType) {
  const btn = document.createElement("button");
  btn.id = "gymspire-tour-btn";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
    </svg>
    Take a Tour
  `;
  btn.onclick = () => startTour(userType);
  document.body.appendChild(btn);
}

function startTour(userType) {
  const steps = TOUR_STEPS[userType];
  if (!steps) return;

  // Filter out steps where the element doesn't exist on this page
  const validSteps = steps.filter((step) => {
    if (!step.element) return true;
    return document.querySelector(step.element) !== null;
  });

  if (validSteps.length === 0) {
    console.warn("GymSpire Tour: No tour elements found on this page.");
    return;
  }

  const driver = window.driver.js.driver({
    showProgress: true,
    progressText: "Step {{current}} of {{total}}",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Done ✓",
    allowClose: true,
    overlayClickBehavior: "close",
    animate: true,
    steps: validSteps,
    onDestroyStarted: () => {
      localStorage.setItem(`gymspire_tour_done_${userType}`, "true");
      driver.destroy();
    },
  });

  driver.drive();
}

/**
 * Main init function — call this from your Pug layout
 * @param {string} userType - 'user', 'coach', or 'admin'
 * @param {boolean} forceShow - set true to always show (for testing)
 */
function initTutorial(userType, forceShow = false) {
  injectStyles();
  addTourButton(userType);

  const tourDone = localStorage.getItem(`gymspire_tour_done_${userType}`);

  if (!tourDone || forceShow) {
    setTimeout(() => startTour(userType), 800);
  }
}

// Expose globally
window.GymSpireTour = { init: initTutorial, start: startTour };
